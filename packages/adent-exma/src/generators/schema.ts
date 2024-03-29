//types
import type { ModelConfig } from 'exma';
import type { Project, Directory } from 'ts-morph';
import type { ProjectSettings } from '../types';
//helpers
import { VariableDeclarationKind } from 'ts-morph';
import { camelize } from '../helpers';

type Location = Project|Directory;

export default function generate(
  project: Location, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  const source = project.createSourceFile('schema.ts', '', { overwrite: true });

  for (const name in models) {
    source.addImportDeclaration({
      defaultImport: `${camelize(name)}Schema`,
      moduleSpecifier: `./${camelize(name)}/schema`
    });
  }

  for (const name in models) {
    source.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{
        name: camelize(name),
        initializer: `${camelize(name)}Schema`
      }]
    });
  }
};