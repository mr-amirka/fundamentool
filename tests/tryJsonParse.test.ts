import {
  tryJsonParse, 
} from '../src/tryJsonParse';

describe('tryJsonParse', () => {
  test('parses valid JSON string', () => {
    expect(tryJsonParse('{"a":1}')).toEqual({
      a: 1, 
    });
    expect(tryJsonParse('[1,2,3]')).toEqual([
      1,
      2,
      3,
    ]);
    expect(tryJsonParse('"hello"')).toBe('hello');
    expect(tryJsonParse('42')).toBe(42);
    expect(tryJsonParse('true')).toBe(true);
  });

  test('returns original value on parse error', () => {
    const invalid = 'not json';
    expect(tryJsonParse(invalid)).toBe(invalid);
    expect(tryJsonParse('')).toBe('');
  });
});
