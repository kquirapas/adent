//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../types/Model';
//helpers
import { formatCode } from '../helpers';

//schema type maps
const typemap: Record<string, Record<string, string>> = {
  //maps schema types to database types
  store: {
    String: 'string',
    Text: 'string',
    Number: 'number',
    Integer: 'number',
    Float: 'number',
    Boolean: 'boolean',
    Date: 'string',
    Datetime: 'string',
    Json: 'string',
    Object: 'string',
    Hash: 'string'
  },
  //maps schema types to modeled types
  model: {
    String: 'string',
    Text: 'string',
    Number: 'number',
    Integer: 'number',
    Float: 'number',
    Boolean: 'boolean',
    Date: 'Date',
    Datetime: 'Date',
    Json: 'Record<string, string|number|boolean|null>',
    Object: 'Record<string, string|number|boolean|null>',
    Hash: 'Record<string, string|number|boolean|null>'
  }
}

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const path = `${model.nameLower}/types.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });

  if (model.relations.length) {
    const imported: string[] = [];
    model.relations.forEach(column => {
      if (imported.includes(column.type)) return;
      const model = column.relation?.model;
      if (!model) return;
      imported.push(column.type);
      //import type { ProfileModel } from '../profile/types';
      source.addImportDeclaration({
        isTypeOnly: true,
        moduleSpecifier: `../${model.nameLower}/types`,
        namedImports: [ `${model.nameTitle}Model` ]
      });
    });
  }
  //export type ProfileStore
  source.addTypeAlias({
    isExported: true,
    name: `${model.nameTitle}Store`,
    type: formatCode(`{
      ${model.columns.filter(column => !!typemap.store[column.type]).map(column => (
        `${column.name}${
          !column.required ? '?' : ''
        }: ${typemap.store[column.type]}${
          column.multiple ? '[]' : ''
        }`
      )).join(',\n')}
    }`)
  });
  //export type ProfileModel
  source.addTypeAlias({
    isExported: true,
    name: `${model.nameTitle}Model`,
    type: formatCode(`{
      ${model.columns.filter(column => !!typemap.store[column.type]).map(column => (
        `${column.name}${!column.required ? '?' : ''}: ${typemap.model[column.type]}`
      )).join(',\n')}
    }`)
  });
  //export type ProfileExtended
  if (model.relations.length) {
    source.addTypeAlias({
      isExported: true,
      name: `${model.nameTitle}Extended`,
      type: formatCode(`${model.nameTitle}Model & {
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
      name: `${model.nameTitle}Extended`,
      type: formatCode(`${model.nameTitle}Model`)
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
    name: `${model.nameTitle}CreateInput`,
    type: formatCode(`{
      ${data.map(column => (
        `${column.name}${
          !column.required ? '?' : ''
        }: ${typemap.store[column.type]}${
          column.multiple ? '[]' : ''
        }`
      )).join(',\n')}
    }`)
  });
  //export type ProfileUpdateInput
  source.addTypeAlias({
    isExported: true,
    name: `${model.nameTitle}UpdateInput`,
    type: formatCode(`{
      ${data.map(column => (
        `${column.name}?: ${typemap.store[column.type]}${
          column.multiple ? '[]' : ''
        }`
      )).join(',\n')}
    }`)
  });
};