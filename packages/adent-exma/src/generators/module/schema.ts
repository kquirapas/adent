//types
import type { Project, Directory } from 'ts-morph';
import type { ProjectSettings } from '../../types';
import type Model from '../../types/Model';
import type Column from '../../types/Column';
//helpers
import { VariableDeclarationKind } from 'ts-morph';
import { typemap } from '../../config';
import { camelize, formatCode } from '../../helpers';

type Location = Project|Directory;
type Method = { name: string, args: string[] };
type Relations = Record<string, {
  localTable: string,
  localId: string,
  foreignTable: string,
  foreignId: string
}>;

function clen(column: Column) {
  //if is.ceq, is.cgt, is.clt, is.cge, is.cle
  const length: [ number, number ] = [ 0, 255 ];
  column.validators.forEach(validator => {
    if (validator.method === 'ceq') {
      length[0] = validator.parameters[0] as number;
      length[1] = validator.parameters[0] as number;
    } else if (validator.method === 'cgt') {
      length[0] = validator.parameters[0] as number;
    } else if (validator.method === 'clt') {
      length[1] = validator.parameters[0] as number;
    } else if (validator.method === 'cge') {
      length[0] = validator.parameters[0] as number;
    } else if (validator.method === 'cle') {
      length[1] = validator.parameters[0] as number;
    }
  });
  //if length is less than 1, then 
  //it's invalid so set to 255
  if (length[1] < 1) {
    length[1] = 255;
  }
  return length;
}

function numdata(column: Column) {
  const minmax: [ number, number ] = [ 0, 0 ];
  column.validators.forEach(validator => {
    if (validator.method === 'eq') {
      minmax[0] = validator.parameters[0] as number;
      minmax[1] = validator.parameters[0] as number;
    } else if (validator.method === 'gt') {
      minmax[0] = validator.parameters[0] as number;
    } else if (validator.method === 'lt') {
      minmax[1] = validator.parameters[0] as number;
    } else if (validator.method === 'ge') {
      minmax[0] = validator.parameters[0] as number;
    } else if (validator.method === 'le') {
      minmax[1] = validator.parameters[0] as number;
    }
  });

  //determine the length of each min/max
  const minIntegerLength = minmax[0].toString().split('.')[0].length;
  const maxIntegerLength = minmax[1].toString().split('.')[0].length;
  const minDecimalLength = (minmax[0].toString().split('.')[1] || '').length;
  const maxDecimalLength = (minmax[1].toString().split('.')[1] || '').length;
  //check for @step(0.01)
  const step = Array.isArray(column.attributes.step) 
    ? column.attributes.step[0] as number
    : 0;
  const stepIntegerLength = step.toString().split('.')[0].length;
  const stepDecimalLength = (step.toString().split('.')[1] || '').length;
  const integerLength = Math.max(
    minIntegerLength, 
    maxIntegerLength, 
    stepIntegerLength
  );
  const decimalLength = Math.max(
    minDecimalLength, 
    maxDecimalLength, 
    stepDecimalLength
  );

  return {
    step,
    minmax,
    minIntegerLength, 
    maxIntegerLength,
    minDecimalLength,
    maxDecimalLength,
    stepIntegerLength,
    stepDecimalLength,
    integerLength,
    decimalLength
  };
}

function attr(column: Column, relations: Relations) {
  const attributes: { name: string, args: string[] }[] = [];
  if (column.required) {
    attributes.push({ name: 'notNull', args: [] });
  }
  if (typeof column.default !== 'undefined') {
    if (column.default === 'now()') {
      attributes.push({ name: 'default', args: ['sql`now()`'] });
    } else if (column.default === 'cuid()') {
      attributes.push({ name: '$default', args: ['() => cuid()'] });
    } else if (column.default === 'nanoid()') {
      attributes.push({ name: '$default', args: ['() => nanoid()'] });
    } else if (typeof column.default === 'string' 
      && /^nanoid\(\d+\)$/.test(column.default)
    ) {
      const match = column.default.match(/^nanoid\((\d+)\)$/);
      attributes.push({ 
        name: '$default', 
        args: [`() => nanoid(${match?.[1]??''})`] 
      });
    } else if (typeof column.default === 'string') {
      attributes.push({ name: 'default', args: [ `'${column.default}'` ] });
    } else {
      attributes.push({ name: 'default', args: [ `${column.default}` ] });
    }
  }
  if (column.id) {
    attributes.push({ name: 'primaryKey', args: [] });
  }
  if (column.attributes.autoincrement) {
    attributes.push({ name: 'autoincrement', args: [] });
  }

  if (relations[column.name]) {
    attributes.push({ name: 'references', args: [
      `() => ${
        relations[column.name].foreignTable
      }.${
        relations[column.name].foreignId
      }`
    ] });
  }
  return attributes;
}

