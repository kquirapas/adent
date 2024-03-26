//types
import type { ResponsePayload } from '../types';
//helpers
import Exception from '../Exception';

/**
 * Wraps any errors or exceptions in a reponse payload. 
 * This is for prisma, instead of throwing errors
 * 
 * Example: `const response = errorToResponse(e)`
 * Example: `await prisma.create().catch(errorToResponse)`
 */
export function toErrorResponse(e: Error|Exception, code = 400): ResponsePayload {
  if (e.constructor.name === 'Exception') {
    const exception = e as Exception;
    return exception.toResponse();
  }
  let message = e.message;
  const payload: ResponsePayload = { error: true, code, message };
  if (e instanceof Exception) {
    payload.errors = e.errors;
  }
  return payload;
};

/**
 * Wraps any results in a reponse payload. 
 * This is for prisma, instead of throwing errors
 * 
 * Example: `await prisma.create().then(resultsToResponse)`
 */
export function toResponse(results: any, total?: number): ResponsePayload {
  if (typeof total === 'number') {
    return { error: false, code: 200, results, total: total as number };
  }
  return { error: false, code: 200, results };
};

/**
 * Formats an inputted value to an acceptable SQL string
 */
export function toSqlString<
  Strict = string|null|undefined
>(value: any, strict = false): Strict {
  if (typeof value === 'undefined') {
    return (strict ? '': undefined) as Strict;
  } else if (value === null) {
    return (strict ? '': null) as Strict;
  } else if (typeof value === 'object') {
    return JSON.stringify(value) as Strict;
  }
  return value.toString() as Strict;
}

/**
 * Formats an inputted value to an acceptable SQL boolean
 */
export function toSqlBoolean<
  Strict = boolean|null|undefined
>(value: any, strict = false): Strict {
  if (typeof value === 'undefined') {
    return (strict ? false: undefined) as Strict;
  } else if (value === null) {
    return (strict ? false: null) as Strict;
  }
  return Boolean(value) as Strict;
}

/**
 * Formats an inputted value to an acceptable SQL date string
 */
export function toSqlDate<
  Strict = string|null|undefined
>(value: any, strict = false): Strict {
  if (!strict) {
    if (typeof value === 'undefined') {
      return undefined as Strict;
    } else if (value === null) {
      return null as Strict;
    }
  }
  
  let date = value instanceof Date? value: new Date(value);
  //if invalid date
  if (isNaN(date.getTime())) {
    //soft error
    date = new Date(0);
  }

  const format = {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    hour: String(date.getHours() % 12).padStart(2, '0'),
    min: String(date.getMinutes()).padStart(2, '0'),
    sec: String(date.getSeconds()).padStart(2, '0')
  };
  return [
    `${format.year}-${format.month}-${format.day}`,
    `${format.hour}:${format.min}:${format.sec}`
  ].join(' ') as Strict;
}

/**
 * Formats an inputted value to an acceptable SQL integer
 */
export function toSqlInteger<
  Strict = number|null|undefined
>(value: any, strict = false): Strict {
  if (typeof value === 'undefined') {
    return (strict ? 0: undefined) as Strict;
  } else if (value === null) {
    return (strict ? 0: null) as Strict;
  }
  return (parseInt(value) || 0) as Strict;
}

/**
 * Formats an inputted value to an acceptable SQL float
 */
export function toSqlFloat<
  Strict = number|null|undefined
>(value: any, strict = false): Strict {
  if (typeof value === 'undefined') {
    return (strict ? 0: undefined) as Strict;
  } else if (value === null) {
    return (strict ? 0: null) as Strict;
  }
  return (parseFloat(value) || 0) as Strict;
}

