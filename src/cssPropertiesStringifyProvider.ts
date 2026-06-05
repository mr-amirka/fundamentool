import { camelToKebabCase } from './camelToKebabCase';
import { push } from './push';

export type TPrefixedAttrs = Record<string, Record<string, boolean> | boolean>;
export type TPrefixes = Record<string, boolean>;
export type TCssProps = Record<string, string | string[]>;

export interface IStringifyCss {
  (props: TCssProps, important?: boolean): string;
  prefixedAttrs: TPrefixedAttrs;
  prefixes: TPrefixes;
}


/**
 * Factory function to serialize CSS properties to a string.
 * 
 * @param prefixedAttrs - The prefixed attributes.
 * @param prefixes - The prefixes.
 * @returns The function to serialize CSS properties to a string.
 * @example
 * const stringify = cssPropertiesStringifyProvider();
 * stringify({ color: 'red', fontSize: '12px' }); // => 'color:red;font-size:12px'
 * stringify({ color: 'red' }, true);              // => 'color:red!important'
 */
export const cssPropertiesStringifyProvider = (
  prefixedAttrs: TPrefixedAttrs = {},
  prefixes: TPrefixes = {},
): IStringifyCss => {

  /**
   * Serializes CSS properties to a string.
   * 
   * @param props - The CSS properties to serialize.
   * @param important - Whether to add !important to the properties.
   * @returns The serialized CSS properties.
   */
  const stringify: IStringifyCss = (props: TCssProps, important?: boolean): string => {
    const suffix = important ? '!important' : '';
    const output: string[] = [];
    let vs: string | string[];
    let vl: number;
    let vi: number;
    let prop: string;
    let prefix: string;
    let propPrefix: string;
    let propertyName: string;
    let localPrefixes: Record<string, boolean> | boolean | undefined;

    // eslint-disable-next-line guard-for-in
    for (propertyName in props) {
      propPrefix =
        ((propertyName[0] === '-' && propertyName[1] === '-')
          ? propertyName
          : camelToKebabCase(propertyName))
        + ':';

      vs = props[propertyName];
      const values = Array.isArray(vs) ? vs : [vs];
      vi = 0;
      vl = values.length;

      localPrefixes = prefixedAttrs[propertyName];
      if (localPrefixes) {
        if (localPrefixes === true) {
          localPrefixes = prefixes;
        }
        for (; vi < vl; vi++) {
          prop = propPrefix + values[vi] + suffix;
          // eslint-disable-next-line guard-for-in
          for (prefix in localPrefixes as Record<string, boolean>) {
            push(output, prefix + prop);
          }
          push(output, prop);
        }
        continue;
      }

      for (; vi < vl; vi++) {
        push(output, propPrefix + values[vi] + suffix);
      }
    }

    return output.join(';');
  };

  /**
   * The prefixed attributes.
   */
  stringify.prefixedAttrs = prefixedAttrs;
  /**
   * The prefixes.
   */
  stringify.prefixes = prefixes;

  return stringify;
};

