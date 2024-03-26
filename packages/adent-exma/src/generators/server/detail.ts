//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../types/Model';
//helpers
import { formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const path = `${model.nameLower}/server/detail.ts`;
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
  //import type { ProfileExtended } from '../types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '../types',
    namedImports: [ `${model.nameTitle}Extended` ]
  });
  //import Exception from 'adent/Exception';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/Exception',
    defaultImport: 'Exception'
  });
  //import { toResponse, toErrorResponse } from 'adent/helpers/server';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/helpers/server',
    namedImports: [ 'toResponse', 'toErrorResponse' ]
  });
  //import { session } from '../../session';
  source.addImportDeclaration({
    moduleSpecifier: '../../session',
    namedImports: [ 'session' ]
  });
  //import { db } from '../../store';
  source.addImportDeclaration({
    moduleSpecifier: '../../store',
    namedImports: [ 'db' ]
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
      session.authorize(req, res, [ '${model.nameLower}-detail' ]);
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
      const response = await action(${ids.join(', ')});
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
    isExported: true,
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