//types
import type { Project, Directory, SourceFile } from 'ts-morph';
import type { ProjectSettings } from '../types';
//helpers
import { VariableDeclarationKind } from 'ts-morph';
import { formatCode } from '../helpers';

type Location = Project|Directory;

export default function generate(project: Location, config: ProjectSettings) {
  const source = project.createSourceFile('store.ts', '', { overwrite: true });

  switch (config.dbengine) {
    case 'neon':
      return generateNeon(source, config);
    case 'xata':
      return generateXata(source, config);
    case 'postgres':
      return generatePostgres(source, config);
    case 'pg':
      return generatePG(source, config);
    case 'vercel':
      return generateVercel(source, config);
    case 'planetscale':
      return generatePlanetScale(source, config);
    case 'mysql':
      return generateMysql(source, config);
    case 'sqlite':
      return generateSqlite(source, config);
    default:
      return new Error(`Unknown database engine: ${config.dbengine}`);
  }
};

export function generateExports(
  source: SourceFile, 
  globalResource = true
) {
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'db',
      initializer: 'orm.drizzle(resource, { schema })'
    }]
  });
  if (globalResource) {
    source.addStatements(`if (process.env.NODE_ENV !== 'production') {`);
    source.addStatements(`  resourceGlobal.resource = resource`);
    source.addStatements(`}`);
  }
  source.addExportDeclaration({
    namedExports: [ 'core', 'orm', 'resource', 'schema', 'db' ]
  });
}

export function generateNeon(source: SourceFile, config: ProjectSettings) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import type { NeonQueryFunction } from '@neondatabase/serverless;
  //import { neon } from '@neondatabase/serverless';
  //import * as core from 'drizzle-orm/pg-core';
  //import * as orm from 'drizzle-orm/neon-http';
  //import * as schema from './schema';
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || neon(process.env.DRIZZLE_DATABASE_URL!);
  //const db = orm.drizzle(resource, { schema });
  //if (process.env.NODE_ENV !== 'production') {
  //  resourceGlobal.resource = resource
  //}
  //export { core, orm, resource, schema, db };
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
    moduleSpecifier: 'drizzle-orm/pg-core',
    defaultImport: '* as core'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/neon-http',
    defaultImport: '* as orm'
  });
  source.addImportDeclaration({
    defaultImport: '* as schema',
    moduleSpecifier: `./schema`
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

  generateExports(source);
};

export function generateXata(source: SourceFile, config: ProjectSettings) {
  //XATA
  //import { getXataClient } from 'xata';
  //import * as core from 'drizzle-orm/pg-core';
  //import * as orm from 'drizzle-orm/xata-http';
  //import * as schema from './schema';
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || getXataClient();
  //const db = orm.drizzle(resource, { schema });
  //if (process.env.NODE_ENV !== 'production') {
  //  resourceGlobal.resource = resource
  //}
  //export { core, orm, resource, schema, db };
  source.addImportDeclaration({
    moduleSpecifier: 'xata',
    namedImports: [ 'getXataClient' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/pg-core',
    defaultImport: '* as core'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/xata-http',
    defaultImport: '* as orm'
  });
  source.addImportDeclaration({
    defaultImport: '* as schema',
    moduleSpecifier: `./schema`
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

  generateExports(source);
};

export function generatePostgres(source: SourceFile, config: ProjectSettings) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import postgres from 'postgres';
  //import * as core from 'drizzle-orm/pg-core';
  //import * as orm from 'drizzle-orm/postgres-js';
  //import * as schema from './schema';
  //const resourceGlobal = global as unknown { resource: postgres.Sql };
  //const resource = resourceGlobal.resource || postgres(process.env.DATABASE_URL);
  //const db = orm.drizzle(resource, { schema });
  //if (process.env.NODE_ENV !== 'production') {
  //  resourceGlobal.resource = resource
  //}
  //export { core, orm, resource, schema, db };
  source.addImportDeclaration({
    moduleSpecifier: 'postgres',
    defaultImport: 'postgres'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/pg-core',
    defaultImport: '* as core'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/postgres-js',
    defaultImport: '* as orm'
  });
  source.addImportDeclaration({
    defaultImport: '* as schema',
    moduleSpecifier: `./schema`
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

  generateExports(source);
};

export function generatePG(source: SourceFile, config: ProjectSettings) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import { Pool } from 'pg';
  //import * as core from 'drizzle-orm/pg-core';
  //import * as orm from "drizzle-orm/node-postgres";
  //import * as schema from './schema';
  //const resourceGlobal = global as unknown as Pool;
  //const resource = resourceGlobal.resource || new Pool({ 
  //  connectionString: process.env.DATABASE_URL 
  //});
  //const db = orm.drizzle(resource, { schema });
  //if (process.env.NODE_ENV !== 'production') {
  //  resourceGlobal.resource = resource
  //}
  //export { core, orm, resource, schema, db };
  source.addImportDeclaration({
    moduleSpecifier: 'pg',
    namedImports: [ 'Pool' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/pg-core',
    defaultImport: '* as core'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/node-postgres',
    defaultImport: '* as orm'
  });
  source.addImportDeclaration({
    defaultImport: '* as schema',
    moduleSpecifier: `./schema`
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resourceGlobal',
      initializer: 'global as unknown as { resource: Pool }'
    }]
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: formatCode(`resourceGlobal.resource || new Pool({
        connectionString: ${config.dburl.type === 'env' 
          ? `process.env.${config.dburl.value} as string`
          : `'${config.dburl.value}'`}
      })`)
    }]
  });

  generateExports(source);
};

export function generateVercel(source: SourceFile, config: ProjectSettings) {
  //Vercel
  //import { sql } from '@vercel/postgres';
  //import * as core from 'drizzle-orm/pg-core';
  //import * as orm from 'drizzle-orm/vercel-postgres';
  //import * as schema from './schema';
  //const resource = sql;
  //const db = orm.drizzle(resource, { schema });
  //export { core, orm, resource, schema, db };
  source.addImportDeclaration({
    moduleSpecifier: '@vercel/postgres',
    namedImports: [ 'sql' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/pg-core',
    defaultImport: '* as core'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/vercel-postgres',
    defaultImport: '* as orm'
  });
  source.addImportDeclaration({
    defaultImport: '* as schema',
    moduleSpecifier: `./schema`
  });
  source.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{
      name: 'resource',
      initializer: 'sql'
    }]
  });

  generateExports(source, false);
};

