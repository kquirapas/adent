import Exception from './Exception';

/**
 * Hash easily manipulates object data
 */
export default class Hash {
  /**
   * Parser for terminal args
   */
  public withArgs: Args;

  /**
   * Parser for multipart/form-data
   */
  public withFormData: FormData;

  /**
   * Parser for path notations
   */
  public withPath: Path;

  /**
   * Parser for query string
   */
  public withQuery: Query;

  /**
   * The raw data
   */
  protected _data: Record<string, any>;

  /**
   * Returns the raw data
   */
  get data(): Record<string, any> {
    return this._data;
  }

  /**
   * Returns the length
   */
  get length(): number {
    return Object.keys(this._data).length;
  }

  /**
   * Safely sets the data
   */
  set data(data: Record<string, any>) {
    Exception.require(
      data?.constructor === Object, 
      'Argument 1 expected Object'
    );
    this._data = data;
  }

  /**
   * Sets the initial data
   */
  constructor(data: Record<string, any> = {}) {
    this._data = data;
    this.withArgs = new Args(this);
    this.withFormData = new FormData(this);
    this.withPath = new Path(this);
    this.withQuery = new Query(this);
  }

  /**
   * Loops though the data of a specified path
   */
  async each(...path: any[]): Promise<boolean> {
    const callback = path.pop() as Function;
    let list = this.get(...path);

    if (!list
      || Array.isArray(list) && !list.length
      || typeof list === 'string' && !list.length
      || typeof list === 'object' && !Object.keys(list).length
    ) {
      return false;
    }

    for(let key in list) {
      if ((await callback(list[key], key)) === false) {
        return false;
      }
    }

    return true;
  }

  /**
   * Retrieves the data hashd specified by the path
   */
  get<T = any>(...path: Index[]): Record<string, any>|T|undefined {
    if (!path.length) {
      return this._data;
    }

    if (!this.has(...path)) {
      return undefined;
    }

    const last = path.pop() as Index;
    let pointer = this._data;

    path.forEach(step => pointer = pointer[step]);

    return pointer[last] as T;
  }

  /**
   * Returns true if the specified path exists
   */
  has(...path: Index[]): boolean {
    if (!path.length) {
      return false;
    }

    let found = true;
    const last = path.pop() as Index;
    let pointer = this._data;

    path.forEach(step => {
      if (!found) {
        return;
      }

      if (typeof pointer[step] !== 'object') {
        found = false;
        return;
      }

      pointer = pointer[step];
    });

    return !(!found || typeof pointer[last] === 'undefined');
  }

  /**
   * Removes the data from a specified path
   */
  remove(...path: Index[]): Hash {
    if (!path.length) {
      return this;
    }

    if (!this.has(...path)) {
      return this;
    }

    const last = path.pop() as Index;
    let pointer = this._data;

    path.forEach(step => {
      pointer = pointer[step];
    })

    delete pointer[last];

    return this;
  }

  /**
   * Sets the data of a specified path
   */
  set(...path: any[]): Hash {
    if (path.length < 1) {
      return this;
    }

    if (typeof path[0] === 'object') {
      Object.keys(path[0]).forEach(key => {
        this.set(key, path[0][key]);
      });

      return this;
    }

    const value = path.pop();
    let last = path.pop(), pointer = this._data;

    path.forEach((step, i) => {
      if (step === null || step === '') {
        path[i] = step = Object.keys(pointer).length;
      }

      if (typeof pointer[step] !== 'object') {
        pointer[step] = {};
      }

      pointer = pointer[step];
    });

    if (last === null || last === '') {
      last = Object.keys(pointer).length;
    }

    pointer[last] = value;

    //loop through the steps one more time fixing the objects
    pointer = this._data;
    path.forEach((step) => {
      const next = pointer[step]
      //if next is not an array and next should be an array
      if (!Array.isArray(next) && shouldBeAnArray(next)) {
        //transform next into an array
        pointer[step] = makeArray(next);
      //if next is an array and next should not be an array
      } else if (Array.isArray(next) && !shouldBeAnArray(next)) {
        //transform next into an object
        pointer[step] = makeObject(next);
      }

      pointer = pointer[step];
    });

    return this;
  }
}

