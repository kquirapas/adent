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
  model.pathset.forEach(pathset => {
    const path = `${pathset.generate('detail', '[id%i]')}/index.ts`;
    const source = project.createSourceFile(path, '', { overwrite: true });
    const permissions = pathset.paths
      .filter(path => path.type !== 'id')
      .map(path => path.name)
      .join('-');

    model.pathmeta.map(reference => {
      //make sure we are not changing the original array
      const paths = Array.from(reference);
      //get the path names
      const names = paths.map(path => path.name);
      //add the ids that are not already in the path
      model.ids.forEach(column => {
        //if the column is not in the path
        if (!names.includes(column.name)) {
          //add it to the clone
          paths.push({
            model: model,
            type: 'id',
            name: column.name
          });
        }
      });
    });

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
    //import action from '[config.name]/profile/actions/detail';
    source.addImportDeclaration({
      moduleSpecifier: `${config.name}/${model.nameLower}/actions/detail`,
      defaultImport: 'action'
    });
    //import { session } from 'middleware';
    source.addImportDeclaration({
      moduleSpecifier: 'middleware',
      namedImports: [ 'session' ]
    });
    
    //export default async function handler(req: NextApiRequest, res: NextApiResponse)
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
        session.authorize(req, res, [ '${permissions}-detail' ]);
        //get id
        ${pathset.paths.filter(
          path => path.type === 'id'
        ).filter(
          path => model.ids.map(column => column.name).includes(path.name)
        ).map(path => {
          const column = path.model.columns.filter(
            column => column.name === path.name
          )[0];
          return `
            ${typemap.type[column.type] === 'number'
              ? `const ${path.name} = parseInt(req.query?.id${path.i} || 0);`
              : `const ${path.name} = req.query?.id${path.i} as string;`
            }
            if (!${path.name}) {
              return res.json(
                toErrorResponse(
                  Exception.for('Not Found').withCode(404)
                )
              );
            }
          `;
        }).join('\n')}
        //call action
        const response = await action(${pathset.paths
          .filter(path => path.type === 'id')
          .filter(
            path => model.ids.map(column => column.name).includes(path.name)
          )
          .map(path => path.name)
          .join(', ')
        });
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