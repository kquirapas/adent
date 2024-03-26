//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../types/Model';
//helpers
import { camelize, formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  const path = `${model.nameLower}/server/search.ts`;
  const source = project.createSourceFile(path, '', { overwrite: true });

  //import type { NextApiRequest, NextApiResponse } from 'next';
  source.addImportDeclaration({
    isTypeOnly: true,
    moduleSpecifier: 'next',
    namedImports: [ 'NextApiRequest', 'NextApiResponse' ]
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
    namedImports: [ 'count', 'and', 'eq', 'lte', 'gte', 'asc', 'desc' ]
  });
  //import { toResponse, toErrorResponse } from 'adent/helpers';
  source.addImportDeclaration({
    moduleSpecifier: 'adent/helpers',
    namedImports: [ 'toResponse', 'toErrorResponse' ]
  });
  //import { session } from '../../session';
  source.addImportDeclaration({
    moduleSpecifier: '../../session',
    namedImports: [ 'session' ]
  });
  //import { db, schema } from '../../store';
  source.addImportDeclaration({
    moduleSpecifier: '../../store',
    namedImports: [ 'db', 'schema' ]
  });

  //export async function handler(req: NextApiRequest, res: NextApiResponse)
  source.addFunction({
    isExported: true,
    name: 'handler',
    isAsync: true,
    parameters: [
      { name: 'req', type: 'NextApiRequest' },
      { name: 'res', type: 'NextApiResponse' }
    ],
    statements: formatCode(`
      //check permissions
      session.authorize(req, res, [ '${model.nameLower}-search' ]);
      //get query
      const query: SearchParams = req.query || {};
      //call action
      const response = await action(query);
      //if error
      if (response.error) {
        //update status
        res.status(response.code || 400);
      }
      //send response
      res.json(response);
    `)
  });

  //export async function action(
  //  query: SearchParams
  //): Promise<ResponsePayload<ProfileExtended[]>>
  source.addFunction({
    isExported: true,
    name: 'action',
    isAsync: true,
    parameters: [
      { name: 'query', type: 'SearchParams' }
    ],
    returnType: `Promise<ResponsePayload<${model.nameTitle}Extended[]>>`,
    statements: formatCode(`
      const { filter = {}, span = {}, sort = {}, skip = 0, take = 50 } = query;
      //selectors
      const select = db.select().from(schema.${
        model.nameCamel
      }).offset(skip).limit(take);
      const total = db.select({ total: count() }).from(schema.${
        model.nameCamel
      });
      //relations
      ${model.relations.map(column => {
        const camel = camelize(column.type);
        const join = model.columns.find(
          column => column.name === column.relation?.local
            && column.multiple
        )? 'leftJoin': 'innerJoin';
        const foreign = column.relation?.model;
        let second: string[] = [];
        if (foreign?.relations.length) {
          second = foreign.relations.map(column => {
            
            const join = foreign.columns.find(
              column => column.name === column.relation?.local
                && column.multiple
            )? 'leftJoin': 'innerJoin';
            return `//join ${column.name}
              select.${join}(
                schema.${camel}, 
                eq(schema.${model.nameCamel}.${
                  column.relation?.local
                }, schema.${camel}.${
                  column.relation?.foreign
                })
              );
              total.${join}(
                schema.${camel}, 
                eq(schema.${model.nameCamel}.${
                  column.relation?.local
                }, schema.${camel}.${
                  column.relation?.foreign
                })
              );
            `;
          })
        }
        return `//join ${column.name}
          select.${join}(
            schema.${camel}, 
            eq(schema.${model.nameCamel}.${
              column.relation?.local
            }, schema.${camel}.${
              column.relation?.foreign
            })
          );
          total.${join}(
            schema.${camel}, 
            eq(schema.${model.nameCamel}.${
              column.relation?.local
            }, schema.${camel}.${
              column.relation?.foreign
            })
          );
          ${second.join('\n')}
        `;
      }).join('\n')}
      //filters and spans
      const where: SQL[] = [];
      ${model.filterables.map(column => `
        //filter by ${column.name}
        if (filter.${column.name}) {
          ${['Number', 'Float', 'Integer'].includes(column.type)
            ? `where.push(eq(schema.${
              model.nameCamel
            }.${
              column.name
            }, Number(filter.${
              column.name
            })));`
            : column.type === 'Boolean'
            ? `where.push(eq(schema.${
              model.nameCamel
            }.${
              column.name
            }, Boolean(filter.${
              column.name
            })));`
            : `where.push(eq(schema.${
              model.nameCamel
            }.${
              column.name
            }, String(filter.${
              column.name
            })));`
          }
        }
      `).join('\n')}
      ${model.spanables.map(column => `
        //span by ${column.name}
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
            }, span.${
              column.name
            }[0]));
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
            }, span.${
              column.name
            }[1]));
          }
        }
      `).join('\n')}

      if (where.length > 0) {
        select.where(and(...where));
        total.where(and(...where));
      }

      const orderBy: SQL[] = [];
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
      }

      try {
        return toResponse(await select, (await total)[0].total);
      } catch (e) {
        const error = e as Error;
        return toErrorResponse(error);
      }
    `)
  });
};