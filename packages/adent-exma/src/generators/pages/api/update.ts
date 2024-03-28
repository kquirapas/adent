//types
import type { Project, Directory } from 'ts-morph';
import type { ProjectSettings } from '../../../types';
import type Model from '../../../types/Model';
//helpers
import { formatCode } from '../../../helpers';

type Location = Project|Directory;

export default function generate(
  project: Location, 
  config: ProjectSettings, 
  model: Model
) {
  model.pathset.forEach(paths => {
    const path = `${paths('update', '[%s]')}.ts`;
    const source = project.createSourceFile(path, '', { overwrite: true });
    const ids = model.ids.map(column => column.name);

    //import type { NextApiRequest, NextApiResponse } from 'next';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: 'next',
      namedImports: [ 'NextApiRequest', 'NextApiResponse' ]
    });
    //import type { ProfileUpdateInput } from '../types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: `${config.name}/${model.nameLower}/types`,
      namedImports: [ `${model.nameTitle}UpdateInput` ]
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
    //import action from '[config.name]/profile/actions/search';
    source.addImportDeclaration({
      moduleSpecifier: `${config.name}/${model.nameLower}/actions/update`,
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
        session.authorize(req, res, [ '${model.nameLower}-update' ]);
        //get data
        const data = req.body as ${model.nameTitle}UpdateInput;
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
  });
};