import {
  param,
} from '../src/param';
import {
  unparam,
  unparamBase,
} from '../src/unparam';

describe('param / unparam', () => {
  test('serializes simple object to query string', () => {
    const q = param({
      a: 1,
      b: 'x',
    });
    expect(q).toBe('a=1&b=x');
  });

  test('serializes arrays with numeric keys', () => {
    const q = param([
      'a',
      'b',
    ]);
    expect(q).toBe('0=a&1=b');
  });

  test('unparam parses simple query string (numbers parsed as numbers)', () => {
    const obj = unparam('?a=1&b=x');
    expect(obj).toEqual({
      a: 1,
      b: 'x',
    });
  });

  test('param + unparam round trip', () => {
    const src = {
      a: 1,
      b: 'x',
      c: {
        d: 2,
      },
    };

    const q = param(src);
    const parsed = unparam('?' + q);

    expect(parsed.a).toBe(1);
    expect(parsed.b).toBe('x');
  });
});

describe('unparam — no query', () => {
  it('\'\', \'?\', a part without a key: an empty object, never undefined; given an output — added to it', () => {
    expect(unparam('')).toEqual({});
    expect(unparam('?')).toEqual({});
    expect(unparam('=5')).toEqual({});
    expect(unparamBase('a=1', {
      b: 2,
    })).toEqual({
      b: 2,
      a: 1,
    });
  });
});

describe('param — not an object', () => {
  it('a value that isn\'t an object has no params: \'\'', () => {
    expect(param(5 as never)).toBe('');
    expect(param(null)).toBe('');
    expect(param('a=1' as never)).toBe('');
  });
});
