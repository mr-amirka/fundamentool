import { getByType } from '../src/getByType';

describe('getByType', () => {
  test('maps args to named keys by typeof', () => {
    // typesMap key = typeof string, value = array of output key names
    const result = getByType(['hello', 42], { string: ['s'], number: ['n'] });
    expect(result).toEqual({ s: 'hello', n: 42 });
  });

  test('assigns consecutive same-type args to ordered output keys', () => {
    // two numbers → first gets 'first', second gets 'second'
    const result = getByType([1, 2], { number: ['first', 'second'] });
    expect(result).toEqual({ first: 1, second: 2 });
  });

  test('ignores args whose typeof has no mapping', () => {
    const result = getByType([true, 'hello'], { string: ['s'] });
    expect(result).toEqual({ s: 'hello' });
  });

  test('writes into provided dst', () => {
    const dst: Record<string, any> = { existing: 'yes' };
    getByType(['hello'], { string: ['str'] }, dst);
    expect(dst).toEqual({ existing: 'yes', str: 'hello' });
  });

  test('returns empty object for empty args', () => {
    expect(getByType([], { string: ['s'] })).toEqual({});
  });
});
