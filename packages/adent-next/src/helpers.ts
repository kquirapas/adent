//types
import type { ResponsePayload } from './types';
//helpers
import Exception from './Exception';

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
 * Converts a promise error to an exception.
 * Use this when catching an error from a promise.
 * 
 * Example: `await prisma.create().then(resultsToResponse)`
 */
export function reject(error: Error|string, code = 500) {
  const exception = Exception.for(
    error instanceof Error ? error.message: error
  );
  if (typeof exception.withCode === 'function') {
    exception.withCode(code);
  }
  return Promise.reject(exception);
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'short', day: 'numeric'
});

const time12Format = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric', minute: 'numeric', hour12: true
});

export function toPrettyDatetime(datetime: string|number|Date) {
  const date = datetime instanceof Date? datetime: new Date(datetime);
  return `${dateFormat.format(date)} ${time12Format.format(date)}`;
};

export function toDateLocal(datetime?: string|number|Date) {
  const date = new Date(datetime || new Date);
  const format = {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    hour: String(date.getHours() % 12).padStart(2, '0'),
    min: String(date.getMinutes()).padStart(2, '0')
  };
  return [
    `${format.year}-${format.month}-${format.day}`,
    `${format.hour}:${format.min}`
  ].join('T');
};

export function toPrettyPrice(value: number|string) {
  return toPrettyNumber(value, 2);
};

export function toPrettyNumber(value: number|string, decimals = 0) {
  const formatter = new Intl.NumberFormat('en-US', { 
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  return formatter.format(parseFloat(value.toString())).replace('$', '').trim();
};

export function toShortNumber(value: number) {
  if (value > 1000000000) {
    return `${Math.floor(value * 100 / 1000000000) / 100}B`;
  } else if (value > 1000000) {
    return `${Math.floor(value * 100 / 1000000) / 100}M`;
  } else if (value > 1000) {
    return `${Math.floor(value * 100 / 1000) / 100}K`;
  }
  return toPrettyPrice(value);
};

export function toCapitalize(str: string) {
  // make it sure that the string is in lower case format
  const strToLower = str.toLowerCase();
  // split the sentence into an array of words
  const words = strToLower.split(' ');
  //  loop over the array of words 
  // and capitalize the first letter of each word
  for (let i = 0; i < words.length; i++) {
    words[i] = words[i][0].toUpperCase() + words[i].substr(1);
  }

  return words.join(' ');
};

export function round(value: number, decimals: number) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
};

export function arraySum(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, current) => total + current) || 0;
};

export function unique(value: any, index: number, self: any[]) {
  return self.indexOf(value) === index;
};