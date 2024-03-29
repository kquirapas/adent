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
  model.pathset.forEach(pathset => {
    const path = `${pathset.generate('search', '[id%i]')}/index.ts`;
    const source = project.createSourceFile(path, '', { overwrite: true });
    const permissions = pathset.paths
      .filter(path => path.type !== 'id')
      .map(path => path.name)
      .join('-');

    //import type { NextApiRequest, NextApiResponse } from 'next';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: 'next',
      namedImports: [ 'NextApiRequest', 'NextApiResponse' ]
    });
    //import type { SearchParams } from 'adent/types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: 'adent/types',
      namedImports: [ 'SearchParams' ]
    });
    //import action from '[config.name]/profile/actions/search';
    source.addImportDeclaration({
      moduleSpecifier: `${config.name}/${model.nameLower}/actions/search`,
      defaultImport: 'action'
    });
    //import { session } from 'middleware';
    source.addImportDeclaration({
      moduleSpecifier: 'middleware',
      namedImports: [ 'session' ]
    });

    //export async function handler(req: NextApiRequest, res: NextApiResponse)
    source.addFunction({
      isDefaultExport: true,
      name: 'handler',
      isAsync: true,
      parameters: [
        { name: 'req', type: 'NextApiRequest' },
        { name: 'res', type: 'NextApiResponse' }
      ],
      statements: formatCode(`
        //check permissions
        session.authorize(req, res, [ '${permissions}-search' ]);
        //get query
        const query: SearchParams = req.query || {};
        //call action
        const response = await action(query);
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