function getColumn(column: Column, engine: string, relations: Relations) {
  switch (engine) {
    case 'neon':
    case 'xata':
    case 'postgres':
    case 'pg':
    case 'vercel':
      return getPostgresColumn(column, relations);
    case 'planetscale':
    case 'mysql':
      return getMysqlColumn(column, relations);
    case 'sqlite':
      return getSqliteColumn(column, relations);
  }

  return [] as { name: string, args: string[] }[];
}

function getMysqlColumn(column: Column, relations: Relations) {
  const type = typemap.mysql[column.type];
  if (!type) {
    return [] as Method[];
  }

  let method: Method = { name: type, args: [ `'${column.name}'` ] };

  //char, varchar
  if (type === 'string') {
    const length = clen(column);
    if (length[0] === length[1]) {
      method = { 
        name: 'char', 
        args: [ 
          `'${column.name}'`, 
          `{ length: ${length[1]} }` 
        ] 
      };
    } else {
      method = { 
        name: 'varchar', 
        args: [ 
          `'${column.name}'`, 
          `{ length: ${length[1]} }` 
        ] 
      };
    }
  //integer, smallint, bigint, float
  } else if (type === 'number') {
    const { minmax, integerLength, decimalLength } = numdata(column);

    if (decimalLength > 0) {
      method = { 
        name: 'float', 
        args: [ 
          `'${column.name}'`, 
          JSON.stringify({
            precision: integerLength + decimalLength,
            scale: decimalLength,
            unsigned: minmax[0] < 0
          }).replaceAll('"', '') 
        ] 
      };
    } else if (integerLength === 1) {
      method = { name: 'smallint', args: [ `'${column.name}'` ] };
    } else if (integerLength > 8) {
      method = { name: 'bigint', args: [ `'${column.name}'` ] };
    } else {
      method = { 
        name: 'integer', 
        args: [ 
          `'${column.name}'`, 
          JSON.stringify({
            precision: integerLength,
            unsigned: minmax[0] < 0
          }).replaceAll('"', '') 
        ] 
      };
    }
  }

  return [ method, ...attr(column, relations) ];
}

function getPostgresColumn(column: Column, relations: Relations) {
  const type = typemap.postgres[column.type];
  if (!type) {
    return [] as Method[];
  }

  let method: Method = { name: type, args: [ `'${column.name}'` ] };

  //char, varchar
  if (type === 'string') {
    const length = clen(column);

    if (length[0] === length[1]) {
      method = { 
        name: 'char', 
        args: [ 
          `'${column.name}'`, 
          `{ length: ${length[1]} }` 
        ] 
      };
    } else {
      method = { 
        name: 'varchar', 
        args: [ 
          `'${column.name}'`, 
          `{ length: ${length[1]} }` 
        ] 
      };
    }
  //integer, smallint, bigint, float
  } else if (type === 'number') {
    const { minmax, integerLength, decimalLength } = numdata(column);

    if (decimalLength > 0) {
      method = { 
        name: 'numeric', 
        args: [ 
          `'${column.name}'`, 
          JSON.stringify({
            precision: integerLength + decimalLength,
            scale: decimalLength,
            unsigned: minmax[0] < 0
          }).replaceAll('"', '') 
        ] 
      };
    } else if (integerLength === 1) {
      method = { name: 'smallint', args: [ `'${column.name}'` ] };
    } else if (integerLength > 8) {
      method = { name: 'bigint', args: [ `'${column.name}'` ] };
    } else {
      method = { 
        name: 'integer', 
        args: [ 
          `'${column.name}'`, 
          JSON.stringify({
            precision: integerLength,
            unsigned: minmax[0] < 0
          }).replaceAll('"', '') 
        ] 
      };
    }
  }

  return [ method, ...attr(column, relations) ];
}

function getSqliteColumn(column: Column, relations: Relations) {
  const type = typemap.sqlite[column.type];
  if (!type) {
    return [] as Method[];
  }

  let method: Method = { name: type, args: [ `'${column.name}'` ] };

  //char, varchar
  if (type === 'string') {
    if (column.type === 'Json' 
      || column.type === 'Object' 
      || column.type === 'Hash'
    ) {
      method = { 
        name: 'text', 
        args: [ 
          `'${column.name}'`, 
          "{ mode: 'json' }" 
        ] 
      };
    } else {
      method = { name: 'text', args: [ `'${column.name}'` ] };
    }
  //integer, smallint, bigint, float
  } else if (type === 'number') {
    const { decimalLength } = numdata(column);
    if (column.type === 'Boolean') {
      method = { 
        name: 'integer', 
        args: [ `'${column.name}'`, "{ mode: 'boolean' }" ] 
      };
    } else if (column.type === 'Float' || decimalLength > 0) {
      method = { name: 'real', args: [ `'${column.name}'` ] };
    } else {
      method = { name: 'integer', args: [ `'${column.name}'` ] };
    }
  }

  return [ method, ...attr(column, relations) ];
}

