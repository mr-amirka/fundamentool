import {
  urlParse, TUrlProps, TUrlOptions, 
} from './urlParse';
import {
  param, 
} from './param';
import {
  merge, 
} from './merge';
import {
  isDefined, 
} from './is/isDefined';

function normalize(v: Partial<TUrlProps> | string | null | undefined): Partial<TUrlProps> {
  if (isDefined(v)) {
    switch (typeof v) {
      case 'string':
        return urlParse(v);
      case 'object':
        return v;
    }
  }
  
  return {};
}

export * from './urlParse';

/**
 * Merges two URL descriptors (string or `TUrlProps`) into a single `TUrlProps`.
 *
 * Fields from `_src` override fields from `_first`; query objects are deep-merged.
 *
 * @param _first - Base URL or partial URL object.
 * @param _src - Override URL or partial URL object.
 * @returns Merged `TUrlProps` with a fully reconstructed `href`.
 * @example
 * urlExtend('https://example.com/page', { query: { v: 2 } }).href;
 * // => 'https://example.com/page?v=2'
 */
export const urlExtend = (_first?:
    | (Partial<TUrlOptions> & {
      child?: Partial<TUrlOptions> | null;
    })
    | string
    | null
    | undefined,
_src?:
    | (Partial<TUrlOptions> & {
      child?: Partial<TUrlOptions> | null;
    })
    | string
    | null
    | undefined): TUrlProps => {
  const first = normalize(_first);
  const src = normalize(_src);

  function __def(
    prop: string, def?: any, v?: any,
  ) {
    return ((v = (src as any)[prop]) === undefined ? (first as any)[prop] : v) || def || '';
  }

  const hostname = __def('hostname');
  const protocol = __def('protocol');
  const port = __def('port');
  const username = __def('username');
  const password = __def('password');
  const userpart = username ? username + ':' + password : '';
  const host = hostname || port ? hostname + (port ? ':' + port : '') : '';
  const email = username ? username + '@' + host : '';
  const login = userpart ? userpart + '@' + host : '';
  const unpath = login ? protocol + '://' + login : host ? protocol + '://' + host : '';
  const extension = __def('extension');
  const alias = __def('alias');
  const filename = alias + (extension ? '.' + extension : '');
  const dirname = __def('dirname', filename ? '/' : '');
  const path = dirname + filename;
  const unalias = unpath + dirname;
  const unextension = unalias + alias,
    unsearch = unextension + (extension ? '.' + extension : ''),
    query = merge([first.query, src.query], {}),
    search = param(query);
  const unhash = unsearch + (search ? '?' + search : '');
  const srcChild = src.child,
    firstChild = first.child;
  const child = srcChild || firstChild ? urlExtend(firstChild || {}, srcChild || {}) : 0;
  const hash = child && child.href || ''; // eslint-disable-line
  const href = unhash + (hash ? '#' + hash : '');

  return merge([
    first,
    src,
    {
      href,
      search,
      unhash,
      hash,
      query,
      protocol,
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
      password,
      email,
      login,
      child,
    },
  ]);
};
