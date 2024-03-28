//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../../types/Model';
//helpers
import { typemap } from '../../../config';
import { formatCode } from '../../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const path = `${model.nameLower}/actions/detail.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });
  const ids: string[] = [];
  model.columns.forEach(column => {
    if (column.id) {
      ids.push(column.name);
    }
  });
  const jsons = model.columns.filter(
    column => typemap.literal[column.type] === 'json'
  );
  //import type { ResponsePayload } from 'adent/types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'adent/types',
    namedImports: [ 'ResponsePayload' ]
  });
  //import type { ProfileExtended } from '../types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '../types',
    namedImports: [ `${model.nameTitle}Extended` ]
  });
  //import { toResponse, toErrorResponse } from 'adent/helpers/server';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/helpers/server',
    namedImports: [ 'toResponse', 'toErrorResponse' ]
  });
  //import { db } from '../../store';
  source.addImportDeclaration({
    moduleSpecifier: '../../store',
    namedImports: [ 'db' ]
  });
  //export async function action(
  //  id: string,
  //): Promise<ResponsePayload<ProfileModel>>
  //find all the relations
  const include: Record<string, true|{ with: Record<string, true> }> = Object.fromEntries(
    model.relations.map(column => [
      column.name,
      (() => {
        const model = column.relation?.model;
        if (model?.relations.length) {
          const include: Record<string, true> = Object.fromEntries(
            model.relations.map(column => [ column.name, true ])
          );
          return { with: include };
        }
        return true;
      })()
    ])
  );
  source.addFunction({
    isDefaultExport: true,
    name: 'action',
    isAsync: true,
    parameters: ids.map(id => ({ name: id, type: 'string' })),
    returnType: `Promise<ResponsePayload<${model.nameTitle}Extended>>`,
    statements: Object.keys(include).length ? formatCode(`
      return await db.query.${model.nameCamel}
        .findFirst({
          where: ${ids.length > 1
            ? `(${
              model.nameCamel
            }, { sql }) => sql\`${
              ids.map(id => `${id} = \${${id}}`).join(' AND ')
            }\``
            : `(${
              model.nameCamel
            }, { eq }) => eq(${
              model.nameCamel
            }.${ids[0]}, ${ids[0]})`
          },
          with: ${JSON.stringify(include, null, 2).replaceAll('"', '')}
        })
        ${jsons.length > 0 
          ? `.then(results => ({
            ...results,
            ${jsons.map(column => `${column.name}: JSON.parse(results.${column.name})`).join(',\n')}
          }))`
          : ''
        }
        .then(toResponse)
        .catch(toErrorResponse);
    `): formatCode(`
      return await db.query.${model.nameCamel}
        .findFirst({
          where: ${ids.length > 1
            ? `(${
              model.nameCamel
            }, { sql }) => sql\`${
              ids.map(id => `${id} = \${${id}}`).join(' AND ')
            }\``
            : `(${
              model.nameCamel
            }, { eq }) => eq(${
              model.nameCamel}.${ids[0]}, ${ids[0]
            })`
          }
        })
        .then(toResponse)
        .catch(toErrorResponse);
    `)
  });
};