import {
  responsibilityChain, 
} from '../src/responsibilityChain';

describe('responsibilityChain', () => {
  test('calls end when chain is empty', () => {
    const result = responsibilityChain(
      [], 'req', (r) => r + '_done',
    );
    expect(result).toBe('req_done');
  });

  test('passes through a single handler', () => {
    const result = responsibilityChain(
      [(req, next) => next(req)],
      'hello',
      (r) => r + '!',
    );
    expect(result).toBe('hello!');
  });

  test('handler can transform request before passing to next', () => {
    const result = responsibilityChain(
      [(req: number, next) => next(req + 1)],
      0,
      (r) => r,
    );
    expect(result).toBe(1);
  });

  test('handler can short-circuit the chain', () => {
    const result = responsibilityChain(
      [(_req, _next) => 'short-circuit', (_req, next) => next(_req)],
      'req',
      (_r) => 'end',
    );
    expect(result).toBe('short-circuit');
  });

  test('multiple handlers are chained in order', () => {
    const log: number[] = [];
    responsibilityChain(
      [
        (req, next) => {
          log.push(1); return next(req); 
        },
        (req, next) => {
          log.push(2); return next(req); 
        },
        (req, next) => {
          log.push(3); return next(req); 
        },
      ],
      null,
      () => {
        log.push(4); 
      },
    );
    expect(log).toEqual([
      1,
      2,
      3,
      4,
    ]);
  });

  test('handler error calls onError and continues chain', () => {
    const errors: unknown[] = [];
    const log: number[] = [];
    const err = new Error('oops');

    responsibilityChain(
      [(_req, _next) => {
        throw err; 
      }, (req, next) => {
        log.push(2); return next(req); 
      }],
      null,
      () => {
        log.push(3); 
      },
      (e) => errors.push(e),
    );

    expect(errors).toEqual([err]);
    expect(log).toEqual([2, 3]);
  });
});