export class File {
  public data: Buffer|string;
  public name: string;
  public type: string;

  constructor(file: FileType) {
    this.data = file.data;
    this.name = file.name;
    this.type = file.type;
  }
}

class Args {
  /**
   * The main hash
   */
  public hash: Hash;

  /**
   * Sets the hash 
   */
  constructor(hash: Hash) {
    this.hash = hash;
  }

  /**
   * Creates the name space given the space
   * and sets the value to that name space
   */
  set(...path: any[]): Hash {
    if (path.length < 1) {
      return this.hash;
    }

    let skip = path.pop();
    if (typeof skip !== 'number') {
      path.push(skip);
      skip = 0;
    }

    let args = path.pop();
    if (typeof args === 'string') {
      args = args.split(' ');
    }

    let key, index = 0, i = skip, j = args.length;
    for (; i < j; i++) {
      const arg = args[i];
      const equalPosition = arg.indexOf('=');
      // --foo --bar=baz
      if (arg.substr(0, 2) === '--') { 
        // --foo --foo baz
        if (equalPosition === -1) {
          key = arg.substr(2);
          // --foo value
          if ((i + 1) < j && args[i + 1][0] !== '-') {
            this._format(path, key, args[i + 1]);
            i++;
            continue;
          }
          // --foo
          this._format(path, key, true);
          continue;
        }

        // --bar=baz
        this._format(
          path,
          arg.substr(2, equalPosition - 2), 
          arg.substr(equalPosition + 1)
        );
        continue;
      } 

      // -k=value -abc
      if (arg.substr(0, 1) === '-') {
        // -k=value
        if (arg.substr(2, 1) === '=') {
          this._format(path, arg.substr(1, 1), arg.substr(3));
          continue;
        }

        // -abc
        const chars = arg.substr(1);
        for (let k = 0; k < chars.length; k++) {
          key = chars[k];
          this._format(path, key, true);
        }

        // -a value1 -abc value2
        if ((i + 1) < j && args[i + 1][0] !== '-') {
          this._format(path, key, args[i + 1], true);
          i++;
        }

        continue;
      }

      if (equalPosition !== -1) {
        this._format(
          path,
          arg.substr(0, equalPosition), 
          arg.substr(equalPosition + 1)
        );
        continue;
      }

      if (arg.length) {
        // plain-arg
        this._format(path, index++, arg);
      }
    }
    
    return this.hash;
  }

  /**
   * Determines whether to set or push 
   * formatted values to the hash
   */
  protected _format(
    path: Index[], 
    key: Index, 
    value: any, 
    override?: boolean
  ): Hash {
    //parse value
    switch (true) {
      case typeof value !== 'string':
        break;
      case value === 'true':
        value = true;
        break;
      case value === 'false':
        value = false;
        break;
      case !isNaN(value) && !isNaN(parseFloat(value)):
        value = parseFloat(value);
        break;
      case !isNaN(value) && !isNaN(parseInt(value)):
        value = parseInt(value);
        break;
    }

    if (path.length) {
      key = path.join('.') + '.' + key;
    }

    key = String(key);

    const withPath = this.hash.withPath;

    //if it's not set yet
    if (!withPath.has(key) || override) {
      //just set it
      withPath.set(key, value);
      return this.hash;
    }

    //it is set
    const current = withPath.get(key);
    //if it's not an array
    if (!Array.isArray(current)) {
      //make it into an array
      withPath.set(key, [current, value]);
      return this.hash;
    }

    //push the value
    current.push(value);
    withPath.set(key, current);
    return this.hash;
  }
}

class Path {
  /**
   * The main hash
   */
  public hash: Hash;

  /**
   * Sets the hash 
   */
  constructor(hash: Hash) {
    this.hash = hash;
  }

  /**
   * Gets a value given the path in the hash.
   */
  async each(
    notation: string, 
    callback: Function, 
    separator: string = '.'
  ): Promise<boolean> {
    const path = notation.split(separator);
    return await this.hash.each(...path, callback);
  }

