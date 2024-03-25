import type { ModelConfig } from 'exma';
import type Column from './Column';

import Type from './Type';

export default class Model extends Type {
  /**
   * A cached list of all schemas
   */
  protected static _configs: Record<string, ModelConfig> = {};

  /**
   * Returns all the configs
   */
  public static get configs() {
    return this._configs;
  }

  /**
   * Adds a config to the cache
   */
  public static add(config: ModelConfig|ModelConfig[]) {
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
   * Returns all the columns
   */
  get columns() {
    return this._columns;
  }

  /**
   * Returns all the filterable columns
   */
  get filterables() {
    return this.columns.filter(column => column.filterable);
  }

  /**
   * Returns all the id columns
   */
  get ids() {
    return this.columns.filter(column => column.id);
  }

  /**
   * Returns all the indexable columns
   */
  get indexables() {
    return this.columns.filter(column => column.indexable);
  }

  /**
   * Returns true if the model is restorable
   */
  get restorable() {
    //look for an active column
    return this.columns.some(
      column => column.name === 'active' &&  ['boolean', 'bool'].includes(
        column.type.toLowerCase()
      )
    );
  }

  /**
   * Returns all the searchable columns
   */
  get searchables() {
    return this.columns.filter(column => column.searchable);
  }

  /**
   * Returns all the sortable columns
   */
  get sortables() {
    return this.columns.filter(column => column.sortable);
  }

  /**
   * Returns all the unique columns
   */
  get uniques() {
    return this.columns.filter(column => column.unique);
  }

  /**
   * Returns all the models with columns related to this model
   */
  get related() {
    const related: Record<string, { 
      model: ModelConfig, 
      column: Column 
    }> = {};
    Object.keys(Model.configs).forEach(name => {
      const model = new Model(name);
      model.relations.forEach(column => {
        const relation = column.relation;
        if (relation && relation.model === this.name) {
          related[name] = { model: Model._configs[model.name], column };
        }
      });
    });
    return related;
  }

  /**
   * Returns all the columns with relations
   */
  get relations() {
    return this.columns.filter(column => column.relation);
  }  
}