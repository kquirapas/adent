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
    //get the path where this should be saved
    const path = `${pathset.generate('create', '[id%i]')}.tsx`;
    const source = project.createSourceFile(path, '', { overwrite: true });

    //import type { FormEvent } from 'react';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: 'react',
      namedImports: ['FormEvent']
    });
    //import type { ProfileModel } from 'modules/profile/types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: `${config.name}/${model.nameLower}/types`,
      namedImports: [`${model.name}Model`]
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
      namedImports: ['useLanguage']
    });
    //import { useForm } from 'adent/session';
    source.addImportDeclaration({
      moduleSpecifier: 'adent/session',
      namedImports: ['useForm']
    });
    //import HTMLHead from 'next/head';
    source.addImportDeclaration({
      moduleSpecifier: 'next/head',
      defaultImport: 'HTMLHead'
    });
    //import Button from 'frui-tailwind/Button';
    source.addImportDeclaration({
      moduleSpecifier: 'frui-tailwind/Button',
      defaultImport: 'Button'
    });
    //import Loader from 'frui-tailwind/Loader';
    source.addImportDeclaration({
      moduleSpecifier: 'frui-tailwind/Loader',
      defaultImport: 'Loader'
    });
    //import { NameControl } from 'modules/profile/components/form/NameField';
    model.fields.forEach(column => {
      source.addImportDeclaration({
        moduleSpecifier: `${config.name}/${model.nameLower}/components/form/${capitalize(column.name)}Field`,
        namedImports: [`${capitalize(column.name)}Control`]
      });
    });
    //import notify, { flash } from 'adent/notify';
    source.addImportDeclaration({
      moduleSpecifier: 'adent/notify',
      defaultImport: 'notify',
      namedImports: ['flash']
    });
    //export function usePage()
    source.addFunction({
      isExported: true,
      name: 'usePage',
      statements: formatCode(`
        //hooks
        const router = useRouter();
        const pathname = usePathname();
        const { _ } = useLanguage();
        const {
          handlers, 
          data, 
          processing, 
          errors
        } = useForm<${model.nameTitle}Model>({ 
          method: 'post', 
          path:  \`/api/${pathset.generate('create', '${router.query?.id%i}')}\`
        });
        //variables
        const back = (pathname || '').split('/').slice(0, -1).join('/');
        const action = (e: FormEvent) => {
          e.preventDefault();
          handlers.action().then(response => {
            if (response.error) {
              return notify('error', response.message);
            }
            if (router.query.redirect || back) {
              flash('success', _('${model.singular} created successfully'));
              router.push(router.query.redirect as string || back);
            } else {
              notify('success', _('${model.singular} created successfully')); 
            }
          });
          return false;
        };
        //return
        return {
          _,
          handlers, 
          data, 
          processing, 
          errors,
          action
        };
      `)
    });
    //export function Head()
    source.addFunction({
      isExported: true,
      name: 'Head',
      statements: formatCode(`
        const { _ } = useLanguage();
        return (
          <HTMLHead>
            <title>{_('Create ${model.singular}')}</title>
          </HTMLHead>
        );
      `)
    });
    //export function Body()
    source.addFunction({
      isExported: true,
      name: 'Body',
      statements: formatCode(`
        //hooks
        const {
          _,
          handlers, 
          data, 
          processing, 
          errors,
          action
        } = usePage();
        //render
        return (
          <main className="max-w-lg m-auto flex flex-col h-full relative justify-center items-center">
            <div className="p-8 bg-b2 w-full overflow-auto mb-4">
              <h1 className="text-center text-2xl mb-4">
                {_('Create ${model.singular}')}
              </h1>
              <form onSubmit={action}>
                ${model.fields.map(column => (`
                  <${capitalize(column.name)}Control
                    error={errors.${column.name}} 
                    value={data.${column.name}} 
                    change={handlers.change}
                  />
                `)).join('\n')}
                <Button info className="mt-4" disabled={processing}>
                  <div className="inline-block">
                    <Loader show={processing} />
                  </div>
                  {!processing && (<i className="fas fa-save mr-2"></i>)} 
                  {_('Submit')}
                </Button>
              </form>
            </div>
          </main>
        );
      `)
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