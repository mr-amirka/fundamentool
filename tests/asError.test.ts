import {
  asError,
} from '../src/asError';

describe('asError', () => {
  test('an Error — the same object', () => {
    const error = new TypeError('x');
    expect(asError(error)).toBe(error);
  });

  test.each([
    [
      'timeout',
      'timeout',
    ],
    [
      404,
      '404',
    ],
    [
      undefined,
      'undefined',
    ],
    [
      {
        code: 1,
      },
      '[object Object]',
    ],
  ])('%j → an Error with %j', (value, message) => {
    const error = asError(value);
    expect([
      error instanceof Error,
      error.message,
    ]).toEqual([
      true,
      message,
    ]);
  });
});
