/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions": ["require", "node", "default"]}
 */
/**
 * fundamentool's view hooks (D-048, D-049): `useUnit` and `useStoreMap` — effector-react's names and shapes — with
 * React and Preact, over fundamentool's stores and an effector-shaped one.
 */

// React 19 warns on every `act()` unless the environment declares itself an act environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import * as React from 'react';
import {
  act as reactAct,
} from 'react';
import {
  createRoot,
} from 'react-dom/client';
import * as preact from 'preact';
import * as preactCompat from 'preact/compat';
import * as preactHooks from 'preact/hooks';
import {
  act as preactAct,
} from 'preact/test-utils';
import {
  createApi,
  createEvent,
  createObservable,
} from '../../src/Observable';
import type {
  Observable,
} from '../../src/Observable';
import {
  viewHooksProvider,
} from '../../src/view';

type TLibrary = {
  name: string;
  hooks: ReturnType<typeof viewHooksProvider>;
  h: (...args: any[]) => unknown;
  mount: (view: () => unknown) => { container: HTMLElement;
    unmount: () => void; };
  act: (work: () => void | Promise<void>) => Promise<void>;
};

const REACT: TLibrary = {
  name: 'React',
  hooks: viewHooksProvider({
    useSyncExternalStore: React.useSyncExternalStore,
    useRef: React.useRef,
  }),
  h: React.createElement as (...args: any[]) => unknown,
  mount(view) {
    const container = document.createElement('div');
    const root = createRoot(container);
    reactAct(() => root.render(React.createElement(view as () => React.ReactElement)));
    return {
      container,
      unmount: () => reactAct(() => root.unmount()),
    };
  },
  act: async (work) => {
    await reactAct(async () => {
      await work();
    });
  },
};

const PREACT: TLibrary = {
  name: 'Preact',
  hooks: viewHooksProvider({
    useSyncExternalStore: preactCompat.useSyncExternalStore,
    useRef: preactHooks.useRef,
  }),
  h: preact.h as (...args: any[]) => unknown,
  mount(view) {
    const container = document.createElement('div');
    preactAct(() => {
      preact.render(preact.h(view as unknown as preact.FunctionComponent, null), container);
    });
    return {
      container,
      unmount: () => preactAct(() => {
        preact.render(null, container);
      }),
    };
  },
  act: async (work) => {
    await preactAct(async () => {
      await work();
    });
  },
};

/** An effector-shaped store: an object with `getState` and a `watch` that fires at once and returns a Subscription. */
function effectorLikeStore<T>(initial: T) {
  let state = initial;
  const watchers = new Set<(value: T) => void>();
  return {
    kind: 'store',
    getState: () => state,
    watch(fn: (value: T) => void) {
      watchers.add(fn);
      fn(state);
      const stop = () => {
        watchers.delete(fn);
      };
      return Object.assign(stop, {
        unsubscribe: stop,
      });
    },
    set(next: T) {
      state = next;
      watchers.forEach((fn) => fn(state));
    },
  };
}

describe.each([
  REACT,
  PREACT,
])('useUnit with $name', (library) => {
  const {
    hooks: {
      useUnit,
    },
    h,
  } = library;

  it('a store → its value, re-rendering when it changes; an equal value — no re-render', async () => {
    const $count = createObservable(0);
    const renders: number[] = [];
    function Counter(): unknown {
      const count = useUnit($count);
      renders.push(count);
      return h(
        'b', null, String(count),
      );
    }
    const {
      container, unmount,
    } = library.mount(Counter);
    await library.act(() => $count.setState(1));
    await library.act(() => $count.setState(1));
    expect(container.textContent).toBe('1');
    expect(renders).toEqual([
      0,
      1,
    ]);
    unmount();
  });

  it('an event (a function) comes back as it is; a list and a shape — values for stores, the rest as it is', async () => {
    const $level = createObservable(1);
    const $moves = createObservable(10);
    const api = createApi($level, {
      next: (level) => level + 1,
    });
    const saved = createEvent<string>();
    const seen: unknown[] = [];
    function Panel(): unknown {
      const next = useUnit(api.next);
      const [
        level,
        moves,
      ] = useUnit([
        $level,
        $moves,
      ] as const);
      const shape = useUnit({
        level: $level,
        save: saved,
        label: 'L',
      });
      seen.push([
        next === api.next,
        level,
        moves,
        shape.level,
        shape.save === saved,
        shape.label,
      ]);
      return h(
        'b', null, `${shape.label}${level}`,
      );
    }
    const {
      container, unmount,
    } = library.mount(Panel);
    await library.act(() => {
      api.next(undefined);
    });
    expect(container.textContent).toBe('L2');
    expect(seen.at(-1)).toEqual([
      true,
      2,
      10,
      2,
      true,
      'L',
    ]);
    unmount();
  });

  it('an effector-shaped store works the same; a store swapped between renders is followed', async () => {
    const $a = effectorLikeStore('a');
    const $b = effectorLikeStore('b');
    let pick: (store: typeof $a) => void = () => undefined;
    function Show(): unknown {
      const [
        store,
        setStore,
      ] = (library === REACT ? React.useState : preactHooks.useState)($a);
      pick = setStore as (store: typeof $a) => void;
      return h(
        'b', null, useUnit(store as unknown as Observable<string>),
      );
    }
    const {
      container, unmount,
    } = library.mount(Show);
    expect(container.textContent).toBe('a');
    await library.act(() => $a.set('a2'));
    expect(container.textContent).toBe('a2');
    await library.act(() => pick($b));
    expect(container.textContent).toBe('b');
    await library.act(() => $b.set('b2'));
    expect(container.textContent).toBe('b2');
    unmount();
  });
});

