import type { PluginProps, Data } from 'exma';

import path from 'path';
import { Project, IndentationText } from 'ts-morph';
import { Loader } from 'exma';

import Model from './types/Model';

//generators
import generateStore from './generators/store';
import generateSession from './generators/session';
import generateTypes from './generators/types';
import generateServerCreate from './generators/server/create';
import generateServerDetail from './generators/server/detail';
import generateServerRemove from './generators/server/remove';
import generateServerRestore from './generators/server/restore';
import generateServerSearch from './generators/server/search';
import generateServerSchema from './generators/server/schema';
import generateServerUpdate from './generators/server/update';
import generateClientForm from './generators/client/form';
import generateClientList from './generators/client/list';
import generateClientView from './generators/client/view';

const deconstructValue = (value: Data) => {
  const string = (value || '').toString();
  const type = string.indexOf('env(') === 0 ? 'env': 'literal';
  const deconstructed = type === 'env' 
    ? string.replace('env(', '').replace(')', '')
    : value;
  return { type, value: deconstructed };
};

/**
 * This is the The params comes form the cli
 */
export default function generate({ config, schema, cli }: PluginProps) {
  if (!config.modules) {
    return cli.terminal.error('No modules directory specified');
  }
  //Loader looks for . or / at the start. If it doesnt find this then 
  //will use node_modules as the root path
  const modules = Loader.absolute(config.modules.toString().startsWith('/') 
    ? config.modules.toString() 
    : config.modules.toString().startsWith('.') 
    ? config.modules.toString() 
    : `./${config.modules.toString()}`
  );
  
  if (!schema.model) {
    return cli.terminal.error('No models found in schema');
  }
  const project = new Project({
    tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      outDir: modules,
      declaration: true, // Generates corresponding '.d.ts' file.
      declarationMap: true, // Generates a sourcemap for each corresponding '.d.ts' file.
      sourceMap: true, // Generates corresponding '.map' file.
    },
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces
    }
  });

  const models = schema.model;
  const engine = config.engine as string || 'postgres';
  const directory = project.createDirectory(modules);
  const storeError = generateStore(directory, models, {
    engine: deconstructValue(engine),
    url: deconstructValue(config.url),
  });
  generateSession(directory, {
    seed: deconstructValue(config.seed),
  });
  if (storeError instanceof Error) {
    return cli.terminal.error(storeError.message);
  }
  for (const name in models) {
    const model = new Model(models[name]);
    generateTypes(directory, model);
    generateServerSchema(directory, engine, model);
    generateServerCreate(directory, model);
    generateServerDetail(directory, model);
    generateServerRemove(directory, model);
    generateServerRestore(directory, model);
    generateServerSearch(directory, model);
    generateServerUpdate(directory, model);

    generateClientForm(directory, model);
    generateClientList(directory, model);
    generateClientView(directory, model);
  }

  //if you want ts, tsx files
  if ((config.lang || 'ts') == 'ts') {
    project.saveSync();
  //if you want js, d.ts files
  } else {
    project.emit();
  }
};