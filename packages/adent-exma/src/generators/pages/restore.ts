//types
import type { Project, Directory } from 'ts-morph';
import type { ProjectSettings } from '../../types';
import type Model from '../../types/Model';
//helpers
import { formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(
  project: Location, 
  config: ProjectSettings, 
  model: Model
) {
    model.pathset.forEach(pathset => {
      const path = `${pathset.generate('restore', '[id%i]')}.tsx`;
      const source = project.createSourceFile(path, '', { overwrite: true });

      //import type { ProfileExtended } from 'modules/profile/types';
      source.addImportDeclaration({
        isTypeOnly: true,
        moduleSpecifier: `${config.name}/${model.nameLower}/types`,
        namedImports: [`${model.name}Extended`]
      });
      //import { usePathname } from 'next/navigation'
      source.addImportDeclaration({
        moduleSpecifier: 'next/navigation',
        namedImports: ['usePathname']
      });
      //import { useRouter } from 'next/router';
      source.addImportDeclaration({
        moduleSpecifier: 'next/router',
        namedImports: ['useRouter']
      });
      //import { useLanguage } from 'r22n';
      source.addImportDeclaration({
        moduleSpecifier: 'r22n',
        namedImports: [ 'useLanguage', 'Translate' ]
      });
      //import { useDetail } from 'adent/session';
      source.addImportDeclaration({
        moduleSpecifier: 'adent/session',
        namedImports: [ 'useDetail', 'useFlag' ]
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
      //import notify, { flash } from 'adent/notify';
      source.addImportDeclaration({
        moduleSpecifier: 'adent/notify',
        defaultImport: 'notify',
        namedImports: ['flash']
      });
      //export function usePage()
      source.addFunction({
        name: 'usePage',
        isExported: true,
        statements: formatCode(`
          const router = useRouter();
          const pathname = usePathname();
          const { _ } = useLanguage();
          const back = pathname.split('/').slice(0, -1).join('/');
          const { 
            results, 
            processing: loading 
          } = useDetail<${model.nameTitle}Extended>({ 
            method: 'get',
            path:  \`/api/${pathset.generate('detail', '${router.query?.id%i}')}\`
          });
          const { handlers, processing } = useFlag<${model.nameTitle}Extended>({ 
            method: 'delete',
            path:  \`/api/${pathset.generate('restore', '${router.query?.id%i}')}\`
          });

          const action = () => {
            handlers.action().then(response => {
              if (response.error) {
                return notify('error', response.message);
              }
              flash('success', _('${model.singular} restored successfully'));
              router.push(router.query.redirect as string || back);
            });
          };
        
          return { _, router, loading, results, handlers, action, processing };
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
              <title>{_('Restore ${model.singular}')}</title>
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
          const { _, loading, results, handlers, action, processing } = usePage();
          return (
            <main className="flex flex-col flex-grow h-full relative overflow-auto bg-b0">
              <div className="px-4 py-2 mt-16">
                {results ? (
                  <div className="bg-b-warning text-yellow-800 p-8 border border-t-warning">
                    <div>
                      <i className="fas fa-exclamation-triangle mr-2"></i>
                      <span>
                        <Translate>
                          Are you sure you want to restore <span className="font-bold">
                            ${model.suggested('{results.%s}')}
                          </span> ? 
                        </Translate>
                      </span>
                    </div>
                    <div className="mt-4">
                      <Button 
                        success 
                        className="w-full md:w-auto px-4 py-2 my-2 mr-2" 
                        onClick={action}
                        disabled={processing}
                      >
                        <div className="inline-block">
                          <Loader show={processing} />
                        </div>
                        {!processing && (<i className="fas fa-trash mr-2"></i>)} 
                        <Translate>Yep, lets do this</Translate>
                      </Button>
                      <Link href=".">
                        <Button info className="w-full md:w-auto px-4 py-2 my-2">
                          <i className="fas fa-cancel mr-2"></i>
                          <Translate>Ahh, Nevermind...</Translate>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ): loading ? (
                  <Alert info className="flex items-center m-3">
                    <Loader show={true} />
                    {_('Loading')}
                  </Alert>
                ) : (
                  <Alert error className="flex items-center m-3">
                    <i className="fas fa-fw fa-times-circle mr-2"></i>
                    {_('Not found')}
                  </Alert>
                )}
              </div>
            </main>
        );`)
      });
    });
};