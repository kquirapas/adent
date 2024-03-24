//types
import type { ResponsePayload } from './types';
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