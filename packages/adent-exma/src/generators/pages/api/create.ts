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
    const path = `${pathset.generate('create', '[id%i]')}.ts`;
    const source = project.createSourceFile(path, '', { overwrite: true });
    //import type { NextApiRequest, NextApiResponse } from 'next';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: 'next',
      namedImports: [ 'NextApiRequest', 'NextApiResponse' ]
    });
    //import type { ProfileCreateInput } from '../types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: `${config.name}/${model.nameLower}/types`,
      namedImports: [ `${model.nameTitle}CreateInput` ]
    });
    //import action from '[config.name]/profile/actions/create';
    source.addImportDeclaration({
      moduleSpecifier: `${config.name}/${model.nameLower}/actions/create`,
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
        session.authorize(req, res, [ '${model.nameLower}-create' ]);
        //get data
        const data = req.body as ${model.nameTitle}CreateInput;
        ${pathset.paths.filter(
          path => path.type === 'id'
        ).filter(
          path => model.relations.map(column => column.relation?.local).includes(path.name)
        ).map(path => {
          const column = path.model.columns.filter(
            column => column.name === path.name
          )[0];
          return `
            if (req.query?.id${path.i}) {
              data.${path.name} = req.query.id${path.i} as ${typemap.type[column.type]};
            }
          `;
        }).join('\n')}
        //call action
        const response = await action(data);
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