export function generatePlanetScale(source: SourceFile, config: ProjectSettings) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import { Client } from "@planetscale/database";
  //import * as core from 'drizzle-orm/mysql-core';
  //import * as orm from "drizzle-orm/planetscale-serverless";
  //import * as schema from './schema';
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || new Client({ url: process.env.DATABASE_URL });
  //const db = orm.drizzle(resource, { schema });
  //if (process.env.NODE_ENV !== 'production') {
  //  resourceGlobal.resource = resource
  //}
  //export { core, orm, resource, schema, db };
  source.addImportDeclaration({
    moduleSpecifier: '@planetscale/database',
    namedImports: [ 'Client' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/mysql-core',
    defaultImport: '* as core'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/planetscale-serverless',
    defaultImport: '* as orm'
  });
  source.addImportDeclaration({
    defaultImport: '* as schema',
    moduleSpecifier: `./schema`
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
  
  generateExports(source);
};

export function generateMysql(source: SourceFile, config: ProjectSettings) {
  if (!config.dburl.value) {
    return new Error('Missing database URL');
  }
  //import type { Connection } from "mysql2";
  //import mysql from "mysql2";
  //import * as core from 'drizzle-orm/mysql-core';
  //import * as orm from "drizzle-orm/mysql2";
  //import * as schema from './schema';
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || mysql.createConnection(process.env.DATABASE_URL);
  //const db = orm.drizzle(resource, { schema });
  //if (process.env.NODE_ENV !== 'production') {
  //  resourceGlobal.resource = resource
  //}
  //export { core, orm, resource, schema, db };
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'mysql2',
    namedImports: [ 'Connection' ]
  });
  source.addImportDeclaration({
    moduleSpecifier: 'mysql2',
    defaultImport: 'mysql'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/mysql-core',
    defaultImport: '* as core'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/mysql2',
    defaultImport: '* as orm'
  });
  source.addImportDeclaration({
    defaultImport: '* as schema',
    moduleSpecifier: `./schema`
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

  generateExports(source);
};

export function generateSqlite(source: SourceFile, config: ProjectSettings) {
  //import Database from 'better-sqlite3';
  //import * as core from 'drizzle-orm/sqlite-core';
  //import * as orm from 'drizzle-orm/libsql';
  //import * as schema from './schema';
  //const resourceGlobal = global as unknown;
  //const resource = resourceGlobal.resource || new Database(process.env.DATABASE_FILE);
  //const db = orm.drizzle(resource, { schema });
  //if (process.env.NODE_ENV !== 'production') {
  //  resourceGlobal.resource = resource
  //}
  //export {core,  orm, resource, schema, db };
  source.addImportDeclaration({
    moduleSpecifier: 'better-sqlite3',
    defaultImport: 'Database'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/sqlite-core',
    defaultImport: '* as core'
  });
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm/libsql',
    defaultImport: '* as orm'
  });
  source.addImportDeclaration({
    defaultImport: '* as schema',
    moduleSpecifier: `./schema`
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

  generateExports(source);
};