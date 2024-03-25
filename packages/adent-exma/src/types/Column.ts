import type { Data, ColumnConfig } from 'exma';
import type { 
  FieldMethod, 
  FormatMethod, 
  ValidatorMethod
} from '../config';

import Enum from './Enum';
import Type from './Type';
import Model from './Model';
import config, { types, spanable } from '../config';

export type Validation = {
  method: ValidatorMethod,
  parameters: any[],
  message: string
};
export type ColumnField = {
  method: FieldMethod,
  attributes: Record<string, any>
};
export type ColumnValidation = Validation[];
export type ColumnFormat = {
  sticky?: boolean,
  method: FormatMethod,
  attributes: Record<string, any>
};

//methods to check column types
export const typeValidators: Record<string, string> = {
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
};

export default class Column {
  //this is the raw column config collected from exma
  protected _config: ColumnConfig;

  /**
   * Returns the column attributes
   */
  get attributes() {
    return this._config.attributes;
  }

  /**
   * Returns the column config
   */
  get config() {
    return this._config;
  }

  /**
   * Returns the column default value
   */
  get default() {
    //@default("some value")
    if (Array.isArray(this._config.attributes.default)) {
      return this._config.attributes.default[0];
    }
    return undefined;
  }

  /**
   * Returns the column field (defaults to none)
   */
  get field() {
    for (const name in config.fields) {
      if (!this._config.attributes[`field.${name}`]) {
        continue;
      }
      const flag = this._config.attributes[`field.${name}`];
      const field = typeof flag === 'object' ? flag : {};
      const method = name as FieldMethod;
      const attributes = {
        ...config.fields[name].attributes,
        ...field
      };
      return { method, attributes, config };
    }

    return { 
      method: 'none' as FieldMethod, 
      attributes: {}, 
      config: config.fields.none 
    };
  }

  /**
   * Returns true if column is filterable
   */
  get filterable() {
    return this._config.attributes.filterable === true;
  }

  /**
   * Returns true if column is generated
   */
  get generated() {
    return this._config.attributes.generated === true;
  }

  /**
   * Returns true if column is a primary key
   */
  get id() {
    return this._config.attributes.id === true;
  }

  /**
   * Returns true if column is indexable (filterable, searchable, or sortable)
   */
  get indexable() {
    return this.filterable || this.searchable || this.sortable;
  }

  /**
   * Returns the column label
   */
  get label() {
    const label = this._config.attributes.label;
    return !Array.isArray(label) ? this._config.name : label[0] as string;
  }

  /**
   * Returns the column list format (defaults to none)
   */
  get list() {
    for (const name in config.formats) {
      if (!this._config.attributes[`list.${name}`]) {
        continue;
      }
      const flag = this._config.attributes[`list.${name}`];
      const format = typeof flag === 'object' ? flag : {};
      const method = name as FormatMethod;
      const attributes = {
        ...config.formats[name].attributes,
        ...format
      };

      return { method, attributes, config };
    }

    return { 
      method: 'none' as FormatMethod, 
      attributes: {}, 
      config: config.formats.none 
    };
  }

  /**
   * Returns true if the column accepts multiple values
   */
  get multiple() {
    return this._config.multiple;
  }

  /**
   * Returns the column name
   */
  get name() {
    return this._config.name;
  }

  /**
   * Returns the column relation, if any
   */
  get relation() {
    const relation = this._config.attributes.relation as Record<string, any>|undefined;
    if (!relation || typeof relation[0] !== 'object') {
      return null;
    }
    return { ...relation[0], model: new Model(this.type) };
  }

  /**
   * Returns true if the column is required
   */
  get required() {
    return this._config.required;
  }

  /**
   * Returns true if column is searchable
   */
  get searchable() {
    return this._config.attributes.searchable === true;
  }

  /**
   * Returns true if column is sortable
   */
  get sortable() {
    return this._config.attributes.sortable === true;
  }

  /**
   * Returns true if column is spanable
   */
  get spanable() {
    return this.filterable && spanable.includes(types[this._config.type]);
  }

  /**
   * Returns the column type
   */
  get type() {
    return this._config.type;
  }

  /**
   * Returns the column literal type
   */
  get literal() {
    if (types[this._config.type]) {
      return types[this._config.type];
    }
    const options = Enum.get(this._config.type);
    if (options) {
      return Object.values(options);
    }
    const type = Type.get(this._config.type);
    if (type) {
      return type;
    }
    const model = Model.get(this._config.type);
    if (model) {
      return model;
    }
    return null;
  }

  /**
   * Returns true if column is unique
   */
  get unique() {
    return this._config.attributes.unique === true;
  }

  /**
   * Returns the column validators (defaults to none)
   */
  get validators() {
    const validators: {
      method: ValidatorMethod,
      parameters: Data[],
      message: string
    }[] = [];
    //if column is system generated
    if (this.generated) {
      //then there is no need to validate
      return validators;
    }
    //explicit validators
    for (const name of config.validators) {
      if (!this._config.attributes[`is.${name}`]) {
        continue;
      }
      const flag = this._config.attributes[`is.${name}`];
      const method = name as ValidatorMethod;
      const parameters = Array.isArray(flag) ? Array.from(flag) : [];
      const message = parameters.pop() as string || null;
      validators.push({ 
        method, 
        parameters, 
        message: message || 'Invalid value' 
      });  
    }
    //implied validators
    // String, Text,    Number, Integer, 
    // Float,  Boolean, Date,   Datetime, 
    // Time,   Json,    Object, Hash
    for (const type in typeValidators) {
      if (this.type === type) {
        if (this.multiple) {
          if (!validators.find(v => v.method === 'array')) {
            validators.unshift({ 
              method: 'array' as ValidatorMethod, 
              parameters: [ typeValidators[type] ], 
              message: 'Invalid format'
            });
          }
        } else if (!validators.find(v => v.method === typeValidators[type])) {
          validators.unshift({ 
            method: typeValidators[type] as ValidatorMethod, 
            parameters: [], 
            message: 'Invalid format'
          });
        }
      }
    }
    // - unique
    if (this.unique) {
      if (!validators.find(v => v.method === 'unique')) {
        validators.unshift({ 
          method: 'unique' as ValidatorMethod, 
          parameters: [], 
          message: 'Already exists'
        });
      }
    }
    // - required
    if (this.required && typeof this.default === undefined) {
      if (!validators.find(v => v.method === 'required')) {
        validators.unshift({ 
          method: 'required' as ValidatorMethod, 
          parameters: [], 
          message: `${this._config.name} is required`
        });
      }
    }

    return validators;
  }

  /**
   * Returns the column view format (defaults to none)
   */
  get view() {
    for (const name in config.formats) {
      if (!this._config.attributes[`view.${name}`]) {
        continue;
      }
      const flag = this._config.attributes[`view.${name}`];
      const format = typeof flag === 'object' ? flag : {};
      const method = name as FormatMethod;
      const attributes = {
        ...config.formats[name].attributes,
        ...format
      };

      return { method, attributes, config };
    }

    return { 
      method: 'none' as FormatMethod, 
      attributes: {}, 
      config: config.formats.none 
    };
  }

  /**
   * Sets the column config
   */
  constructor(config: ColumnConfig) {
    this._config = config;
  }
}