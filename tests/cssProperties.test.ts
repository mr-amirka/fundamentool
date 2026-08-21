import {
  cssPropertiesParseSimple, 
} from '../src/cssPropertiesParseSimple';
import {
  cssPropertiesStringifyProvider,
  TCssProps,
} from '../src/cssPropertiesStringifyProvider';

describe('cssProperties* helpers', () => {
  test('cssPropertiesParseSimple parses simple css string', () => {
    const css = 'color: red; font-size: 12px;';
    const result = cssPropertiesParseSimple(css);

    expect(result.color).toEqual(['red']);
    expect(result.fontSize).toEqual(['12px']);
  });

  test('cssPropertiesStringifyProvider stringifies props', () => {
    const stringify = cssPropertiesStringifyProvider();
    const props: TCssProps = {
      color: 'red',
      fontSize: ['12px', '14px'],
    };

    const s = stringify(props);
    expect(s).toContain('color:red');
    expect(s).toContain('font-size:12px');
    expect(s).toContain('font-size:14px');
  });

  test('vendor-префиксы: per-property кастомная карта (объект)', () => {
    const stringify = cssPropertiesStringifyProvider({
      appearance: {
        '-webkit-': true, 
      },
    }, {
      '-webkit-': true,
      '-moz-': true, 
    });

    const s = stringify({
      appearance: 'none', 
    });
    expect(s).toContain('-webkit-appearance:none');
    expect(s).not.toContain('-moz-appearance');
    expect(s).toContain('appearance:none');
  });

  test('vendor-префиксы: буквальный true использует общий prefixes', () => {
    const stringify = cssPropertiesStringifyProvider({
      transform: true,
    }, {
      '-webkit-': true,
      '-moz-': true, 
    });

    const s = stringify({
      transform: 'scale(1)', 
    });
    expect(s).toContain('-webkit-transform:scale(1)');
    expect(s).toContain('-moz-transform:scale(1)');
    expect(s).toContain('transform:scale(1)');
  });

  test('вендор-префиксы: числовая 1 (идиома flags()) тоже использует общий prefixes — регрессия', () => {
    // flags(['transform'], prefixedAttrs) пишет числовую 1, не булев true —
    // строгая проверка `=== true` эту форму не ловила (см. cssPropertiesStringifyProvider.ts).
    const stringify = cssPropertiesStringifyProvider({
      transform: 1,
    }, {
      '-webkit-': true,
      '-moz-': true, 
    });

    const s = stringify({
      transform: 'scale(1)', 
    });
    expect(s).toContain('-webkit-transform:scale(1)');
    expect(s).toContain('-moz-transform:scale(1)');
    expect(s).toContain('transform:scale(1)');
  });
});

