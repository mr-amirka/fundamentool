import {
  forEach, 
} from '../src/forEach';
import {
  forIn, 
} from '../src/forIn';
import {
  forInOwn, 
} from '../src/forInOwn';
import {
  each, 
} from '../src/each';

describe('forEach', () => {
  test('calls iteratee for each element', () => {
    const result: number[] = [];
    forEach([
      1,
      2,
      3,
    ], (v) => result.push(v));
    expect(result).toEqual([
      1,
      2,
      3,
    ]);
  });

  test('passes index and collection', () => {
    const calls: any[] = [];
    forEach(['a'], (
      v, i, c,
    ) => calls.push([
      v,
      i,
      c,
    ]));
    expect(calls).toEqual([[
      'a',
      0,
      ['a'],
    ]]);
  });

  test('does nothing for empty array', () => {
    const result: any[] = [];
    forEach([], (v) => result.push(v));
    expect(result).toEqual([]);
  });
});

describe('forIn', () => {
  test('calls iteratee for each property', () => {
    const result: string[] = [];
    forIn({
      a: 1,
      b: 2, 
    }, (v, k) => result.push(k + '=' + v));
    expect(result.sort()).toEqual(['a=1', 'b=2']);
  });

  test('passes value, key, collection', () => {
    const calls: any[] = [];
    forIn({
      x: 42, 
    }, (
      v, k, c,
    ) => calls.push([
      v,
      k,
      c,
    ]));
    expect(calls).toEqual([[
      42,
      'x',
      {
        x: 42, 
      },
    ]]);
  });
});

describe('forInOwn', () => {
  test('iterates only own properties', () => {
    const proto = {
      inherited: 1, 
    };
    const obj = Object.create(proto);
    obj.own = 2;
    const keys: string[] = [];
    forInOwn(obj, (v, k) => keys.push(k));
    expect(keys).toEqual(['own']);
  });
});

describe('each', () => {
  test('iterates array with forEach semantics', () => {
    const result: number[] = [];
    each([
      10,
      20,
      30,
    ], (v) => result.push(v));
    expect(result).toEqual([
      10,
      20,
      30,
    ]);
  });

  test('iterates object with forIn semantics', () => {
    const result: string[] = [];
    each({
      a: 1,
      b: 2, 
    }, (v, k) => result.push(String(k)));
    expect(result.sort()).toEqual(['a', 'b']);
  });
});
