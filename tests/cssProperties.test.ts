import { cssPropertiesParseSimple } from '../src/cssPropertiesParseSimple';
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
});

