import {
  urlParse,
  TUrlProps,
  TUrlOptions,
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
        return typeof v.path === 'string' ? withPathParts(v) : v;
    }
  }

  return {};
}

/**
 * `path` is what callers write (`{ path, query }`); the path is built from `dirname`, `alias`, `extension` — taken from
 * `path` (it wins over stale parts: `{ ...location, path: '/new' }`). A `path` alone was ignored.
 */
function withPathParts(v: Partial<TUrlProps>): Partial<TUrlProps> {
  const parts = urlParse(v.path as string);
  return {
    ...v,
    dirname: parts.dirname,
    alias: parts.alias,
    extension: parts.extension,
  };
}

export * from './urlParse';

/** A scheme at the start of an address: `https:`, `mailto:`, `file:`. */
const SCHEME = /^[a-z][a-z\d+.-]*:/i;
/** The origin a base without one is read against — only what follows it is taken back. */
const LOCAL_ORIGIN = 'http://url-extend.local';
const SLASH = '/';

/**
 * `ref` read against `base` as a browser reads an `<a href>` (RFC 3986 §5, by the platform's `URL`), for a base with or
 * without a scheme and a host.
 */
function resolveString(base: string, ref: string): string {
  if (SCHEME.test(base)) {
    try {
      return new URL(ref, base).href;
    } catch {
      throw new Error(`urlExtend: can't read "${ref}" against "${base}" — the base isn't an address`);
    }
  }
  if (SCHEME.test(ref) || ref.startsWith('//')) {
    return ref; // its own address: no base needed (and none with a scheme to lend)
  }
  const rooted = !base || base[0] === SLASH;
  const url = new URL(ref, LOCAL_ORIGIN + (rooted ? '' : SLASH) + base);
  const resolved = url.pathname + url.search + url.hash;
  return rooted ? (base ? resolved : resolved.slice(1)) : resolved.slice(1);
}

/**
 * Extends a URL: `_src` over `_first`.
 *
 * - `_src` an object — its fields over `_first`'s; the queries merged.
 * - `_src` a string — read against `_first` as a browser reads an `<a href>` (D-056): `'?x=1'` keeps the path and
 *   replaces the query, `'#/b'` keeps both, `'/c'` keeps the scheme and host, `'c'` / `'../c'` — relative to the
 *   base's directory, `'https://…'` / `'//host/…'` — itself.
 *
 * @param _first - Base URL or partial URL object.
 * @param _src - Override URL object, or an `href` to read against the base.
 * @returns `TUrlProps` with a fully reconstructed `href`.
 * @example
 * urlExtend('https://example.com/page', { query: { v: 2 } }).href; // => 'https://example.com/page?v=2'
 * urlExtend('/a?y=2', '?x=1').href;                                  // => '/a?x=1'
 * urlExtend('https://example.com/docs/guide', '../api').href;        // => 'https://example.com/api'
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
  if (typeof _src === 'string') {
    const base = typeof _first === 'string' ? _first : urlExtend(_first, null).href;
    return urlParse(resolveString(base, _src));
  }
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
  const userpart = username ? username + (password ? ':' + password : '') : ''; // no password — no ':'
  const host = hostname || port ? hostname + (port ? ':' + port : '') : '';
  const email = username ? username + '@' + hostname : ''; // an address has no port
  const login = userpart ? userpart + '@' + host : '';
  const unpath = login ? protocol + '://' + login : host ? protocol + '://' + host : '';
  const extension = __def('extension');
  const alias = __def('alias');
  const filename = alias + (extension ? '.' + extension : '');
  const dirname = __def('dirname', filename ? SLASH : '');
  const path = dirname + filename;
  const unalias = unpath + dirname;
  const unextension = unalias + alias,
    unsearch = unextension + (extension ? '.' + extension : ''),
    query = merge([
      first.query,
      src.query,
    ], {}),
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
