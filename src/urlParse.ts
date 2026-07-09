/**
 * @overview url — разбирает URL в структурированный объект.
 */

import {
  unparam, 
} from './unparam';
import {
  isDefined, 
} from './is/isDefined';
import {
  half, halfLast, 
} from './half';

export type TUrlOptions = {
  hostname: string;
  protocol: string;
  port: string;
  username: string;
  dirname: string;
  alias: string;
  query: any;
  extension: string;
  password: string;
  child?: Partial<TUrlOptions> | null;
};
export type TUrlProps = Omit<TUrlOptions, 'child'> & {
  href: string;
  search: string;
  unhash: string;
  hash: string;
  basePath: string;
  path: string;
  unpath: string;
  host: string;
  port: string;
  unalias: string;
  filename: string;
  unextension: string;
  unsearch: string;
  userpart: string;
  username: string;
  login: string;
  email: string;
  child?: Partial<TUrlProps> | null;
};

/**
 * Parses a URL string into a structured `TUrlProps` object.
 *
 * @param href - The URL string to parse.
 * @returns Parsed URL with `protocol`, `hostname`, `port`, `path`, `query`, `hash`, `child` and more.
 * @example
 * urlParse('https://example.com/api?v=1#section').path; // => '/api'
 * urlParse('https://example.com/api?v=1#section').query; // => { v: '1' }
 */
export const urlParse = (href: string): TUrlProps => {
  href = isDefined(href) ? '' + href : '';
  let parts: string[] = half(href, '#');
  const hash = parts[1];
  const unhash = parts[0];
  let unsearch = (parts = half(unhash, '?'))[0];
  let search = parts[1];

  if (!search && unsearch.indexOf('/') == -1 && unsearch.indexOf('=') > -1) { // eslint-disable-line
    search = unsearch;
    unsearch = '';
  }

  const query = unparam(search);
  const child = hash ? urlParse(hash) : null;
  const protocol = (parts = half(
    unsearch, '://', 1,
  ))[0];
  const basePath = parts[1];

  parts = protocol ? half(basePath, '/') : ['', basePath];

  const path = (parts[2] ? '/' : '') + parts[1];
  const userpart = (parts = half(
    parts[0], '@', true,
  ))[0];
  const userParts = half(userpart, ':');
  const username = userParts[0];
  const password = userParts[1];
  const host = protocol ? parts[1] : '';
  const email = username ? username + '@' + host : '';
  const hostname = protocol ? (parts = half(host, ':'))[0] : '';
  const port = protocol ? parts[1] : '';
  const login = userpart ? userpart + '@' + host : '';
  const unpath = login ? protocol + '://' + login : host ? protocol + '://' + host : '';

  parts = halfLast(
    path, '/', true,
  );
  const dirname = parts[0] + (parts[2] ? '/' : '');
  const filename = parts[1];
  const unalias = unpath + dirname;
  const alias = (parts = halfLast(filename, '.'))[0];
  const unextension = unalias + alias;
  const extension = parts[1];

  return {
    href,
    search,
    unhash,
    hash,
    query,
    protocol,
    basePath,
    path,
    unpath,
    hostname,
    host,
    port,
    unalias,
    dirname,
    filename,
    alias,
    unextension,
    extension,
    unsearch,
    userpart,
    username,
    login,
    password,
    email,
    child,
  };
};
