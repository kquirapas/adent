//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../../types/Model';
//helpers
import { typemap } from '../../../config';
import { formatCode } from '../../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const path = `${model.nameLower}/actions/update.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });
  const inputs = model.columns.filter(column => !column.generated);
  const checkers = inputs.filter(column => column.validators.length > 0);
  const helpers = inputs
    .filter(column => !!typemap.helper[column.type])
    .map(column => typemap.helper[column.type])
    .filter((value, index, self) => self.indexOf(value) === index);
  const ids: string[] = [];
  model.columns.forEach(column => {
    if (column.id) {
      ids.push(column.name);
    }
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
    namedImports: [ `${model.nameTitle}Model`, `${model.nameTitle}UpdateInput` ]
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
  //import { toResponse, toErrorResponse } from 'adent/helpers/server';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/helpers/server',
    namedImports: [ ...helpers, 'toResponse', 'toErrorResponse' ]
  });
  //import { db, schema } from '../../store';
  source.addImportDeclaration({
    moduleSpecifier: '../../store',
    namedImports: [ 'db', 'schema' ]
  });

  //export async function action(
  //  id: string,
  //  data: ProfileUpdateInput
  //): Promise<ResponsePayload<ProfileModel>>
  source.addFunction({
    isDefaultExport: true,
    name: 'action',
    isAsync: true,
    parameters: [
      ...ids.map(id => ({ name: id, type: 'string' })),
      { name: 'data', type: `${model.nameTitle}UpdateInput` }
    ],
    returnType: `Promise<ResponsePayload<${model.nameTitle}Model>>`,
    statements: formatCode(`
      //collect errors, if any
      const errors: Record<string, any> = {};
      ${checkers.map(column => {
        const type = typemap.type[column.type];
        const helper = typemap.helper[column.type];
        const value = helper 
          ? `${helper}<${type}>(data.${column.name}, true)`
          : `data.${column.name}`;
        const optional = column.validators.filter(
          validator => validator.method !== 'required'
        ).map(validator => {
          if (validator.method === 'unique') {
            return `if (await db.query.${
              model.nameCamel
            }.findFirst({
              where: (${
                model.nameCamel
              }, { eq }) => eq(${
                model.nameCamel
              }.${
                column.name
              }, ${value})
            })) {
              errors.${column.name} = '${validator.message}';
            }`;
          }
          const parameters = validator.parameters.map(
            param => typeof param === 'string' ? `'${param}'` : param 
          );
          const valid = parameters.length > 0
            ? `validators.${
              validator.method}(data.${
                column.name
              }, ${parameters.join(', ')})`
            : `validators.${
              validator.method
            }(data.${column.name})`;
          return `if (!${valid}) {
            errors.${column.name} = '${validator.message}';
          }`;  
        });
        return `//check ${column.name}
          if (typeof data.${column.name} !== 'undefined') {
            ${optional.join(' else ')}
          }
        `;
      }).join('\n')}
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
      return await db.update(schema.${model.nameCamel})
        .set({
          ${checkers.map(column => {
            if (column.multiple) {
              return `${column.name}: data.${column.name} ? JSON.stringify(data.${column.name}) : undefined`;  
            }
            const helper = typemap.helper[column.type];
            return helper 
              ? `${column.name}: ${helper}(data.${column.name})`
              : `${column.name}: data.${column.name}`
          }).join(',\n')}
        })
        .where(${ids.length > 1
          ? `sql\`${ids.map(id => `${id} = \${${id}}`).join(' AND ')}\``
          : `eq(schema.${model.nameCamel}.${ids[0]}, ${ids[0]})`
        })
        .returning()
        .then(toResponse)
        .catch(toErrorResponse);
    `)
  });
};