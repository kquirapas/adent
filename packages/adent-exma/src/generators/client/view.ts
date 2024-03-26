//types
import type { Project, Directory } from 'ts-morph';
import type Model from '../../types/Model';
//helpers
import { typemap } from '../../config';
import { capitalize, camelize, formatCode } from '../../helpers';

type Location = Project|Directory;

export default function generate(project: Location, model: Model) {
  //loop through all the columns
  model.columns.forEach(column => {
    //get the column format
    const field = column.view;
    //skip if no component
    if (!field.component) return;
    //get the path where this should be saved
    const capital = capitalize(camelize(column.name));
    const path = `${model.nameLower}/client/view/${capital}Format.tsx`;
    const source = project.createSourceFile(path, '', { overwrite: true });

    //import Text from 'frui-tailwind/formats/Text';
    source.addImportDeclaration({
      moduleSpecifier: `frui-tailwind/formats/${field.component}`,
      defaultImport: field.component as string
    });
    //export function NameFormat() {
    source.addFunction({
      isExported: true,
      name: `${capital}Format`,
      parameters: [
        { name: 'props', type: `{ value: ${typemap[column.type]} }` }
      ],
      statements: formatCode(`
        //props
        const { value } = props;
        const attributes = ${JSON.stringify(field.attributes)};
        //render
        return (
          <${field.component} {...attributes} value={value} />
        );
      `)
    });
  });
};