  /**
   * Gets a value given the path in the hash.
   */
  get(notation: string, separator: string = '.'): any {
    const path = notation.split(separator);
    return this.hash.get(...path);
  }

  /**
   * Checks to see if a key is set
   */
  has(notation: string, separator: string = '.'): boolean {
    const path = notation.split(separator);
    return this.hash.has(...path);
  }

  /**
   * Removes name space given notation
   */
  remove(notation: string, separator: string = '.'): Hash {
    const path = notation.split(separator);
    return this.hash.remove(...path);
  }

  /**
   * Creates the name space given the space
   * and sets the value to that name space
   */
  set(notation: string, value: any, separator: string = '.'): Hash {
    const path = notation.split(separator);
    return this.hash.set(...path, value);
  }
}

class Query {
  /**
   * The main hash
   */
  public hash: Hash;

  /**
   * Sets the hash 
   */
  constructor(hash: Hash) {
    this.hash = hash;
  }

  /**
   * Creates the name space given the space
   * and sets the value to that name space
   */
  set(...path: any[]): Hash {
    if (path.length < 1) {
      return this.hash;
    }

    const query = path.pop();

    const separator = '~~' + Math.floor(Math.random() * 10000) + '~~';
    query.split(/\&/gi).forEach((filter: any) => {
      //key eg. foo[bar][][baz]
      const [key, value] = filter.split('=', 2);
      //change path to N notation
      const keys = key
        .replace(/\]\[/g, separator)
        .replace('[', separator)
        .replace(/\[/g, '')
        .replace(/\]/g, '')
        .split(separator);

      keys.map((key: any) => {
        const index = parseInt(key);
        //if its a possible integer
        if (!isNaN(index) && key.indexOf('.') === -1) {
          return index;
        }

        return key;
      })

      const paths = path.concat(keys);

      if (/(^\{.*\}$)|(^\[.*\]$)/.test(value)) {
        try {
          return query.set(...paths, JSON.parse(value));
        } catch(e) {}
      }

      if (!isNaN(parseFloat(value))) {
        this.hash.set(...paths, parseFloat(value));
      } else if (value === 'true') {
        this.hash.set(...paths, true);
      } else if (value === 'false') {
        this.hash.set(...paths, false);
      } else if (value === 'null') {
        this.hash.set(...paths, null);
      } else {
        this.hash.set(...paths, value);
      }
    });

    return this.hash;
  }
}

class FormData {
  /**
   * The main hash
   */
  public hash: Hash;

  /**
   * Sets the hash 
   */
  constructor(hash: Hash) {
    this.hash = hash;
  }

  set(...path: any[]): Hash {
    if (path.length < 1) {
      return this.hash;
    }

    const formData = path.pop();
    const formDataBuffer = typeof formData === 'string' 
      ? Buffer.from(formData)
      : formData;
    const boundary = this._getBoundary(formDataBuffer);
    let part: Buffer[] = [];
    
    for (let i = 0; i < formDataBuffer.length; i++) {
      //get line
      const line = this._getLine(formDataBuffer, i);
      //if no line
      if (line === null) {
        //we are done
        break;
      }
      //get the line buffer
      const buffer = line.buffer;
      if (buffer.toString().indexOf(boundary) === 0) {
        if (part.length) {
          this._setPart(path, this._getPart(part));
        }
        //if it's the last boundary
        if (buffer.toString() === `${boundary}--`) {
          break;
        }
        part = [];
      } else {
        part.push(buffer);
      }

      i = line.i;
    }

    return this.hash;
  }

  protected _getBoundary(buffer: Buffer): string|null {
    const boundary = this._getLine(buffer, 0)?.buffer;
    if (!boundary) {
      return null;
    }
    return boundary.slice(0, boundary.length - 1).toString();
  }

  protected _getLine(buffer: Buffer, i: number): Record<string, any>|null {
    const line: number[] = [];
    for (; i < buffer.length; i++) {
      const current = buffer[i];
      line.push(current);

      if (current === 0x0a || current === 0x0d) {
        return { i, buffer: Buffer.from(line) };
      }
    }

    if (line.length) {
      return { i, buffer: Buffer.from(line) };
    }

    return null;    
  }

