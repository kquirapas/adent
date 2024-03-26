// This a geeral component map used to configure fields, validators, and 
// formats defined inside a schema.exma file.
import fields from './fields.json';
import formats from './formats.json';

// These are the possible fields that can be defined 
// in schema.exma ie. `@field.text`
export type FieldMethod = 'active' 
  | 'autocomplete' | 'checkbox'  | 'checklist' 
  | 'code'         | 'color'     | 'country' 
  | 'created'      | 'currency'  | 'date'
  | 'datetime'     | 'email'     | 'fieldset'
  | 'file'         | 'filelist'  | 'image'
  | 'imagelist'    | 'input'     | 'integer'
  | 'json'         | 'mask'      | 'metadata'
  | 'none'         | 'number'    | 'password'
  | 'phone'        | 'price'     | 'radio'        
  | 'radiolist'    | 'range'     | 'rating'
  | 'select'       | 'slider'    | 'slug'
  | 'small'        | 'switch'    | 'table'
  | 'tags'         | 'text'      | 'textarea'
  | 'textlist'     | 'time'      | 'updated'
  | 'url'          | 'wysiwyg';

// These are the possible validators that can be defined 
// in schema.exma ie. `@is.required`
export type ValidatorMethod = 'required'
  | 'notempty' | 'eq'      | 'ne'
  | 'option'   | 'regex'   | 'date'
  | 'future'   | 'past'    | 'present'
  | 'number'   | 'float'   | 'price'
  | 'integer'  | 'boolean' | 'gt'
  | 'ge'       | 'lt'      | 'le'
  | 'ceq'      | 'cgt'     | 'cge'
  | 'clt'      | 'cle'     | 'wgt'
  | 'wge'      | 'wlt'     | 'wle'
  | 'cc'       | 'email'   | 'hex'
  | 'color'    | 'url'     | 'string'
  | 'object'   | 'array'   | 'unique';

// These are the possible formatters that can be defined
// in schema.exma `@list.link({ target '_blank'})`
export type FormatMethod = 'captal' 
  | 'char'     | 'color'    | 'comma'
  | 'country'  | 'currency' | 'date' 
  | 'carousel' | 'email'    | 'escaped'  
  | 'formula'  | 'hide'     | 'html'     
  | 'image'    | 'json'     | 'line'  
  | 'link'     | 'list'     | 'lower'
  | 'markdown' | 'metadata' | 'none'
  | 'number'   | 'ol'       | 'pretty' 
  | 'price'    | 'phone'    | 'rating'  
  | 'rel'      | 'relative' | 'space' 
  | 'table'    | 'tags'     | 'text'  
  | 'ul'       | 'upper'    | 'word' 
  | 'yesno';

//column options

// This is the output format for the @field.text, @list.text options from a 
// column in a model in schema.exma
export type ColumnOption = { 
  component: string|false, 
  attributes: Record<string, any>
};

// This is a list of all defined fields, validators,  
// and formats this code will understand
const config = {
  fields: fields as Record<string, ColumnOption>,
  formats: formats as Record<string, ColumnOption>,
  validators: [
    'required', 'notempty', 'eq',      'ne',      'option', 'regex', 
    'date',     'future',   'past',    'present', 'number', 'float', 
    'price',    'integer',  'boolean', 'gt',      'ge',     'lt', 
    'le',       'ceq',      'cgt',     'cge',     'clt',    'cle', 
    'wgt',      'wge',      'wlt',     'wle',     'cc',     'email', 
    'hex',      'color',    'url',     'string',  'object', 'array'
  ]
};

export const typemap: Record<string, Record<string, string>> = {
  //to typescript
  type: {
    String: 'string',
    Text: 'string',
    Number: 'number',
    Integer: 'number',
    Float: 'number',
    Boolean: 'boolean',
    Date: 'string',
    Time: 'string',
    Datetime: 'string',
    Json: 'string',
    Object: 'string',
    Hash: 'string'
  },
  //to validator methods
  validator: {
    String: 'string',
    Text: 'string',
    Number: 'number',
    Integer: 'integer',
    Float: 'float',
    Boolean: 'boolean',
    Date: 'date',
    Datetime: 'date',
    Time: 'date',
    Json: 'object',
    Object: 'object',
    Hash: 'object'
  },
  //to literal types
  literal: {
    String: 'string',
    Text: 'string',
    Number: 'number',
    Integer: 'integer',
    Float: 'float',
    Boolean: 'boolean',
    Date: 'date',
    Time: 'time',
    Datetime: 'datetime',
    Json: 'json',
    Object: 'json',
    Hash: 'json'
  },
  //to sql format methods
  helper: {
    String: 'toSqlString',
    Text: 'toSqlString',
    Number: 'toSqlFloat',
    Integer: 'toSqlInteger',
    Float: 'toSqlFloat',
    Boolean: 'toSqlBoolean',
    Date: 'toSqlDate',
    Time: 'toSqlDate',
    Datetime: 'toSqlDate',
    Json: 'toSqlString',
    Object: 'toSqlString',
    Hash: 'toSqlString'
  }
}

export const spanable = [ 
  'number', 'integer', 'float', 
  'date',   'time',    'datetime' 
];

export default config;