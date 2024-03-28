//types
import type { Project, Directory } from 'ts-morph';
import type { ProjectSettings } from '../../../types';
import type Model from '../../../types/Model';
//helpers
import { typemap } from '../../../config';
import { formatCode } from '../../../helpers';

type Location = Project|Directory;

export default function generate(
  project: Location, 
  config: ProjectSettings, 
  model: Model
) {
  model.pathset.forEach(paths => {
    const path = `${paths('remove', '[%s]')}.ts`;
    const source = project.createSourceFile(path, '', { overwrite: true });
    const ids = model.ids;
    //import type { NextApiRequest, NextApiResponse } from 'next';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: 'next',
      namedImports: [ 'NextApiRequest', 'NextApiResponse' ]
    });
    //import Exception from 'adent/Exception';
    source.addImportDeclaration({
      moduleSpecifier: 'adent/Exception',
      defaultImport: 'Exception'
    });
    //import { toErrorResponse } from 'adent/helpers/server';
    source.addImportDeclaration({
      moduleSpecifier: 'adent/helpers/server',
      namedImports: [ 'toErrorResponse' ]
    });
    //import action from '[config.name]/profile/actions/remove';
    source.addImportDeclaration({
      moduleSpecifier: `${config.name}/${model.nameLower}/actions/remove`,
      defaultImport: 'action'
    });
    //import { session } from 'middleware';
    source.addImportDeclaration({
      moduleSpecifier: 'middleware',
      namedImports: [ 'session' ]
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
  });
};