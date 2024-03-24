import type { Scalar } from 'exma';

export default class Enum {
  /**
   * A cached list of all schemas
   */
  protected static _configs: Record<string, Record<string, Scalar>> = {};

  /**
   * Returns all the configs
   */
  public static get configs() {
    return this._configs;
  }

  /**
   * Adds a config to the cache
   */
  public static add(name: string, config: Record<string, Scalar>) {
    this._configs[name] = config;
  }

  /**
   * Gets a config from the cache
   */
  public static get(name: string) {
    return this._configs[name];
  }
}