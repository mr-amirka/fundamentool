import {
  GLOBAL_CONTEXT, 
} from '../src/globalContext';

describe('globalContext', () => {
  test('is an object', () => {
    expect(typeof GLOBAL_CONTEXT).toBe('object');
  });

  test('has setTimeout', () => {
    expect(typeof GLOBAL_CONTEXT.setTimeout).toBe('function');
  });

  test('has setInterval', () => {
    expect(typeof GLOBAL_CONTEXT.setInterval).toBe('function');
  });

  test('is the same as globalThis in Node.js', () => {
    expect(GLOBAL_CONTEXT).toBe(globalThis);
  });
});
