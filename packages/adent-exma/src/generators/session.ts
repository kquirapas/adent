//types
import type { Data } from 'exma';
import type { Project, Directory } from 'ts-morph';
type Config = Record<string, { type: string, value: Data}>;
//helpers
import { VariableDeclarationKind } from 'ts-morph';

type Location = Project|Directory;

export default function generate(project: Location, config: Config) {
  const source = project.createSourceFile('session.ts', '', { overwrite: true });

  //import Session from 'dent/session/Session;
  source.addImportDeclaration({
    moduleSpecifier: 'adent/session/Session',
    defaultImport: 'Session'
  });
  //import access from '../access.json';
  source.addImportDeclaration({
    defaultImport: 'access',
    moduleSpecifier: '../access.json'
  });
  //export const seed = process.env.SESSION_SEED || '';
  source.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'seed',
      initializer: config.seed.type === 'env' 
      ? `process.env.${config.seed.value} || ''`
      : typeof config.seed.value === 'string'
      ? `'${config.seed.value}'`
      : ''
    }]
  });
  //export const session = new Session(seed, access);
  source.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'session',
      initializer: 'new Session(seed, access)'
    }]
  });
};