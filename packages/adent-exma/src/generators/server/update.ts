//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../types/Model';
//helpers
import { capitalize, camelize, formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const lower = model.name.toLowerCase();
  const camel = camelize(model.name);
  const capital = capitalize(model.name);
  const path = `${lower}/server/update.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });
  const ids: string[] = [];
  model.columns.forEach(column => {
    if (column.id) {
      ids.push(column.name);
    }
  });

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
  //import type { ProfileModel, ProfileUpdateInput } from '../types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '../types',
    namedImports: [ `${capital}Model`, `${capital}UpdateInput` ]
  });
  //import { sql, eq } from 'drizzle-orm';
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm',
    namedImports: [ ids.length > 1 ? 'sql' : 'eq' ]
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
      session.authorize(req, res, [ '${lower}-update' ]);
      //get data
      const data = req.body as ${capital}UpdateInput;
      //get id
      ${ids.map(id => `
        const ${id} = req.query.${id} as string;
        if (!${id}) {
          return res.json(
            toErrorResponse(
              Exception.for('Not Found').withCode(404)
            )
          );
        }
      `).join('\n')}
      //call action
      const response = await action(${ids.join(', ')}, data);
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
  //  id: string,
  //  data: ProfileUpdateInput
  //): Promise<ResponsePayload<ProfileModel>>
  source.addFunction({
    isExported: true,
    name: 'action',
    isAsync: true,
    parameters: [
      ...ids.map(id => ({ name: id, type: 'string' })),
      { name: 'data', type: `${capital}UpdateInput` }
    ],
    returnType: `Promise<ResponsePayload<${capital}Model>>`,
    statements: formatCode(`
      //collect errors, if any
      const errors: Record<string, any> = {};
      ${model.columns
        .filter(column => column.validators.length > 0)
        .map(column => {
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
      return await db.update(schema.${camel})
        .set({
          ${model.columns
            .filter(column => column.validators.length > 0)
            .map(column => `${column.name}: data.${column.name}`)
            .join(',\n')
          }
        })
        .where(${ids.length > 1
          ? `sql\`${ids.map(id => `${id} = \${${id}}`).join(' AND ')}\``
          : `eq(schema.${camel}.${ids[0]}, ${ids[0]})`
        })
        .returning()
        .then(toResponse)
        .catch(toErrorResponse);
    `)
  });
};