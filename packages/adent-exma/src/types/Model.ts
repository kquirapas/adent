import type { ModelConfig } from 'exma';

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
   * Returns all the path meta data for this model
   */
  get pathmeta(): { model: Model, type: string, name: string, i?: number }[][] {
    //if there are no relations
    if (!this.relations.length) {
      //this model should be a root path
      return [[{
        model: this,
        type: 'model',
        name: this.nameLower
      }]];
    }

    return this.relations.map(column => {
      const relation = column.relation as {
        name: string,
        type: number[],
        model: Model,
        local: string,
        foreign: string
      };
      return relation.model.pathmeta.map(
        meta => meta.concat([{
          model: this,
          //NextJS: You cannot use different slug names for the same dynamic path
          //NextJS: You cannot have the same slug name "id" repeat within a single dynamic path
          //so should be unique ids in each path
          type: 'id',
          name: relation.local
        }, {
          model: this,
          type: 'column',
          name: relation.name
        }])
      );
    }).flat();
  }

  /**
   * Returns a method to generate paths
   */
  get pathset() {
    return this.pathmeta.map(reference => {
      //make sure we are not changing the original array
      let i = 0;
      const paths = Array.from(reference).map(
        path => path.type === 'id' ? { ...path, i: i++ }: { ...path }
      );
      //get the path names
      const names = paths.map(path => path.name);
      //add the ids that are not already in the path
      this.ids.forEach(column => {
        //if the column is not in the path
        if (!names.includes(column.name)) {
          //add it to the clone
          paths.push({
            model: this,
            type: 'id',
            name: column.name,
            i: i++
          });
        }
      });

      return {
        paths: paths,
        generate: (key: string, toString = '[%s]') => {
          const root = reference.map(path => path.type === 'id' 
            ? toString.replace('%s', path.name).replace('%i', (path.i || 0).toString())
            : path.name
          ).join('/');
          const detail = paths.map(path => path.type === 'id' 
            ? toString.replace('%s', path.name).replace('%i', (path.i || 0).toString())
            : path.name
          ).join('/');
          switch (key) {
            case 'create':
              return `${root}/create`;
            case 'detail':
              return detail;
            case 'remove':
              return `${detail}/remove`;
            case 'restore':
              return `${detail}/restore`;
            case 'update':
              return `${detail}/update`;
            case 'root':
            case 'search':
            default:
              return root;
          }
        }
      };
    });
  }

  /**
   * Returns true if the model is restorable
   */
  get restorable() {
    return this.columns.some(column => column.attributes.active === true);
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
   * Returns all the sortable columns
   */
  get spanables() {
    return this.columns.filter(column => column.spanable);
  }

  /**
   * Returns a function to generate a suggested label
   */
  get suggested() {
    const label = this.attributes.label as string[];
    const suggested = label[2] || this.nameLower;
    return (template = '${data.%s}') => Array.from(
      suggested.matchAll(/\[([a-zA-Z0-9_]+)\]/g)
    ).reduce((result, match) => {
      return result.replace(match[0], template.replaceAll('%s', match[1]));
    }, suggested)
  }

  /**
   * Returns all the unique columns
   */
  get uniques() {
    return this.columns.filter(column => column.unique);
  }

  /**
   * Returns the column that will be used to toggle active
   */
  get active() {
    return this.columns.find(column => column.attributes.active === true);
  }

  /**
   * Returns the column that will be stamped when created
   */
  get created() {
    return this.columns.find(column => column.attributes.created === true);
  }

  /**
   * Returns the column that will be stamped when updated
   */
  get updated() {
    return this.columns.find(column => column.attributes.updated === true);
  }

  /**
   * Returns all the models with columns related to this model
   */
  get related() {
    return this._columns.filter(
      column => Object.keys(Model._configs).includes(column.type)
    );
  }

  /**
   * Returns all the columns with relations
   */
  get relations() {
    return this.columns.filter(column => column.relation);
  }
}