//types
import type { ModelConfig } from 'exma';
import type { Project, Directory, SourceFile } from 'ts-morph';
import type { ProjectSettings } from '../types';
//helpers
import { VariableDeclarationKind } from 'ts-morph';
import { formatCode, camelize } from '../helpers';

type Location = Project|Directory;

export default function generate(
  project: Location, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  const source = project.createSourceFile('store.ts', '', { overwrite: true });

  switch (config.dbengine) {
    case 'neon':
      return generateNeon(source, models, config);
    case 'xata':
      return generateXata(source, models, config);
    case 'postgres':
      return generatePostgres(source, models, config);
    case 'pg':
      return generatePG(source, models, config);
    case 'vercel':
      return generateVercel(source, models, config);
    case 'planetscale':
      return generatePlanetScale(source, models, config);
    case 'mysql':
      return generateMysql(source, models, config);
    case 'sqlite':
      return generateSqlite(source, models, config);
    default:
      return new Error(`Unknown database engine: ${config.dbengine}`);
  }
};

export function generateExports(
  source: SourceFile, 
  models: Record<string, ModelConfig>,
  globalResource = true
) {
  if (globalResource) {
    source.addStatements(`if (process.env.NODE_ENV !== 'production') {`);
    source.addStatements(`  resourceGlobal.resource = resource`);
  }
  source.addStatements(`}`);
  for (const name in models) {
    source.addImportDeclaration({
      defaultImport: camelize(name),
      moduleSpecifier: `./${camelize(name)}/schema`
    });
  }
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'schema',
      initializer: formatCode(`{
        ${Object
          .values(models)
          .map(model => camelize(model.name))
          .join(',\n')
        }
      }`)
    }]
  });
  source.addExportDeclaration({
    namedExports: [ 'resource', 'schema' ]
  });
  source.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'db',
      initializer: 'drizzle(resource, { schema })'
    }]
  });

  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'store',
      initializer: formatCode(`{
        db,
        schema,
        resource
      }`)
    }]
  });

  source.addExportAssignment({
    isExportEquals: false,
    expression: 'store'
  });
}

export function generateNeon(
  source: SourceFile, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import type { NeonQueryFunction } from "@neondatabase/serverless";
  //import { neon } from '@neondatabase/serverless';
  //import { drizzle } from 'drizzle-orm/neon-http';
  //import auth from './auth/server/schema'
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || neon(process.env.DRIZZLE_DATABASE_URL!);
  //if (process.env.NODE_ENV !== 'production') {
  //  prismaGlobal.resource = resource
  //}
  //export { resource };
  //export const store = drizzle(resource);
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '@neondatabase/serverless',
    namedImports: [ 'NeonQueryFunction' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: '@neondatabase/serverless',
    namedImports: [ 'neon' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/neon-http',
    namedImports: [ 'drizzle' ]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown as { resource: NeonQueryFunction<false, false> }'
    }]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: `resourceGlobal.resource || ${config.dburl.type === 'env' 
        ? `neon(process.env.${config.dburl.value} as string)`
        : `neon('${config.dburl.value}')`
      }`
    }]
  });

  generateExports(source, models);
};

export function generateXata(
  source: SourceFile, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  //XATA
  //import { drizzle } from 'drizzle-orm/xata-http';
  //import { getXataClient } from '../xata';
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || getXataClient();
  //if (process.env.NODE_ENV !== 'production') {
  //  prismaGlobal.resource = resource
  //}
  //export { resource };
  //export const store = drizzle(resource);
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/xata-http',
    namedImports: [ 'drizzle' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: '../xata',
    namedImports: [ 'getXataClient' ]
  });
  
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown'
    }]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: `resourceGlobal.resource || getXataClient()`
    }]
  });

  generateExports(source, models);
};

export function generatePostgres(
  source: SourceFile, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import { drizzle } from 'drizzle-orm/postgres-js';
  //import postgres from 'postgres';
  //const resourceGlobal = global as unknown { resource: postgres.Sql };
  //const resource = resourceGlobal.resource || postgres(process.env.DATABASE_URL);
  //if (process.env.NODE_ENV !== 'production') {
  //  prismaGlobal.resource = resource
  //}
  //export { resource };
  //export const store = drizzle(resource);
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/postgres-js',
    namedImports: [ 'drizzle' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'postgres',
    defaultImport: 'postgres'
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown as { resource: postgres.Sql }'
    }]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: `resourceGlobal.resource || ${config.dburl.type === 'env' 
        ? `postgres(process.env.${config.dburl.value} as string)`
        : `postgres('${config.dburl.value}')`
      }`
    }]
  });

  generateExports(source, models);
};

