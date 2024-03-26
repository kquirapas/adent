//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../types/Model';
//helpers
import { formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  if (!model.restorable) {
    return;
  }
  const path = `${model.nameLower}/server/restore.ts`;
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
  //import type { ProfileModel } from '../types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '../types',
    namedImports: [ `${model.nameTitle}Model` ]
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
      session.authorize(req, res, [ '${model.nameLower}-restore' ]);
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
  source.addFunction({
    isExported: true,
    name: 'action',
    isAsync: true,
    parameters: ids.map(id => ({ name: id, type: 'string' })),
    returnType: `Promise<ResponsePayload<${model.nameTitle}Model>>`,
    statements: formatCode(`
      return await db.update(schema.${model.nameCamel})
        .set({ ${model.active?.name}: true })
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