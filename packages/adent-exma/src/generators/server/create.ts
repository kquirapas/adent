//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../types/Model';
//helpers
import { capitalize, camelize, formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(
  project: Location, 
  model: Model
) {
  const lower = model.name.toLowerCase();
  const camel = camelize(model.name);
  const capital = capitalize(model.name);
  const path = `${lower}/server/create.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });

  //import type { NextApiRequest, NextApiResponse } from 'next';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'next',
    namedImports: [ 'NextApiRequest', 'NextApiResponse' ]
  });
  //import type { ResponsePayload } from 'adent/types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'adent/types',
    namedImports: [ 'ResponsePayload' ]
  });
  //import type { ProfileModel, ProfileCreateInput } from '../types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '../types',
    namedImports: [ `${capital}Model`, `${capital}CreateInput` ]
  });
  //import Exception from 'adent/Exception';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/Exception',
    defaultImport: 'Exception'
  });
  //import validators from 'adent/validators';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/validators',
    defaultImport: 'validators'
  });
  //import { toResponse, toErrorResponse } from 'adent/helpers';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/helpers',
    namedImports: [ 'toResponse', 'toErrorResponse' ]
  });
  //import { session } from '../../session';
  source.addImportDeclaration({
    moduleSpecifier: '../../session',
    namedImports: [ 'session' ]
  });
  //import { db, schema } from '../../store';
  source.addImportDeclaration({
    moduleSpecifier: '../../store',
    namedImports: [ 'db', 'schema' ]
  });

  //export async function handler(req: NextApiRequest, res: NextApiResponse)
  source.addFunction({
    isExported: true,
    name: 'handler',
    isAsync: true,
    parameters: [
      { name: 'req', type: 'NextApiRequest' },
      { name: 'res', type: 'NextApiResponse' }
    ],
    statements: formatCode(`
      //check permissions
      session.authorize(req, res, [ '${lower}-create' ]);
      //get data
      const data = req.body as ${capital}CreateInput;
      //call action
      const response = await action(data);
      //if error
      if (response.error) {
        //update status
        res.status(response.code || 400);
      }
      //send response
      res.json(response);
    `)
  });

  //export async function action(
  //  data: ProfileCreateInput
  //): Promise<ResponsePayload<ProfileModel>>
  source.addFunction({
    isExported: true,
    name: 'action',
    isAsync: true,
    parameters: [
      { name: 'data', type: `${capital}CreateInput` }
    ],
    returnType: `Promise<ResponsePayload<${capital}Model>>`,
    statements: formatCode(`
      //collect errors, if any
      const errors: Record<string, any> = {};
      ${model.columns
        .filter(column => column.validators.length > 0)
        .map(column => {
          const required = column.validators.find(
            validator => validator.method === 'required'
          );
          const optional = column.validators.filter(
            validator => validator.method !== 'required'
          ).map(validator => {
            if (validator.method === 'unique') {
              return `if (await db.query.${camel}.findFirst({
                where: (${camel}, { eq }) => eq(${camel}.${column.name}, data.${column.name})
              })) {
                errors.${column.name} = '${validator.message}';
              }`;
            }
            const parameters = validator.parameters.map(
              param => typeof param === 'string' ? `'${param}'` : param 
            );
            const valid = parameters.length > 0
              ? `validators.${validator.method}(data.${column.name}, ${parameters.join(', ')})`
              : `validators.${validator.method}(data.${column.name})`;
            return `if (!${valid}) {
              errors.${column.name} = '${validator.message}';
            }`;  
          });
          //see if required
          if (required) {
            optional.unshift(`//check ${column.name}
            if (!validators.required(data.${column.name})) {
              errors.${column.name} = '${required.message}';
            }`);
            return optional.join(' else ');
          }
          return `//check ${column.name}
            if (typeof data.${column.name} !== 'undefined') {
              ${optional.join(' else ')}
            }
          `;
        }).join('\n')
      }
      //if there were errors
      if (Object.keys(errors).length) {
        //return the errors
        return toErrorResponse(
          Exception
            .for('Invalid parameters')
            .withCode(400)
            .withErrors(errors)
        );
      }
      //action and return response
      return await db.insert(schema.${camel}).values({
        ${model.columns
          .filter(column => column.validators.length > 0)
          .map(column => `${column.name}: data.${column.name}`)
          .join(',\n')
        }
      })
      .then(toResponse)
      .catch(toErrorResponse);
    `)
  });
};