describe.each([
  REACT,
  PREACT,
])('useStoreMap with $name', (library) => {
  const {
    hooks: {
      useStoreMap,
    },
    h,
  } = library;

  it('re-renders only when the selected value changes', async () => {
    const $state = createObservable({
      section: 'a',
      depth: 0,
    });
    const renders: string[] = [];
    function Tabs(): unknown {
      const section = useStoreMap($state, (state) => state.section);
      renders.push(section);
      return h(
        'b', null, section,
      );
    }
    const {
      container, unmount,
    } = library.mount(Tabs);
    await library.act(() => $state.setState({
      section: 'a',
      depth: 1,
    }));
    await library.act(() => $state.setState({
      section: 'b',
      depth: 1,
    }));
    expect(container.textContent).toBe('b');
    expect(renders).toEqual([
      'a',
      'b',
    ]);
    unmount();
  });

  it('keys: what fn depends on besides the state; updateFilter and defaultValue', async () => {
    const $items = createObservable<Record<string, number[]>>({
      x: [1],
    });
    let setKey: (key: string) => void = () => undefined;
    const renders: string[] = [];
    function Item(): unknown {
      const [
        key,
        set,
      ] = (library === REACT ? React.useState : preactHooks.useState)('x');
      setKey = set as (key: string) => void;
      const list = useStoreMap({
        store: $items,
        keys: [key] as const,
        fn: (items, [name]) => items[name],
        updateFilter: (update, current) => update.join() !== current.join(), // by value, not by reference
        defaultValue: [],
      });
      renders.push(list.join());
      return h(
        'b', null, list.join(),
      );
    }
    const {
      container, unmount,
    } = library.mount(Item);
    await library.act(() => $items.setState({
      x: [1], // a new array, the same items: no re-render
    }));
    await library.act(() => setKey('y')); // no such key: the default
    expect(container.textContent).toBe('');
    await library.act(() => $items.setState({
      x: [1],
      y: [2],
    }));
    expect(container.textContent).toBe('2');
    expect(renders).toEqual([
      '1',
      '',
      '2',
    ]);
    unmount();
  });
});

describe('useStoreMap — keys of another length', () => {
  it('computes again when the keys change, their number included', async () => {
    const $value = createObservable(2);
    let setWide: (wide: boolean) => void = () => undefined;
    function Sum(): unknown {
      const [
        wide,
        set,
      ] = React.useState(false);
      setWide = set;
      const sum = REACT.hooks.useStoreMap({
        store: $value,
        keys: (wide ? [
          1,
          10,
        ] : [1]) as readonly number[],
        fn: (value, keys) => keys.reduce((total, key) => total + key * value, 0),
      });
      return React.createElement(
        'b', null, String(sum),
      );
    }
    const {
      container, unmount,
    } = REACT.mount(Sum);
    expect(container.textContent).toBe('2');
    await REACT.act(() => setWide(true));
    expect(container.textContent).toBe('22');
    unmount();
  });
});

describe('viewHooksProvider', () => {
  it('checks the view library it needs', () => {
    expect(() => viewHooksProvider({
      useSyncExternalStore: undefined,
      useRef: React.useRef,
    } as never)).toThrow(/viewHooksProvider: "useSyncExternalStore" expects the view library's function \(React's, Preact's\), got undefined/);
  });
});
