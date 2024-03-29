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
      const path = `${pathset.generate('detail', '[id%i]')}/index.tsx`;
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
      //import { useDetail } from 'adent/session';
      source.addImportDeclaration({
        moduleSpecifier: 'adent/session',
        namedImports: ['useDetail']
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
      //import { Table, Trow, Tcol } from 'frui-tailwind/Table';
      source.addImportDeclaration({
        moduleSpecifier: 'frui-tailwind/Table',
        namedImports: ['Table', 'Trow', 'Tcol']
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
      //import NameFormat from 'modules/profile/components/view/NameFormat';
      model.views.filter(
        column => column.view.component !== false
      ).forEach(column => {
        source.addImportDeclaration({
          moduleSpecifier: `${config.name}/${model.nameLower}/components/view/${capitalize(column.name)}Format`,
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
          const { results } = useDetail<${model.nameTitle}Extended>({ 
            method: 'get',
            path:  \`/api/${pathset.generate('detail', '${router.query?.id%i}')}\`
          });
        
          return {_, results };
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
              <title>{_('${model.singular} Detail')}</title>
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
          const { _, results } = usePage();
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
                <Link href="update">
                  <Button success className="mt-4">
                    <i className="fas fa-edit mr-2"></i>
                    {_('Update ${model.singular}')}
                  </Button>
                </Link>
                ${model.active ? `{results.${model.active.name} ? (
                  <Link href="remove">
                    <Button danger className="mt-4">
                      <i className="fas fa-trash mr-2"></i>
                      {_('Remove ${model.singular}')}
                    </Button>
                  </Link>
                ) : (
                  <Link href="restore">
                    <Button danger className="mt-4">
                      <i className="fas fa-undo mr-2"></i>
                      {_('Restore ${model.singular}')}
                    </Button>
                  </Link>
                )}
                ` : `<Link href="remove">
                    <Button danger className="mt-4">
                      <i className="fas fa-trash mr-2"></i>
                      {_('Remove ${model.singular}')}
                    </Button>
                  </Link>`
                }
              </div>
              <div className="p-3 bg-b2 flex-grow w-full overflow-auto mb-4">
                <Table>
                  ${model.views.map(column => (`
                    <Trow>
                      <Tcol><strong>${column.label || column.name}</strong></Tcol>
                      <Tcol>${column.view.component === false
                        ? `{results.${column.name}}`
                        : column.required
                        ? `<${capitalize(column.name)}Format value={results.${column.name}} />` 
                        : `{results.${column.name} && <${capitalize(column.name)}Format value={results.${column.name}} />}`
                      }</Tcol>
                    </Trow>
                  `)).join('\n')}
                </Table>
              </div>
            </main>
        );`)
      });
    });
};