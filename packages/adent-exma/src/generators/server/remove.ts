//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../types/Model';
//helpers
import { typemap } from '../../config';
import { formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const path = `${model.nameLower}/server/remove.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });
  const ids = model.ids;

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
  //import { sql, eq } from 'drizzle-orm';
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm',
    namedImports: [ ids.length > 1 ? 'sql' : 'eq' ]
  });
  //import type { ProfileModel } from '../types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '../types',
    namedImports: [ `${model.nameTitle}Model` ]
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
      session.authorize(req, res, [ '${model.nameLower}-remove' ]);
      //get id
      ${ids.map(id => `
        const ${id.name} = req.query.${id.name} as ${typemap.type[id.type]};
        if (!${id.name}) {
          return res.json(
            toErrorResponse(
              Exception.for('Not Found').withCode(404)
            )
          );
        }
      `).join('\n')}
      //call action
      const response = await action(${ids.map(id => id.name).join(', ')});
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
    parameters: ids.map(id => ({ name: id.name, type: typemap.type[id.type] })),
    returnType: `Promise<ResponsePayload<${model.nameTitle}Model>>`,
    statements: model.active ? formatCode(`
      return await db.update(schema.${model.nameCamel})
        .set({ ${model.active.name}: false })
        .where(${ids.length > 1
          ? `sql\`${ids.map(id => `${id.name} = \${${id.name}}`).join(' AND ')}\``
          : `eq(schema.${model.nameCamel}.${ids[0].name}, ${ids[0].name})`
        })
        .returning()
        .then(toResponse)
        .catch(toErrorResponse);
    `) : formatCode(`
      return await db.delete(schema.${model.nameCamel})
        .where(${ids.length > 1
          ? `sql\`${ids.map(id => `${id.name} = \${${id.name}}`).join(' AND ')}\``
          : `eq(schema.${model.nameCamel}.${ids[0].name}, ${ids[0].name})`
        })
        .returning()
        .then(toResponse)
        .catch(toErrorResponse);
    `)
  });
};