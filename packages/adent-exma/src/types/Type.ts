import type { Data, TypeConfig } from 'exma';

import { Exception } from 'exma';
import Column from './Column';

import { typemap } from '../config';
import { camelize, capitalize } from '../helpers';

export default class Type {
  /**
   * A cached list of all schemas
   */
  protected static _configs: Record<string, TypeConfig> = {};

  /**
   * Returns all the configs
   */
  public static get configs() {
    return this._configs;
  }

  /**
   * Adds a config to the cache
   */
  public static add(config: TypeConfig|TypeConfig[]) {
    if (Array.isArray(config)) {
      config.forEach(config => this.add(config));
      return;
    }
    this._configs[config.name] = config;
  }

  /**
   * Gets a config from the cache
   */
  public static get(name: string) {
    return this._configs[name];
  }

  /**
   * The schema name
   */
  protected _name: string;

  /**
   * The schema attributes
   */
  protected _attributes: Record<string, Data>;

  /**
   * the column configs
   */
  protected _columns: Column[] = [];

  /**
   * Returns the schema attributes
   */
  get attributes() {
    return this._attributes;
  }

  /**
   * Returns all the columns
   */
  get columns() {
    return this._columns;
  }

  /**
   * Returns all the field columns
   */
  get fields() {
    return this.columns.filter(
      column => column.field.component !== false
    );
  }

  /**
   * Returns all the indexable columns
   */
  get label() {
    const label = this._attributes.label;
    return !Array.isArray(label) 
      ? [ this._name, this._name ] 
      : label as string[];
  }

  /**
   * Returns all the listable columns
   */
  get lists() {
    return this.columns.filter(
      column => column.list.method !== 'hide' && !!typemap.type[column.type]
    );
  }

  /**
   * Returns the schema name
   */
  get name() {
    return this._name;
  }

  /**
   * Returns the camel cased column name
   */
  get nameCamel() {
    return camelize(this._name);
  }

  /**
   * Returns the lower cased column name
   */
  get nameLower() {
    return this._name.toLocaleLowerCase();
  }

  /**
   * Returns the capitalized column name
   */
  get nameTitle() {
    return capitalize(this._name);
  }

  /**
   * Returns the schema plural label
   */
  get plural() {
    const label = this.attributes.label as string[];
    return label[1] || this.name;
  }

  /**
   * Returns the schema singular label
   */
  get singular() {
    const label = this.attributes.label as string[];
    return label[0] || this.name;
  }

  /**
   * Returns all the viewable columns
   */
  get views() {
    return this.columns.filter(
      column => column.view.method !== 'hide' && !!typemap.type[column.type]
    );
  }

  /**
   * Just load the config
   */
  constructor(config: string|TypeConfig) {
    const parent = this.constructor as typeof Type;
    if (typeof config === 'string') {
      const name = config;
      config = parent.get(config) as TypeConfig;
      if (!config) {
        throw Exception.for(`Config "${name}" not found`);
      }
    }
    this._name = config.name;
    this._attributes = config.attributes;
    config.columns.forEach(column => {
      this._columns.push(new Column(this, column));
    });
    parent._configs[config.name] = config;
  }

  /**
   * Returns a column given the name
   */
  column(name: string) {
    return this.columns.find(column => column.name === name);
  }
}