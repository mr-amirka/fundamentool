import {
  splitDot, 
} from './split/splitDot';
import {
  NATIVE_PUSH, 
} from './pushArray';
import {
  trimQuote, 
} from './trimQuote';

const REGEXP_BRACKETS = /\[(.*?)\]/g;
const KEY_NEW_ITEM_TOKEN = '[]';

/**
 * Gets a key path from a key.
 * 
 * @param key - The key to get the path from.
 * @returns The key path.
 * Only bracket contents and the leading dot-path are parsed.
 * Text between brackets (e.g. `.name` in `user[0].name`) is NOT captured.
 * @example
 * getKeyPath('user.name') // => ['user', 'name']
 * getKeyPath('user[0]') // => ['user', '0']
 * getKeyPath('user[0][name]') // => ['user', '0', 'name']
 * getKeyPath('user[][1]') // => ['user', '[]', '1']
 * getKeyPath('user..age') // => ['user', '', 'age']
 * getKeyPath('user[name.age]') // => ['user', 'name', 'age']
 * getKeyPath(`user["name.age"]`) // => ['user', 'name', 'age']
 * getKeyPath(`user['name']['age']`) // => ['user', 'name', 'age']
 * getKeyPath(`user[name][age]`) // => ['user', 'name', 'age']
*/
export const getKeyPath = (key: string): string[] => {
  const keySuffixOffset = key.indexOf('[');
  if (keySuffixOffset < 0) {
    return splitDot(key).map(trimQuote);
  }

  const path: string[] = splitDot(key.slice(0, keySuffixOffset));
  let match: RegExpExecArray | null = null;
  let subKey: string;

  for (match of key.slice(keySuffixOffset).matchAll(REGEXP_BRACKETS)) {
    subKey = match[1];
    subKey === ''
      ? path.push(KEY_NEW_ITEM_TOKEN)
      : NATIVE_PUSH.apply(path, splitDot(subKey));
  }

  return path.map(trimQuote);
};