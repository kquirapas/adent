//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../types/Model';
//helpers
import { capitalize, formatCode } from '../helpers';

//types: string, text, string[], number, integer, 
//       float, boolean, date, object, hash, hash[]
const storeMap: Record<string, string> = {
  'String': 'string',
  'Text': 'string',
  'Number': 'number',
  'Integer': 'number',
  'Float': 'number',
  'Boolean': 'boolean',
  'Date': 'string',
  'DateTime': 'string',
  'Json': 'Record<string, any>',
  'Object': 'Record<string, any>',
  'Hash': 'Record<string, string|number|boolean|null>'
};

const modelMap: Record<string, string> = {
  'String': 'string',
  'Text': 'string',
  'Number': 'number',
  'Integer': 'number',
  'Float': 'number',
  'Boolean': 'boolean',
  'Date': 'Date',
  'DateTime': 'Date',
  'Json': 'Record<string, any>',
  'Object': 'Record<string, any>',
  'Hash': 'Record<string, string|number|boolean|null>'
};

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const lower = model.name.toLowerCase();
  const capital = capitalize(model.name);
  const path = `${lower}/types.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });

  if (model.relations.length) {
    const imported: string[] = [];
    model.relations.forEach(column => {
      if (imported.includes(column.type)) return;
      const model = column.relation?.model;
      if (!model) return;
      imported.push(column.type);
      const lower = model.name.toLowerCase();
      const capital = capitalize(model.name);
      //import type { ProfileModel } from '../profile/types';
      source.addImportDeclaration({
        isTypeOnly: true,
        moduleSpecifier: `../${lower}/types`,
        namedImports: [ `${capital}Model` ]
      });
    });
  }
  //export type ProfileStore
  source.addTypeAlias({
    isExported: true,
    name: `${capital}Store`,
    type: formatCode(`{
      ${model.columns.filter(column => !!storeMap[column.type]).map(column => (
        `${column.name}${
          !column.required ? '?' : ''
        }: ${storeMap[column.type]}${
          column.multiple ? '[]' : ''
        }`
      )).join(',\n')}
    }`)
  });
  //export type ProfileModel
  source.addTypeAlias({
    isExported: true,
    name: `${capital}Model`,
    type: formatCode(`{
      ${model.columns.filter(column => !!storeMap[column.type]).map(column => (
        `${column.name}${!column.required ? '?' : ''}: ${modelMap[column.type]}`
      )).join(',\n')}
    }`)
  });
  //export type ProfileExtended
  if (model.relations.length) {
    source.addTypeAlias({
      isExported: true,
      name: `${capital}Extended`,
      type: formatCode(`${capital}Model & {
        ${model.relations.map(column => (
          `${column.name}${
            !column.required ? '?' : ''
          }: ${column.type}Model${
            column.multiple ? '[]' : ''
          }`
        )).join(',\n')}
      }`)
    });
  } else {
    source.addTypeAlias({
      isExported: true,
      name: `${capital}Extended`,
      type: formatCode(`${capital}Model`)
    });
  }

  const data = model.columns
    .filter(column => !column.generated)
    .filter(column => [
      'String', 'Text',    'Number', 'Integer', 
      'Float',  'Boolean', 'Date',   'Datetime', 
      'Time',   'Json',    'Object', 'Hash'
    ].includes(column.type));

  //export type ProfileCreateInput
  source.addTypeAlias({
    isExported: true,
    name: `${capital}CreateInput`,
    type: formatCode(`{
      ${data.map(column => (
        `${column.name}${
          !column.required ? '?' : ''
        }: ${storeMap[column.type]}${
          column.multiple ? '[]' : ''
        }`
      )).join(',\n')}
    }`)
  });
  //export type ProfileUpdateInput
  source.addTypeAlias({
    isExported: true,
    name: `${capital}UpdateInput`,
    type: formatCode(`{
      ${data.map(column => (
        `${column.name}?: ${storeMap[column.type]}${
          column.multiple ? '[]' : ''
        }`
      )).join(',\n')}
    }`)
  });
};