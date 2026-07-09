import {
  forInOwn, 
} from '../src/forInOwn';

describe('forInOwn', () => {
  test('iterates over own enumerable properties', () => {
    const result: string[] = [];
    forInOwn({
      a: 1,
      b: 2, 
    }, (v, k) => result.push(k));
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  test('skips inherited properties', () => {
    const parent = {
      inherited: 1, 
    };
    const child = Object.create(parent);
    child.own = 2;
    const keys: string[] = [];
    forInOwn(child, (v, k) => keys.push(k));
    expect(keys).toContain('own');
    expect(keys).not.toContain('inherited');
  });

  test('does not iterate over empty object', () => {
    const fn = jest.fn();
    forInOwn({}, fn);
    expect(fn).not.toHaveBeenCalled();
  });
});
