//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../../types/Model';
//helpers
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
  //import search from './search';
  source.addImportDeclaration({
    moduleSpecifier: './search',
    defaultImport: 'search'
  });
  //export async function action(
  //  id: string,
  //): Promise<ResponsePayload<ProfileModel>>
  source.addFunction({
    isDefaultExport: true,
    name: 'action',
    isAsync: true,
    parameters: ids.map(id => ({ name: id, type: 'string' })),
    returnType: `Promise<ResponsePayload<${model.nameTitle}Extended|null>>`,
    statements: formatCode(`
      return search({
        filter: { ${ids.map(id => `${id}`).join(', ')} },
        take: 1
      }).then(response => ({
        ...response,
        results: response.results?.[0] || null
      }));
    `)
  });
};