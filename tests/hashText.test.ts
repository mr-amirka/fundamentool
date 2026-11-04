import {
  hashText,
} from '../src';

describe('hashText', () => {
  test('the same text gives the same hash', () => {
    expect(hashText('# Plan\n- [ ] the index')).toBe(hashText('# Plan\n- [ ] the index'));
  });

  test.each([
    [
      'a',
      'b',
    ],
    [
      'ab',
      'ba',
    ],
    [
      '',
      ' ',
    ],
    [
      'индексация',
      'индексации',
    ],
  ])('%j and %j differ', (a, b) => {
    expect(hashText(a)).not.toBe(hashText(b));
  });

  test('a seed gives another hash', () => {
    expect(hashText('hello', 1)).not.toBe(hashText('hello'));
  });

  test('base 36, at most 11 characters', () => {
    for (const text of [
      '',
      'hello',
      'x'.repeat(10000),
    ]) {
      expect(hashText(text)).toMatch(/^[0-9a-z]{1,11}$/);
    }
  });

  test('few collisions over many similar texts', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100000; i++) {
      seen.add(hashText(`line ${i}`));
    }
    expect(seen.size).toBe(100000);
  });
});