  protected _getPart(lines: Buffer[]): Record<string, any> {
    const headerLines: (string|undefined)[] = [];
    do { //get the header lines
      headerLines.push(lines.shift()?.toString());
    } while(lines.length 
      && !(lines[0].length === 1 
        && (lines[0][0] === 0x0a 
          || lines[0][0] === 0x0d
        )
      )
    );
    //we need to trim the \n from the last line
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.slice(0, last.length - 1);
    //the rest of the lines is the body
    const body = Buffer.concat(lines.slice(1));
    //parse headers
    const headers: Record<string, string> = {};
    //for each header line
    for (const line of headerLines) {
      //if the line has a `:`
      if (line && line.indexOf(':') !== -1) {
        //then we can split it
        const [ key, value ] = line.toString().split(':', 2);
        //now set it to headers
        headers[key.trim().toLowerCase()] = value.trim();
      }
    }
    //extract the form data from content-disposition
    const form: Record<string, any> = {};
    if (typeof headers['content-disposition'] === 'string') {
      headers['content-disposition'].split(';').forEach(disposition => {
        const matches = disposition
          .trim()
          .match(/^([a-zA-Z0-9_\-]+)=["']([^"']+)["']$/);
        
        if (matches && matches.length > 2) {
          form[matches[1]] = matches[2];
        }
      });
    }
    
    return { headers, body, form };
  }

  protected _setPart(path: string[], part: Record<string, any>) {
    if (!part.form.name) {
      return this;
    }
    
    //change path to N notation
    const separator = '~~' + Math.floor(Math.random() * 10000) + '~~';
    const keys = part.form.name
      .replace(/\]\[/g, separator)
      .replace('[', separator)
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .split(separator);

    keys.map((key: any) => {
      const index = parseInt(key);
      //if its a possible integer
      if (!isNaN(index) && key.indexOf('.') === -1) {
        return index;
      }

      return key;
    });

    //get hash paths
    const paths = path.concat(keys);
    //if there is not a filename
    if (!part.form.filename) {
      const value = part.body.toString();
      //try parsing JSON
      if (/(^\{.*\}$)|(^\[.*\]$)/.test(value)) {
        try {
          return this.hash.set(...paths, JSON.parse(value));
        } catch(e) {}
      }

      //try parsing float
      if (!isNaN(parseFloat(value))) {
        this.hash.set(...paths, parseFloat(value));
      //try parsing true
      } else if (value === 'true') {
        this.hash.set(...paths, true);
      //try parsing false
      } else if (value === 'false') {
        this.hash.set(...paths, false);
      //try parsing null
      } else if (value === 'null') {
        this.hash.set(...paths, null);
      } else {
        this.hash.set(...paths, value);
      }
      return this;
    }
    //if we are here it's a filename
    this.hash.set(...paths, new File({
      data: part.body,
      name: part.form.filename,
      type: part.headers['content-type']
    }));
  }
}

/**
 * Transforms an object into an array
 */
function makeArray(object: Record<string, any>): any[] {
  const array: any[] = [];
  const keys = Object.keys(object);
  
  keys.sort();
  
  keys.forEach(function(key) {
    array.push(object[key]);
  })

  return array;
}

/**
 * Transforms an array into an object
 */
function makeObject(array: any[]): Record<string, any> {
  return Object.assign({}, array);
}

/**
 * Returns true if object keys is all numbers
 */
function shouldBeAnArray(object: Record<string, any>): boolean {
  if (typeof object !== 'object') {
    return false;
  }

  const length = Object.keys(object).length

  if (!length) {
    return false;
  }

  for (let i = 0; i < length; i++) {
    if (typeof object[i] === 'undefined') {
      return false;
    }
  }

  return true;
}

//types
export interface NestedObject<T = any> {
  [key: string]: T|NestedObject<T>;
};
export type Scalar = string|number|boolean|null;
export type ScalarHash = NestedObject<Scalar>;
export type ScalarInput = Scalar|Scalar[]|ScalarHash;
export type Index = string|number;
export type FileType = {
  data: Buffer|string;
  name: string;
  type: string;
}