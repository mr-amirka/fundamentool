// The view bindings of fundamentool/i18n (D-061, the design card §3.6): `useT` re-renders a component when its locale
// changes; `LocaleProvider` sets the locale of a part of the tree — the whole app, a story in the gallery, a test —
// without touching the app's own; `<Text>` renders a message with tags (research 03 §5.6) or a message passed as data
// (D-064). Over the view library the app passes in (React, Preact `compat`).
import {
  viewLibraryShape,
} from './library';
import type {
  TViewLibrary,
} from './library';
import {
  lazy,
  object,
} from '../schema';
import type {
  TLocale,
  TMessagesSet,
  TPart,
} from '../i18n';

const WHERE = '[fundamentool] localeViewProvider';

const LIBRARY = /*#__PURE__*/ lazy(() => object(viewLibraryShape([
  'createElement',
  'createContext',
  'useContext',
  'useSyncExternalStore',
  'useEffect',
  'useState',
])).passthrough());

/** A message's tags rendered by the app: tag name → what wraps its text (`b: (text) => <strong>{text}</strong>`). */
export type TTagRenderers = Readonly<Record<string, (children: string) => unknown>>;

/** `<Text>`'s props: a set and a key (with its variables), or a message passed as data. */
export type TTextProps = {
  /** The set the key belongs to. */
  of: TMessagesSet<any, any>;
  /** The key — a constant of the set (D-066). */
  k?: string;
  /** The key's variables. */
  vars?: Record<string, unknown>;
  /** A key and its variables as data (`TMessage`, D-064) — instead of `k` / `vars`. */
  message?: readonly [key: string, vars?: Record<string, unknown>];
  /** How each tag of the message is rendered; a tag without one shows its text. */
  tags?: TTagRenderers;
};

/** The deps: the view library's members the bindings use. */
export type TLocaleViewDeps = Pick<TViewLibrary, 'createElement' | 'createContext' | 'useContext' |
  'useSyncExternalStore' | 'useEffect' | 'useState'> & Partial<TViewLibrary>;

const NEVER = () => () => undefined;

/**
 * The view bindings of fundamentool/i18n over a view library.
 *
 * @example
 * const { LocaleProvider, useT, useLocale, Text } = localeViewProvider(React);
 *
 * function Moves({ count }: { count: number }) {
 *   const t = useT(text);
 *   return <span>{t(K.hud.moves, { count })}</span>;   // re-renders when the locale changes
 * }
 * <LocaleProvider locale="ar"><SettingsDialog /></LocaleProvider>   // this part in Arabic
 */
export function localeViewProvider<D extends TLocaleViewDeps>(deps: D) {
  /** An element of the app's view library — React's `ReactElement` when React is passed in. */
  type TElement = ReturnType<D['createElement']>;
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    LIBRARY().parse(deps, WHERE);
  }
  const {
    createElement,
    createContext,
    useContext,
    useSyncExternalStore,
    useEffect,
    useState,
  } = deps;
  /** The locale a part of the tree is shown in; `null` — the app's current one. */
  const Context = createContext(null);

  /**
   * The locale of the part of the tree it wraps — the whole app, a story, a test; the app's own locale doesn't change.
   * A locale whose texts aren't there yet is fetched; until then its sets show the base's texts.
   */
  function LocaleProvider(props: { locale: string;
    children?: unknown }): TElement {
    return createElement(
      Context.Provider, {
        value: props.locale,
      }, props.children,
    );
  }

  /** The locale a component is shown in: its `LocaleProvider`'s, else the app's current one (re-renders on a change). */
  function useLocaleTag(locale: TLocale<any>): string {
    const forced = useContext(Context) as string | null;
    const current = useSyncExternalStore(forced ? NEVER : (onChange: () => void) => locale.$locale.watch(() => onChange()),
      () => locale.$locale.getState()) as string;
    const tag = forced || current;
    const [, loaded] = useState(0);
    const there = !!locale._values(tag);
    useEffect(() => {
      if (!there) {
        void locale.load(tag).then((done) => {
          if (done) {
            loaded((n: number) => n + 1);
          }
        });
      }
    }, [
      tag,
      there,
    ]);
    return tag;
  }

  /**
   * `t` in the locale the component is shown in; the component re-renders when that locale changes, and only then.
   *
   * @example
   * const t = useT(text);
   * t(K.hud.moves, { count: 3 }); // '3 moves'
   */
  function useT<T, L extends string>(set: TMessagesSet<T, L>): TMessagesSet<T, L>['t'] {
    return set._bound(useLocaleTag(set.locale));
  }

  /**
   * The locale the component is shown in (`'de'`); re-renders when it changes.
   *
   * @example
   * const current = useLocale(locale);
   * <html lang={current} dir={isRtl(current) ? 'rtl' : 'ltr'} />
   */
  function useLocale<L extends string>(locale: TLocale<L>): L {
    return useLocaleTag(locale) as L;
  }

  /**
   * A message with its tags rendered by `tags` (`Tap <b>{{name}}</b>` → `Tap <strong>Hint</strong>`) — values are never
   * read as tags; or a message passed as data (`message={['toast.saved']}`). Renders a `span` holding the segments.
   *
   * @example
   * <Text of={text} k={K.legal.accept} tags={{ link: (children) => <a href="/terms">{children}</a> }} />
   */
  function Text(props: TTextProps): TElement {
    const tag = useLocaleTag(props.of.locale);
    const [
      key,
      vars,
    ] = props.message ?? [
      props.k as string,
      props.vars,
    ];
    const parts: TPart[] = props.of._text(
      tag, key, vars, true,
    ) as TPart[];
    const tags = props.tags || {};
    return createElement(
      'span', null, ...parts.map((part) => (part.tag && tags[part.tag] ?
        tags[part.tag](part.text) : part.text)),
    );
  }

  return {
    LocaleProvider,
    useT,
    useLocale,
    Text,
  };
}
