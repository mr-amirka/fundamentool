/**
 * @jest-environment jsdom
 */
import {
  createElement as h,
  createRoot,
  ErrorBoundary,
  useEffect,
  useLayoutEffect,
  useState,
} from '../../src/vdom';
import type {
  TNode,
  TRoot,
} from '../../src/vdom';

/** Lets the queued renders (a microtask) and the passive effects (a task) run. */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

let container: HTMLElement;
let root: TRoot;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  container.remove();
});

/** Throws as it renders while `broken.now` is set. */
const broken = {
  now: true,
};
function Fragile(): never | string {
  if (broken.now) {
    throw new Error('boom');
  }
  return 'fine';
}

/** A fallback that names the error. */
function fallback(error: unknown): string {
  return 'failed: ' + (error as Error).message;
}

beforeEach(() => {
  broken.now = true;
});

describe('vdom — ErrorBoundary', () => {
  it('shows the children while nothing fails', () => {
    broken.now = false;
    root.render(h(
      ErrorBoundary, {
        fallback,
      }, h(Fragile),
    ));
    expect(container.textContent).toBe('fine');
  });

  it('a component failing on its first render: the fallback in its place, onError told after the DOM changed, the siblings outside kept', () => {
    const seen: string[] = [];
    root.render(h(
      'main', null,
      h(
        'b', null, 'title',
      ),
      h(
        ErrorBoundary, {
          fallback,
          onError: (error: unknown) => seen.push((error as Error).message + ' | ' + container.textContent),
        }, h(
          'i', null, 'before',
        ), h(Fragile),
      ),
    ));
    expect(container.innerHTML).toBe('<main><b>title</b>failed: boom</main>');
    expect(seen).toEqual(['boom | titlefailed: boom']);
  });

  it('two children failing in one update: the fallback once, both errors told', () => {
    const seen: string[] = [];
    root.render(h(
      ErrorBoundary, {
        fallback,
        onError: (error: unknown) => seen.push((error as Error).message),
      }, h(Fragile), h(Fragile),
    ));
    expect(container.textContent).toBe('failed: boom');
    expect(seen).toEqual([
      'boom',
      'boom',
    ]);
  });

  it('an effect and its cleanup both failing: the fallback, both told', async () => {
    const seen: string[] = [];
    function Both(): string {
      const [
        n,
        setN,
      ] = useState(0);
      useLayoutEffect(() => {
        if (n > 0) {
          throw new Error('effect');
        }
        if (n === 0) {
          setN(1);
        }
        return () => {
          throw new Error('cleanup');
        };
      }, [n]);
      return 'n=' + n;
    }
    root.render(h(
      ErrorBoundary, {
        fallback,
        onError: (error: unknown) => seen.push((error as Error).message),
      }, h(Both),
    ));
    await settle();
    expect(container.textContent).toBe('failed: cleanup');
    expect(seen).toEqual([
      'cleanup',
      'effect',
    ]);
  });

  it('a component failing on a later render (a state change, rendered in a microtask): the fallback, nothing thrown out', async () => {
    let set!: (n: number) => void;
    function Counter(): string {
      const [
        n,
        setN,
      ] = useState(0);
      set = setN;
      if (n > 0) {
        throw new Error('at ' + n);
      }
      return 'n=' + n;
    }
    root.render(h(
      ErrorBoundary, {
        fallback,
      }, h(Counter),
    ));
    expect(container.textContent).toBe('n=0');
    set(1);
    await settle();
    expect(container.textContent).toBe('failed: at 1');
  });

  it('reset renders the children anew; reset while nothing failed does nothing', async () => {
    let reset!: () => void;
    root.render(h(
      ErrorBoundary, {
        fallback: (error: unknown, again: () => void) => {
          reset = again;
          return fallback(error);
        },
      }, h(Fragile),
    ));
    expect(container.textContent).toBe('failed: boom');
    broken.now = false;
    reset();
    await settle();
    expect(container.textContent).toBe('fine');
    reset();
    await settle();
    expect(container.textContent).toBe('fine');
  });

  it('an error of the fallback goes to the next boundary up', () => {
    root.render(h(
      ErrorBoundary, {
        fallback: () => 'outer',
      }, h(
        ErrorBoundary, {
          fallback: () => h(Fragile),
        }, h(Fragile),
      ),
    ));
    expect(container.textContent).toBe('outer');
  });

  it('an error of the fallback function itself goes to the next boundary up', () => {
    root.render(h(
      ErrorBoundary, {
        fallback: () => 'outer',
      }, h(
        ErrorBoundary, {
          fallback: () => {
            throw new Error('fallback');
          },
        }, h(Fragile),
      ),
    ));
    expect(container.textContent).toBe('outer');
  });

  it('an invalid child — of the boundary itself, of a component below it — is caught', () => {
    root.render(h(
      ErrorBoundary, {
        fallback,
      }, {
        not: 'a child',
      } as never,
    ));
    expect(container.textContent).toMatch(/^failed: Objects are not valid as a child/);
    function Bad(): never {
      return {
        bad: 1,
      } as never;
    }
    root.render(h(
      'div', null, h(
        ErrorBoundary, {
          fallback,
        }, h(Bad),
      ),
    ));
    expect(container.textContent).toMatch(/^failed: Objects are not valid as a child/);
  });

  it('errors of effects: a layout effect, its cleanup, a passive effect, a passive effect\'s cleanup', async () => {
    let failIn = '';
    let set!: (n: number) => void;
    function Effects(): string {
      const [
        n,
        setN,
      ] = useState(0);
      set = setN;
      useLayoutEffect(() => {
        if (failIn === 'layout') {
          throw new Error('layout');
        }
        return () => {
          if (failIn === 'layout cleanup') {
            throw new Error('layout cleanup');
          }
        };
      }, [n]);
      useEffect(() => {
        if (failIn === 'passive') {
          throw new Error('passive');
        }
        return () => {
          if (failIn === 'passive cleanup') {
            throw new Error('passive cleanup');
          }
        };
      }, [n]);
      return 'n=' + n;
    }
    const seen: string[] = [];
    for (const where of [
      'layout',
      'layout cleanup',
      'passive',
      'passive cleanup',
    ]) {
      failIn = '';
      root.render(h(
        ErrorBoundary, {
          key: where,
          fallback,
          onError: (error: unknown) => seen.push((error as Error).message),
        }, h(Effects),
      ));
      await settle();
      expect(container.textContent).toBe('n=0');
      failIn = where;
      set(1);
      // the render (a microtask), the passive effects (a task queued after this one), the fallback (a microtask)
      await settle();
      await settle();
      expect([
        where,
        container.textContent,
      ]).toEqual([
        where,
        'failed: ' + where,
      ]);
    }
    // the cleanups that throw throw again as the fallback removes them: reported, not lost
    expect(seen).toEqual([
      'layout',
      'layout cleanup',
      'layout cleanup',
      'passive',
      'passive cleanup',
      'passive cleanup',
    ]);
  });

  it('a cleanup failing as its component leaves: a boundary showing its children takes it; one showing its fallback only reports it', async () => {
    /** Its effect's cleanup throws. */
    function Leaving(): string {
      useEffect(() => () => {
        throw new Error('cleanup');
      }, []);
      return 'here';
    }
    let show!: (on: boolean) => void;
    function Toggle(): TNode {
      const [
        on,
        setOn,
      ] = useState(true);
      show = setOn;
      return on ? h(Leaving) : 'gone';
    }
    root.render(h(
      ErrorBoundary, {
        fallback,
      }, h(Toggle),
    ));
    await settle();
    show(false);
    await settle();
    expect(container.textContent).toBe('failed: cleanup');

    // the fallback replaces a child whose cleanup throws: the boundary is told, the fallback stays
    const seen: string[] = [];
    let fail!: (on: boolean) => void;
    function Failing(): TNode {
      const [
        on,
        setOn,
      ] = useState(false);
      fail = setOn;
      if (on) {
        throw new Error('render');
      }
      return h(Leaving);
    }
    root.render(h(
      ErrorBoundary, {
        key: 'second',
        fallback,
        onError: (error: unknown) => seen.push((error as Error).message),
      }, h(Failing), h(Leaving),
    ));
    await settle();
    fail(true);
    await settle();
    expect(container.textContent).toBe('failed: render');
    expect(seen).toEqual([
      'render',
      'cleanup',
      'cleanup',
    ]);
  });

  it('a cleanup failing as the whole root unmounts is thrown — the boundary leaves too', async () => {
    function Leaving(): string {
      useEffect(() => () => {
        throw new Error('cleanup');
      }, []);
      return 'here';
    }
    const local = createRoot(document.createElement('div'));
    local.render(h(
      ErrorBoundary, {
        fallback,
      }, h(Leaving),
    ));
    await settle();
    expect(() => local.unmount()).toThrow('cleanup');
  });

  it('with no boundary above, the error is thrown as before', () => {
    expect(() => root.render(h(
      'div', null, h(Fragile),
    ))).toThrow('boom');
  });
});
