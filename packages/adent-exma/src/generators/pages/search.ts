//types
import type { Project, Directory } from 'ts-morph';
import type { ProjectSettings } from '../../types';
import type Model from '../../types/Model';
//helpers
import { capitalize, formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(
  project: Location, 
  config: ProjectSettings, 
  model: Model
) {
  model.pathset.forEach(pathset => {
    const path = `${pathset.generate('search', '[id%i]')}/index.tsx`;
    const source = project.createSourceFile(path, '', { overwrite: true });

    //import type { ProfileExtended } from 'modules/profile/types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: `${config.name}/${model.nameLower}/types`,
      namedImports: [`${model.name}Extended`]
    });
    //import { useRouter } from 'next/router';
    source.addImportDeclaration({
      moduleSpecifier: 'next/router',
      namedImports: ['useRouter']
    });
    //import { useLanguage } from 'r22n';
    source.addImportDeclaration({
      moduleSpecifier: 'r22n',
      namedImports: ['useLanguage']
    });
    //import { useSearch } from 'adent/session';
    source.addImportDeclaration({
      moduleSpecifier: 'adent/session',
      namedImports: ['useSearch']
    });
    //import Link from 'next/link';
    source.addImportDeclaration({
      moduleSpecifier: 'next/link',
      defaultImport: 'Link'
    });
    //import HTMLHead from 'next/head';
    source.addImportDeclaration({
      moduleSpecifier: 'next/head',
      defaultImport: 'HTMLHead'
    });
    //import { Table, Thead, Trow, Tcol } from 'frui-tailwind/Table';
    source.addImportDeclaration({
      moduleSpecifier: 'frui-tailwind/Table',
      namedImports: ['Table', 'Thead', 'Trow', 'Tcol']
    });
    //import Alert from 'frui-tailwind/Alert';
    source.addImportDeclaration({
      moduleSpecifier: 'frui-tailwind/Alert',
      defaultImport: 'Alert'
    });
    //import Loader from 'frui-tailwind/Loader';
    source.addImportDeclaration({
      moduleSpecifier: 'frui-tailwind/Loader',
      defaultImport: 'Loader'
    });
    //import Button from 'frui-tailwind/Button';
    source.addImportDeclaration({
      moduleSpecifier: 'frui-tailwind/Button',
      defaultImport: 'Button'
    });
    //import NameFormat from 'modules/profile/components/list/NameFormat';
    model.lists.filter(
      column => column.list.component !== false
    ).forEach(column => {
      source.addImportDeclaration({
        moduleSpecifier: `${config.name}/${model.nameLower}/components/list/${capitalize(column.name)}Format`,
        defaultImport: `${capitalize(column.name)}Format`
      });
    });
    //export function usePage()
    source.addFunction({
      name: 'usePage',
      isExported: true,
      statements: formatCode(`
        const router = useRouter();
        const { _ } = useLanguage();
        const { 
          processing,
          handlers, 
          results,
          error,
          opened
        } = useSearch<${model.nameTitle}Extended>({ 
          method: 'get',
          path:  \`/api/${pathset.generate('search', '${router.query?.id%i}')}\`
        });
      
        return {
          _,
          router,
          processing,
          handlers, 
          results,
          error,
          opened 
        };
      `)
    });
    //export function Head()
    source.addFunction({
      name: 'Head',
      isExported: true,
      statements: formatCode(`
        const { _ } = useLanguage();
        return (
          <HTMLHead>
            <title>{_('${model.plural}')}</title>
          </HTMLHead>
        );
      `)
    });
    //export function Body()
    source.addFunction({
      name: 'Body',
      isExported: true,
      statements: formatCode(`
        //hooks
        const { _, router, results } = usePage();
        //render
        if (!results) {
          return (
            <Alert info>
              <div className="inline-block">
                <Loader show={true} />
              </div>
              {_('Loading...')}
            </Alert>
          );
        }
        return (
          <main className="max-w-lg m-auto flex flex-col h-full relative justify-center items-center">
            <div className="p-3 bg-b2 w-full overflow-auto mb-4">
              <Link href="${
                config.path.length ? `/${config.path}`:''
              }/${pathset.generate('create', 'router.query?.id%i')}">
                <Button success className="mt-4">
                  <i className="fas fa-plus mr-2"></i>
                  {_('Create ${model.singular}')}
                </Button>
              </Link>
            </div>
            <div className="p-3 bg-b2 flex-grow w-full overflow-auto mb-4">
              <Table>
                ${model.lists.map(column => (
                  `<Thead>${column.label || column.name}</Thead>`
                )).join('\n')}
                {results.rows?.map((row, index) => (
                  <Trow key={index}>
                    ${model.lists.map(column => (`
                      <Tcol>
                        ${column.list.component === false
                          ? `{row.${column.name}}`
                          : column.required
                          ? `<${capitalize(column.name)}Format value={row.${column.name}} />` 
                          : `{row.${column.name} && <${capitalize(column.name)}Format value={row.${column.name}} />}`
                        }
                      </Tcol>
                    `)).join('\n')}
                  </Trow>
                ))}
              </Table>
            </div>
          </main>
      );`)
    });
    //export default function Page()
    source.addFunction({
      isDefaultExport: true,
      name: 'Page',
      statements: formatCode(`
        return (
          <>
            <Head />
            <Body />
          </>
        );
      `)
    });
  });
};