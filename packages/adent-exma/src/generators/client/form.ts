//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../types/Model';
//helpers
import { capitalize, camelize, formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  //loop through all the columns
  model.columns.forEach(column => {
    //get the field of the column
    const field = column.field;
    //skip if no component
    if (!field.component) return;
    //get the path where this should be saved
    const capital = capitalize(camelize(column.name));
    const path = `${model.nameLower}/client/form/${capital}Field.tsx`;
    const source = project.createSourceFile(path, '', { overwrite: true });
    //import type { FieldProps, ControlProps } from 'adent/types';
    source.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: 'adent/types',
      namedImports: [ 'FieldProps', 'ControlProps' ]
    });
    //import { useLanguage } from 'r22n';
    source.addImportDeclaration({
      moduleSpecifier: 'r22n',
      namedImports: [ 'useLanguage' ]
    });
    //import Control from 'frui-tailwind/Control';
    source.addImportDeclaration({
      moduleSpecifier: 'frui-tailwind/Control',
      defaultImport: 'Control'
    });

    //import Input from 'frui-tailwind/fields/Input';
    source.addImportDeclaration({
      moduleSpecifier: `frui-tailwind/fields/${field.component}`,
      defaultImport: field.component as string
    });
    //export function NameField(props: FieldProps) {
    source.addFunction({
      isExported: true,
      name: `${capital}Field`,
      parameters: [
        { name: 'props', type: 'FieldProps' }
      ],
      statements: formatCode(`
        //props
        const { className, value, change, error = false } = props;
        const attributes = ${JSON.stringify(field.attributes)};
        //render
        return (
          <${field.component} 
            {...attributes}
            className={className}
            error={error} 
            defaultValue={value.toString()} 
            onUpdate={value => change('name', value)}
          />
        );
      `)
    });
    //export function NameControl(props: ControlProps) {
    source.addFunction({
      isExported: true,
      name: `${capital}Control`,
      parameters: [
        { name: 'props', type: 'ControlProps' }
      ],
      statements: column.required ? formatCode(`
        //props
        const { className, value, change, error } = props;
        //hooks
        const { _ } = useLanguage();
        //render
        return (
          <Control label={\`\${_('${column.label}')}*\`} error={error} className={className}>
            <${capital}Field
              className="!border-b2"
              error={!!error} 
              value={value} 
              change={change}
            />
          </Control>
        );
      `): formatCode(`
        //props
        const { className, value, change, error } = props;
        //hooks
        const { _ } = useLanguage();
        //render
        return (
          <Control label={_('${column.label}')} error={error} className={className}>
            <${capital}Field
              className="!border-b2"
              error={!!error} 
              value={value} 
              change={change}
            />
          </Control>
        );
      `)
    });
  });
};