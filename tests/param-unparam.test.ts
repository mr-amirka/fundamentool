import { param } from '../src/param';
import { unparam } from '../src/unparam';

describe('param / unparam', () => {
  test('serializes simple object to query string', () => {
    const q = param({ a: 1, b: 'x' });
    expect(q).toBe('a=1&b=x');
  });

  test('serializes arrays with numeric keys', () => {
    const q = param(['a', 'b']);
    expect(q).toBe('0=a&1=b');
  });

  test('unparam parses simple query string (numbers parsed as numbers)', () => {
    const obj = unparam('?a=1&b=x');
    expect(obj).toEqual({ a: 1, b: 'x' });
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