export default function generate(
  project: Location, 
  config: ProjectSettings, 
  model: Model
) {
  const engine = config.dbengine;
  const path = `${model.nameLower}/schema.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });

  const relations: Relations = Object.fromEntries(model.relations.map(column => {
    const foreignTable = camelize(column.type);
    const foreignId = column.relation?.foreign;
    const localTable = model.name;
    const localId = column.relation?.local;
    return [localId, { localTable, localId, foreignTable, foreignId }];
  }).filter(relation => relation[0]));

  const definitions = model.columns.map(column => ({
    column, 
    type: getColumn(column, engine, relations)
  }));

  const methods = definitions
    .map(definition => definition.type[0])
    .map(method => method?.name)
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);

  const columns = definitions
    .map(definition => [
      definition.column, 
      definition.type
    ] as [ Column, { name: string, args: string[] }[] ])
    .filter(column => column[1].length > 0)
    .map(column => [
      column[0], 
      column[1].map(
        column => `${column.name}(${column.args.join(', ')})`
      )
    ] as [Column, string[]])
    .map(column => `${column[0].name}: ${column[1].join('.')}`) as string[];
  
  const indexes = model.columns.map(column => {
    if (column.unique) {
      if (!methods.includes('uniqueIndex')) methods.push('uniqueIndex');
      return `${
        column.name
      }Index: uniqueIndex('${
        column.name
      }_idx').on(${
        model.nameCamel
      }.${column.name})`;
    } else if (column.indexable) {
      if (!methods.includes('index')) methods.push('index');
      return `${
        column.name
      }Index: index('${
        column.name
      }_idx').on(${
        model.nameCamel
      }.${column.name})`;
    }
    return false;
  }).filter(Boolean) as string[];

  //import { sql } from 'drizzle-orm/sql';
  if (model.columns.some(column => column.default === 'now()')) {
    source.addImportDeclaration({
      moduleSpecifier: 'drizzle-orm/sql',
      namedImports: ['sql'],
    });
  }

  //import { pgTable as table, integer, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
  //...or...
  //import { mysqlTable as table, int as integer, mysqlEnum, uniqueIndex, varchar, serial } from 'drizzle-orm/mysql-core';
  //...or...
  //import { sqliteTable as table, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
  if (['neon', 'xata', 'postgres', 'pg', 'vercel'].includes(engine)) {
    source.addImportDeclaration({
      moduleSpecifier: 'drizzle-orm/pg-core',
      namedImports: ['pgTable as table', ...methods],
    });
  } else if (['planetscale', 'mysql'].includes(engine)) {
    source.addImportDeclaration({
      moduleSpecifier: 'drizzle-orm/mysql-core',
      namedImports: ['mysqlTable as table', ...methods],
    });
  } else if (['sqlite'].includes(engine)) {
    source.addImportDeclaration({
      moduleSpecifier: 'drizzle-orm/sqlite-core',
      namedImports: ['sqliteTable as table', ...methods],
    });
  } else {
    return new Error(`Engine ${engine} not supported`);
  }

  //import { createId as cuid } from '@paralleldrive/cuid2';
  if (model.columns.some(column => column.default === 'cuid()')) {
    source.addImportDeclaration({
      moduleSpecifier: '@paralleldrive/cuid2',
      namedImports: ['createId as cuid'],
    });
  }

  //import { nanoid } from 'nanoid'
  const nanoids = model.columns.filter(
    column => typeof column.default === 'string' 
      && /^nanoid\(\d*\)$/.test(column.default)
  );
  if (nanoids.length > 0) {
    source.addImportDeclaration({
      moduleSpecifier: 'nanoid',
      namedImports: ['nanoid'],
    });
  }

  //import { profile } from '../../profile/server/schema';
  Object
    .values(relations)
    .map(relation => relation.foreignTable)
    .filter((value, index, self) => self.indexOf(value) === index)
    .forEach(foreignTable => {
      source.addImportDeclaration({
        moduleSpecifier: `../${foreignTable}/schema`,
        defaultImport: foreignTable
      });
    });
  
  //const auth = table('Auth', {});
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: model.nameCamel,
      initializer: formatCode(`table('${model.nameTitle}', {
        ${columns.join(',\n        ')}
      }, ${model.nameCamel} => ({
        ${indexes.join(',\n        ')}
      }))`),
    }],
  });

  //export default auth;
  source.addExportAssignment({
    isExportEquals: false,
    expression: model.nameCamel
  });
};