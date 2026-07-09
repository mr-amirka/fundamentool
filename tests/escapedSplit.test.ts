import {
  escapedSplitProvider, 
} from '../src/escapedSplitProvider';
import {
  escapedHalfProvider, 
} from '../src/escapedHalfProvider';

describe('escapedSplitProvider', () => {
  const split = escapedSplitProvider(',');

  test('splits on separator', () => {
    expect(split('a,b,c')).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('preserves escaped separator', () => {
    expect(split('a\\,b,c')).toEqual(['a,b', 'c']);
  });

  test('handles no separator', () => {
    expect(split('abc')).toEqual(['abc']);
  });

  test('handles empty string', () => {
    expect(split('')).toEqual(['']);
  });

  test('base() does not unescape', () => {
    expect(split.base('a\\,b,c')).toEqual(['a\\,b', 'c']);
  });

  test('collects separators into dstSeparators', () => {
    const seps: string[] = [];
    split.base('a,b,c', seps);
    expect(seps).toEqual([',', ',']);
  });
});

describe('escapedHalfProvider', () => {
  const half = escapedHalfProvider(':');

  test('splits at first separator', () => {
    const [
      prefix,
      suffix,
      value,
    ] = half('key:value');
    expect(prefix).toBe('key');
    expect(suffix).toBe(':value');
    expect(value).toBe('value');
  });

  test('preserves escaped separator in prefix', () => {
    const [prefix] = half('key\\:name:value');
    expect(prefix).toBe('key:name');
  });

  test('returns full string in prefix when no separator', () => {
    const [
      prefix,
      suffix,
      value,
    ] = half('noSeparator');
    expect(prefix).toBe('noSeparator');
    expect(suffix).toBe('');
    expect(value).toBe('');
  });

  test('base() does not unescape', () => {
    const [prefix] = half.base('key\\:name:value');
    expect(prefix).toBe('key\\:name');
  });
});
