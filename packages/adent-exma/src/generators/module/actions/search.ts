//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../../types/Model';
//helpers
import { typemap } from '../../../config';
import { camelize, formatCode } from '../../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const path = `${model.nameLower}/actions/search.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });
  const helpers = [...model.filterables, ...model.spanables ]
    .filter(column => !!typemap.helper[column.type])
    .map(column => typemap.helper[column.type])
    .filter((value, index, self) => self.indexOf(value) === index);
  const query = [
    'skip = 0', 
    'take = 50'
  ];
  if (model.sortables.length > 0) {
    query.unshift('sort = {}');
  }
  if (model.spanables.length > 0) {
    query.unshift('span = {}');
  }
  if (model.filterables.length > 0) {
    query.unshift('filter = {}');
  }
  const expanded: string[] = [];
  //consider json columns in the main results
  model.columns.forEach(column => {
    if (!typemap.literal[column.type]) {
      return;
    }
    if (typemap.literal[column.type] === 'json') {
      expanded.push(
        `${column.name}: JSON.parse(results.${column.name} || '{}')`
      );
    } else if (column.multiple) {
      expanded.push(
        `${column.name}: JSON.parse(results.${column.name} || '[]')`
      );
    }
  });
  //consider json columns in the relation results
  model.relations.forEach(column => {
    const relationResults = [`...results.${column.name}`];
    const foreign = column.relation?.model;
    if (foreign) {
      foreign.columns.forEach(foreign => {
        if (!typemap.literal[foreign.type]) {
          return;
        }
        if (typemap.literal[foreign.type] === 'json') {
          relationResults.push(
            `${foreign.name}: JSON.parse(results.${column.name}.${foreign.name} || '{}')`
          );
        } else if (foreign.multiple) {
          relationResults.push(
            `${foreign.name}: JSON.parse(results.${column.name}.${foreign.name} || '[]')`
          );
        }
      });
    }
    expanded.push(
      relationResults.length > 1 ? `${column.name}: {
        ${relationResults.join(',\n')}
      }`: `${column.name}: results.${column.name}`
    );
  });

  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'drizzle-orm',
    namedImports: [ 'SQL' ]
  });
  //import type { ResponsePayload, SearchParams } from 'adent/types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'adent/types',
    namedImports: [ 'ResponsePayload', 'SearchParams' ]
  });
  //import type { ProfileExtended } from '../types';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: '../types',
    namedImports: [ `${model.nameTitle}Extended` ]
  });
  //import { sql } from 'drizzle-orm';
  source.addImportDeclaration({
    moduleSpecifier: 'drizzle-orm',
    namedImports: model.spanables.length > 0
      ? [ 'count', 'and', 'eq', 'lte', 'gte', 'asc', 'desc' ]
      : [ 'count', 'and', 'eq', 'asc', 'desc' ]
  });
  //import { toResponse, toErrorResponse } from 'adent/helpers/server';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/helpers/server',
    namedImports: [ ...helpers, 'toResponse', 'toErrorResponse' ]
  });
  //import { db, schema } from '../../store';
  source.addImportDeclaration({
    moduleSpecifier: '../../store',
    namedImports: [ 'db', 'schema', 'core' ]
  });

  //export async function action(
  //  query: SearchParams
  //): Promise<ResponsePayload<ProfileExtended[]>>
  source.addFunction({
    isDefaultExport: true,
    name: 'action',
    isAsync: true,
    parameters: [
      { name: 'query', type: 'SearchParams' }
    ],
    returnType: `Promise<ResponsePayload<${model.nameTitle}Extended[]>>`,
    statements: formatCode(`
      const { ${query.join(', ')} } = query;
      //main table
      const ${model.nameCamel} = core.alias(schema.${model.nameCamel}, '${model.nameLower}');
      //selectors
      const select = db.select().from(${model.nameCamel}).offset(skip).limit(take);
      const total = db.select({ total: count() }).from(${model.nameCamel});
      ${model.relations.length > 0 ? `//relations
        ${model.relations.map(column => {
          const camel = camelize(column.type);
          const join = model.columns.find(
            column => column.name === column.relation?.local
              && column.multiple
          )? 'leftJoin': 'innerJoin';
          return `//join ${column.name}
            const ${column.name} = core.alias(schema.${camel}, '${column.name}');
            select.${join}(
              ${column.name}, 
              eq(${model.nameCamel}.${
                column.relation?.local
              }, ${column.name}.${
                column.relation?.foreign
              })
            );
            total.${join}(
              ${column.name}, 
              eq(${model.nameCamel}.${
                column.relation?.local
              }, ${column.name}.${
                column.relation?.foreign
              })
            );
          `;
        }).join('\n')}`: ''
      }
      ${model.filterables.length > 0 || model.spanables.length > 0 ? `
        //filters and spans
        const where: SQL[] = [];
        ${model.filterables.map(column => {
          const helper = typemap.helper[column.type];
          const value = helper
            ? `${helper}(filter.${column.name})`
            : `filter.${column.name}`;
          return `//filter by ${column.name}
            if (filter.${column.name}) {
              where.push(eq(schema.${
                model.nameCamel
              }.${column.name}, ${value}));
            }
          `;
        }).join('\n')}
        ${model.spanables.map(column => {
          const helper = typemap.helper[column.type];
          const min = helper
            ? `${helper}(span.${column.name}[0])`
            : `span.${column.name}[0]`;
          const max = helper
            ? `${helper}(span.${column.name}[1])`
            : `span.${column.name}[1]`;
          return `//span by ${column.name}
            if (span.${column.name}) {
              if (typeof span.${
                column.name
              }[0] !== 'undefined' && span.${
                column.name
              }[0] !== null) {
                where.push(gte(schema.${
                  model.nameCamel
                }.${
                  column.name
                }, ${min}));
              }
              if (typeof span.${
                column.name
              }[1] !== 'undefined' && span.${
                column.name
              }[1] !== null) {
                where.push(lte(schema.${
                  model.nameCamel
                }.${
                  column.name
                }, ${max}));
              }
            }
          `;
        }).join('\n')}
  
        if (where.length > 0) {
          select.where(and(...where));
          total.where(and(...where));
        }`: ''
      }
      ${model.sortables.length > 0 ? `const orderBy: SQL[] = [];
        ${model.sortables.map(column => `
          //sort by ${column.name}
          if (sort.${column.name}) {
            const up = asc(schema.${model.nameCamel}.${column.name});
            const down = desc(schema.${model.nameCamel}.${column.name});
            orderBy.push(sort.${column.name} === 'asc' ? up : down);
          }
        `).join('\n')}
        if (orderBy.length > 0) {
          select.orderBy(...orderBy);
        }`: ''
      }

      try {
        ${model.relations.length > 0 
          ? `const rows = await select.then(rows => rows.map(row => {
            //drizzle does get the return type wrong
            const results = row as unknown as Record<string, any>;
            return {
              ...results.${model.nameLower},
              ${expanded.join(',\n')}
            } as ${model.nameTitle}Extended;
          }));`
          : expanded.length > 0 
          ? `const rows = await select.then(rows => rows.map(row => {
            //drizzle does get the return type wrong
            const results = row as unknown as Record<string, any>;
            return {
              ...results,
              ${expanded.join(',\n')}
            } as ${model.nameTitle}Extended;
          }));`
          :'const rows = await select;'}
        const totalRows = (await total)[0].total;
        return toResponse(rows, totalRows);
      } catch (e) {
        const error = e as Error;
        return toErrorResponse(error);
      }
    `)
  });
};