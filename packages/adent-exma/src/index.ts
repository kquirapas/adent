import type { PluginProps, Data } from 'exma';
import type { ProjectSettings } from './types';

import path from 'path';
import { Project, IndentationText } from 'ts-morph';
import { Loader } from 'exma';

import Model from './types/Model';

//generators
import generateStore from './generators/store';
import generateTypes from './generators/module/types';
import generateSchema from './generators/schema';
import generateModuleSchema from './generators/module/schema';

import generateActionCreate from './generators/module/actions/create';
import generateActionDetail from './generators/module/actions/detail';
import generateActionRemove from './generators/module/actions/remove';
import generateActionRestore from './generators/module/actions/restore';
import generateActionSearch from './generators/module/actions/search';
import generateActionUpdate from './generators/module/actions/update';

import generateAPICreate from './generators/pages/api/create';
import generateAPIDetail from './generators/pages/api/detail';
import generateAPIRemove from './generators/pages/api/remove';
import generateAPIRestore from './generators/pages/api/restore';
import generateAPISearch from './generators/pages/api/search';
import generateAPIUpdate from './generators/pages/api/update';

import generateComponentForm from './generators/module/components/form';
import generateComponentList from './generators/module/components/list';
import generateComponentView from './generators/module/components/view';

import generatePageCreate from './generators/pages/create';
import generatePageDetail from './generators/pages/detail';
import generatePageRemove from './generators/pages/remove';
import generatePageRestore from './generators/pages/restore';
import generatePageSearch from './generators/pages/search';
import generatePageUpdate from './generators/pages/update';

const deconstructValue = <T = Data>(value: Data) => {
  const string = (value || '').toString();
  const type = string.indexOf('env(') === 0 ? 'env': 'literal';
  const deconstructed = type === 'env' 
    ? string.replace('env(', '').replace(')', '')
    : value as T;
  return { type, value: deconstructed };
};

/**
 * This is the The params comes form the cli
 */
export default function generate({ config, schema, cli }: PluginProps) {
  if (!schema.model) {
    return cli.terminal.error('No models found in schema');
  }

  const settings: ProjectSettings = {
    name: '',
    module: config.module?.toString() || './modules',
    lang: config.lang as string || 'js',
    dbengine: config.engine as string || 'postgres',
    dburl: deconstructValue<string>(config.url ? config.url : 'env(DATABASE_URL)'),
    router: config.router?.toString() || 'pages',
    path: config.path as string || ''
  };

  //Loader looks for . or / at the start. If it doesnt find this then 
  //will use node_modules as the root path
  const libraryPath = Loader.absolute(settings.module);
  settings.name = settings.module.toString().replace(/^(\.{0,2}\/{0,1})/, '');

  const libraryProject = new Project({
    tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      outDir: libraryPath,
      declaration: true, // Generates corresponding '.d.ts' file.
      declarationMap: true, // Generates a sourcemap for each corresponding '.d.ts' file.
      sourceMap: true, // Generates corresponding '.map' file.
    },
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces
    }
  });
  const libraryFolder = libraryProject.createDirectory(libraryPath);
  
  const routerPath = path.join(process.cwd(), settings.router, settings.path);
  const routerProject = new Project({
    tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      outDir: routerPath,
      declaration: true, // Generates corresponding '.d.ts' file.
      declarationMap: true, // Generates a sourcemap for each corresponding '.d.ts' file.
      sourceMap: true, // Generates corresponding '.map' file.
    },
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces
    }
  });
  const routerFolder = routerProject.createDirectory(routerPath);

  const apiPath = path.join(process.cwd(), settings.router, 'api');
  const apiProject = new Project({
    tsConfigFilePath: path.resolve(__dirname, '../tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      outDir: apiPath,
      declaration: true, // Generates corresponding '.d.ts' file.
      declarationMap: true, // Generates a sourcemap for each corresponding '.d.ts' file.
      sourceMap: true, // Generates corresponding '.map' file.
    },
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces
    }
  });
  const apiFolder = apiProject.createDirectory(apiPath);
  
  const storeError = generateStore(libraryFolder, settings);
  if (storeError instanceof Error) {
    return cli.terminal.error(storeError.message);
  }
  generateSchema(libraryFolder, schema.model, settings);
  for (const name in schema.model) {
    const model = new Model(schema.model[name]);
    generateTypes(libraryFolder, model);
    generateModuleSchema(libraryFolder, settings, model);

    generateActionCreate(libraryFolder, model);
    generateActionDetail(libraryFolder, model);
    generateActionRemove(libraryFolder, model);
    generateActionRestore(libraryFolder, model);
    generateActionSearch(libraryFolder, model);
    generateActionUpdate(libraryFolder, model);

    generateAPICreate(apiFolder, settings, model);
    generateAPIDetail(apiFolder, settings, model);
    generateAPIRemove(apiFolder, settings, model);
    generateAPIRestore(apiFolder, settings, model);
    generateAPISearch(apiFolder, settings, model);
    generateAPIUpdate(apiFolder, settings, model);

    generateComponentForm(libraryFolder, model);
    generateComponentList(libraryFolder, model);
    generateComponentView(libraryFolder, model);

    generatePageCreate(routerFolder, settings, model);
    generatePageDetail(routerFolder, settings, model);
    generatePageRemove(routerFolder, settings, model);
    generatePageRestore(routerFolder, settings, model);
    generatePageSearch(routerFolder, settings, model);
    generatePageUpdate(routerFolder, settings, model);
  }

  //if you want ts, tsx files
  if ((config.lang || 'ts') == 'ts') {
    libraryProject.saveSync();
    routerProject.saveSync();
    apiProject.saveSync();
  //if you want js, d.ts files
  } else {
    libraryProject.emit();
    routerProject.emit();
    apiProject.emit();
  }
};