import { regexpMapperProvider } from '../src/regexpMapperProvider';

describe('regexpMapperProvider', () => {
  test('returns true and fills dst when regex matches', () => {
    const mapper = regexpMapperProvider(/^([^/]*)\/([^/]*)$/, ['full', 'begin', 'end']);
    const dst: Record<string, string> = {};
    expect(mapper('users/id6574334245', dst)).toBe(true);
    expect(dst.full).toBe('users/id6574334245');
    expect(dst.begin).toBe('users');
    expect(dst.end).toBe('id6574334245');
  });

  test('returns false when no match', () => {
    const mapper = regexpMapperProvider(/^(\d+)$/, ['num']);
    expect(mapper('abc', {})).toBe(false);
  });

  test('works without dst', () => {
    const mapper = regexpMapperProvider(/^x$/, ['a']);
    expect(mapper('x')).toBe(true);
  });
});
