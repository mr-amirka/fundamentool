// The router's names and defaults, in one place (fundamentool D-035, D-041).

/** The parts of a history entry, outer first: the address (path + query) ⊃ its hash ⊃ the entry's own state. */
export const URL_PART = 'url';
export const HASH_PART = 'hash';
export const STATE_PART = 'state';

/** An entry of the navigator's stack: a page of the route table, or a window over it. */
export const PAGE = 'page';
export const WINDOW = 'window';

/** The path of a location that has none. */
export const ROOT_PATH = '/';

/** Between the segments of a path. */
export const SEGMENT_SEPARATOR = '/';

/** How many covered pages stay mounted at most, unless `createNavigator({ keep })` says otherwise. */
export const DEFAULT_KEEP = 10;

/** How long a closed window plays its exit, ms, unless `createNavigator({ exitMs })` says otherwise. */
export const DEFAULT_EXIT_MS = 300;