export function generatePG(
  source: SourceFile, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import { drizzle } from "drizzle-orm/node-postgres";
  //import { Client } from "pg";
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || (() => {
  //  const resource = new Client({ 
  //    connectionString: process.env.DATABASE_URL 
  //  });
  //  resource.connect();
  //  return resource;
  //})();
  //if (process.env.NODE_ENV !== 'production') {
  //  prismaGlobal.resource = resource
  //}
  //export { resource };
  //export const store = drizzle(resource);
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/node-postgres',
    namedImports: [ 'drizzle' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'pg',
    namedImports: [ 'Client' ]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown as { resource: Client }'
    }]
  });

  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: formatCode(`resourceGlobal.resource || (() => {
        const resource = new Client({ 
          connectionString: ${config.dburl.type === 'env' 
            ? `process.env.${config.dburl.value} as string`
            : `'${config.dburl.value}'`}
        });
        resource.connect();
        return resource;
      })()`)
    }]
  });

  generateExports(source, models);
};

export function generateVercel(
  source: SourceFile, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  //Vercel
  //import { sql } from '@vercel/postgres';
  //import { drizzle } from 'drizzle-orm/vercel-postgres';
  //export const resource = sql;
  //export const store = drizzle(resource);
  source.addImportDeclaration({
    moduleSpecifier: '@vercel/postgres',
    namedImports: [ 'sql' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/vercel-postgres',
    namedImports: [ 'drizzle' ]
  });
  source.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: 'sql'
    }]
  });

  generateExports(source, models, false);
};

export function generatePlanetScale(
  source: SourceFile, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import { drizzle } from "drizzle-orm/planetscale-serverless";
  //import { Client } from "@planetscale/database";
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || new Client({ url: process.env.DATABASE_URL });
  //if (process.env.NODE_ENV !== 'production') {
  //  prismaGlobal.resource = resource
  //}
  //export { resource };
  //const store = drizzle(resource);
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/planetscale-serverless',
    namedImports: [ 'drizzle' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: '@planetscale/database',
    namedImports: [ 'Client' ]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown as { resource: Client }'
    }]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: `resourceGlobal.resource || ${config.dburl.type === 'env' 
      ? `new Client({ url: process.env.${config.dburl.value} as string })`
      : `new Client({ url: '${config.dburl.value}' })`}`
    }]
  });
  
  generateExports(source, models);
};

export function generateMysql(
  source: SourceFile, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import type { Connection } from "mysql2";
  //import { drizzle } from "drizzle-orm/mysql2";
  //import mysql from "mysql2";
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || mysql.createConnection(process.env.DATABASE_URL);
  //if (process.env.NODE_ENV !== 'production') {
  //  prismaGlobal.resource = resource
  //}
  //export { resource };
  //const store = drizzle(resource);
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'mysql2',
    namedImports: [ 'Connection' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/mysql2',
    namedImports: [ 'drizzle' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'mysql2',
    defaultImport: 'mysql'
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown as { resource: Connection }'
    }]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: `resourceGlobal.resource || ${config.dburl.type === 'env' 
      ? `mysql.createConnection(process.env.${config.dburl.value} as string)`
      : `mysql.createConnection('${config.dburl.value}')`}`
    }]
  });

  generateExports(source, models);
};

export function generateSqlite(
  source: SourceFile, 
  models: Record<string, ModelConfig>, 
  config: ProjectSettings
) {
  //import { drizzle } from 'drizzle-orm/libsql';
  //import Database from 'better-sqlite3';
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || new Database(process.env.DATABASE_FILE);
  //if (process.env.NODE_ENV !== 'production') {
  //  prismaGlobal.resource = resource
  //}
  //export { resource };
  //export const store = drizzle(resource);
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/libsql',
    namedImports: [ 'drizzle' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'better-sqlite3',
    defaultImport: 'Database'
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown as { resource: typeof Database }'
    }]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: `resourceGlobal.resource || ${config.dburl.type === 'env' 
      ? `new Database(process.env.${config.dburl.value} as string)`
      : `new Database('${config.dburl.value}')`}`
    }]
  });

  generateExports(source, models);
};