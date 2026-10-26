/**
 * @jest-environment jsdom
 */
import {
  createContext,
  createElement as h,
  createPortal,
  createRoot,
  forwardRef,
  Fragment,
  memo,
  StrictMode,
  useContext,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useState,
} from '../../src/vdom';
import type {
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

describe('vdom — rendering the DOM', () => {
  it('the first render replaces what the container held', () => {
    container.innerHTML = '<p>server</p>';
    root.render(h(
      'b', null, 'hi',
    ));
    expect(container.innerHTML).toBe('<b>hi</b>');
  });

  it('text, numbers, bigints; null, booleans and functions render nothing', () => {
    root.render(h(
      'p', null, 'a', 1, BigInt(2), null, false, true, undefined, () => 1, Symbol('s') as any,
    ));
    expect(container.innerHTML).toBe('<p>a12</p>');
    root.render(h(
      'p', null, 'b', 1,
    ));
    expect(container.innerHTML).toBe('<p>b1</p>');
  });

  it('iterables render as arrays; plain objects are an error', () => {
    root.render(h(
      'p', null, new Set([
        'a',
        'b',
      ]),
    ));
    expect(container.textContent).toBe('ab');
    expect(() => root.render(h(
      'p', null, {
        a: 1,
      } as any,
    ))).toThrow('Objects are not valid as a child (found an object with keys {a})');
  });

  it('an invalid type is an error naming what came', () => {
    expect(() => root.render(h(null as any))).toThrow('got null.');
    expect(() => root.render(h(Symbol('x') as any))).toThrow('got Symbol(x).');
    expect(() => root.render(h(5 as any))).toThrow('got number.');
    expect(() => root.render(h({} as any))).toThrow('got object.');
  });

  it('keyed children move, the others are reused by place', () => {
    const list = (keys: string[]): any => h(
      'ul', null, keys.map((key) => h(
        'li', {
          key,
        }, key,
      )),
    );
    root.render(list([
      'a',
      'b',
      'c',
      'd',
    ]));
    const nodes = Array.from(container.querySelectorAll('li'));
    root.render(list([
      'd',
      'a',
      'c',
      'e',
    ]));
    const after = Array.from(container.querySelectorAll('li'));
    expect(after.map((li) => li.textContent)).toEqual([
      'd',
      'a',
      'c',
      'e',
    ]);
    expect(after[0]).toBe(nodes[3]);
    expect(after[1]).toBe(nodes[0]);
    expect(after[2]).toBe(nodes[2]);
    expect(nodes[1].parentNode).toBe(null);
    root.render(list(['c']));
    expect(container.querySelectorAll('li')[0]).toBe(nodes[2]);
    root.render(list([]));
    expect(container.innerHTML).toBe('<ul></ul>');
  });

  it('a changed type at the same place is a new node', () => {
    root.render(h(
      'div', null, h(
        'span', null, 'x',
      ), 'tail',
    ));
    const span = container.querySelector('span');
    root.render(h(
      'div', null, h(
        'b', null, 'x',
      ), 'tail',
    ));
    expect(container.innerHTML).toBe('<div><b>x</b>tail</div>');
    expect(span!.parentNode).toBe(null);
    root.render(h(
      'div', null, 'text', 'tail',
    ));
    expect(container.innerHTML).toBe('<div>texttail</div>');
    root.render(h(
      'div', null, h('i'), 'tail',
    ));
    expect(container.innerHTML).toBe('<div><i></i>tail</div>');
  });

  it('fragments and StrictMode render their children in place', () => {
    root.render(h(
      'div', null, 'a', h(
        Fragment, null, 'b', h('i'),
      ), h(
        StrictMode, null, 'c',
      ),
    ));
    expect(container.innerHTML).toBe('<div>ab<i></i>c</div>');
    root.render(h(
      'div', null, 'a', h(
        Fragment, null, 'b', h('i'),
      ), h(
        StrictMode, null, 'c',
      ),
    ));
    expect(container.innerHTML).toBe('<div>ab<i></i>c</div>');
  });

  it('a component that renders more children later places them before its next sibling', async () => {
    let grow: (n: number) => void = () => undefined;
    function Items(): any {
      const [
        n,
        setN,
      ] = useState(1);
      grow = setN;
      return Array.from({
        length: n,
      }, (_, i) => h(
        'i', {
          key: i,
        }, i,
      ));
    }
    function Empty(): null {
      return null;
    }
    root.render(h(
      'p', null, h(Items), h(
        Fragment, null, h(Empty),
      ), h(
        Fragment, null, h(
          'b', null, 'end',
        ),
      ),
    ));
    grow(3);
    await settle();
    expect(container.innerHTML).toBe('<p><i>0</i><i>1</i><i>2</i><b>end</b></p>');
    grow(2);
    await settle();
    expect(container.innerHTML).toBe('<p><i>0</i><i>1</i><b>end</b></p>');
  });

  it('nested arrays of children; a portal among the siblings is not where nodes go', async () => {
    let grow: (n: number) => void = () => undefined;
    function Items(): any {
      const [
        n,
        setN,
      ] = useState(1);
      grow = setN;
      return Array.from({
        length: n,
      }, (_, i) => h(
        'i', {
          key: i,
        }, i,
      ));
    }
    const target = document.createElement('div');
    root.render(h(
      'p', null, [
        'a',
        ['b'],
      ], h(Items), createPortal('portal', target), 'end',
    ));
    expect(container.innerHTML).toBe('<p>ab<i>0</i>end</p>');
    grow(2);
    await settle();
    expect(container.innerHTML).toBe('<p>ab<i>0</i><i>1</i>end</p>');
  });

  it('a component inside a fragment that grows last places its nodes at the end of its parent', async () => {
    let grow: (n: number) => void = () => undefined;
    function Items(): any {
      const [
        n,
        setN,
      ] = useState(1);
      grow = setN;
      return Array.from({
        length: n,
      }, (_, i) => h(
        'i', {
          key: i,
        }, i,
      ));
    }
    root.render(h(
      'p', null, 'start', h(
        Fragment, null, h(Items),
      ),
    ));
    grow(2);
    await settle();
    expect(container.innerHTML).toBe('<p>start<i>0</i><i>1</i></p>');
  });

  it('dangerouslySetInnerHTML replaces the children, and back', () => {
    root.render(h(
      'div', null, h(
        'b', null, 'child',
      ),
    ));
    root.render(h('div', {
      dangerouslySetInnerHTML: {
        __html: '<i>raw</i>',
      },
    }));
    expect(container.innerHTML).toBe('<div><i>raw</i></div>');
    root.render(h('div', {
      dangerouslySetInnerHTML: {
        __html: '<i>raw</i>',
      },
    }));
    root.render(h('div', {
      dangerouslySetInnerHTML: {
        __html: '<u>other</u>',
      },
    }));
    expect(container.innerHTML).toBe('<div><u>other</u></div>');
    root.render(h(
      'div', null, 'back',
    ));
    expect(container.innerHTML).toBe('<div>back</div>');
  });

  it('SVG: its namespace, kebab-case attributes, foreignObject back to HTML', () => {
    root.render(h(
      'svg', {
        viewBox: '0 0 1 1',
      }, h('path', {
        strokeWidth: 2,
        xlinkHref: '#a',
        tabIndex: 0,
        className: 'p',
      }), h(
        'foreignObject', null, h(
          'div', null, 'html',
        ),
      ),
    ));
    const svg = container.firstChild as SVGElement;
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    const path = svg.firstChild as SVGElement;
    expect(path.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(path.getAttribute('stroke-width')).toBe('2');
    expect(path.getAttribute('href')).toBe('#a');
    expect(path.getAttribute('tabindex')).toBe('0');
    expect(path.getAttribute('class')).toBe('p');
    expect(svg.querySelector('div')!.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
  });

  it('a root in an SVG container renders SVG', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svgRoot = createRoot(svg);
    svgRoot.render(h('circle', {
      r: 1,
    }));
    expect((svg.firstChild as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
    svgRoot.unmount();
    expect(svg.childNodes.length).toBe(0);
  });

  it('form fields: value / checked after the children, default values once, autoFocus', async () => {
    root.render(h(
      'div', null,
      h(
        'select', {
          value: 'b',
          onChange: () => undefined,
        }, h(
          'option', {
            value: 'a',
          }, 'A',
        ), h(
          'option', {
            value: 'b',
          }, 'B',
        ),
      ),
      h('input', {
        defaultValue: 'typed',
        autoFocus: true,
      }),
      h('input', {
        type: 'checkbox',
        defaultChecked: true,
      }),
      h('input', {
        type: 'checkbox',
        checked: false,
        readOnly: true,
      }),
      h('input', {
        value: null,
        readOnly: true,
      }),
      h('input', {
        value: 'v',
        defaultValue: 'ignored',
        readOnly: true,
      }),
    ));
    const [
      select,
      input,
      defaultChecked,
      checked,
      nullValue,
      valued,
    ] = Array.from(container.querySelectorAll('select, input')) as any[];
    expect(select.value).toBe('b');
    expect(input.value).toBe('typed');
    expect(document.activeElement).toBe(input);
    expect(defaultChecked.checked).toBe(true);
    expect(checked.checked).toBe(false);
    expect(nullValue.value).toBe('');
    expect(valued.value).toBe('v');
    checked.checked = true;
    valued.value = 'user';
    root.render(h(
      'div', null,
      h(
        'select', {
          value: 'b',
          onChange: () => undefined,
        }, h(
          'option', {
            value: 'a',
          }, 'A',
        ), h(
          'option', {
            value: 'b',
          }, 'B',
        ),
      ),
      h('input', {
        defaultValue: 'changed',
        autoFocus: true,
      }),
      h('input', {
        type: 'checkbox',
        defaultChecked: true,
      }),
      h('input', {
        type: 'checkbox',
        checked: false,
        readOnly: true,
      }),
      h('input', {
        value: null,
        readOnly: true,
      }),
      h('input', {
        value: 'v',
        readOnly: true,
      }),
    ));
    expect(input.value).toBe('typed');
    expect(checked.checked).toBe(false);
    expect(valued.value).toBe('v');
  });

  it('autoFocus on a node gone before the commit does nothing', () => {
    function Gone(): any {
      const [
        shown,
        setShown,
      ] = useState(true);
      useLayoutEffect(() => setShown(false), []);
      return shown ? h('input', {
        autoFocus: true,
        ref: () => undefined,
      }) : null;
    }
    root.render(h(Gone));
    expect(container.innerHTML).toBe('');
  });
});

describe('vdom — refs', () => {
  it('object refs get the node, then null when it goes', () => {
    const ref = {
      current: null as any,
    };
    root.render(h('b', {
      ref,
    }));
    expect(ref.current).toBe(container.firstChild);
    root.render(null);
    expect(ref.current).toBe(null);
  });

  it('callback refs: called with the node, then null — or their cleanup', () => {
    const calls: any[] = [];
    const callback = (node: any): void => {
      calls.push(node && node.localName);
    };
    root.render(h('b', {
      ref: callback,
    }));
    root.render(h('b', {
      ref: callback,
    }));
    expect(calls).toEqual(['b']);
    const withCleanup = (node: any): (() => void) => {
      calls.push('with ' + node.localName);
      return () => calls.push('cleanup');
    };
    root.render(h('b', {
      ref: withCleanup,
    }));
    expect(calls).toEqual([
      'b',
      null,
      'with b',
    ]);
    root.render(h('b', null));
    expect(calls).toEqual([
      'b',
      null,
      'with b',
      'cleanup',
    ]);
  });

  it('forwardRef passes the ref apart; without one, `null`', () => {
    const Input = forwardRef((props: any, ref: any) => h('input', {
      ...props,
      ref,
    }));
    const ref = {
      current: null as any,
    };
    root.render(h(Input, {
      ref,
      name: 'n',
    }));
    expect(ref.current.name).toBe('n');
    const seen: any[] = [];
    const Probe = forwardRef((props: any, probeRef: any) => {
      seen.push(probeRef, 'ref' in props);
      return null;
    });
    root.render(h(Probe));
    expect(seen).toEqual([
      null,
      false,
    ]);
  });
});

describe('vdom — components', () => {
  it('a ref of a node unmounted before the commit is never attached', () => {
    const ref = jest.fn();
    function Child({
      hide,
    }: any): any {
      useInsertionEffect(() => hide(), []);
      return h('input', {
        ref,
      });
    }
    function Parent(): any {
      const [
        shown,
        setShown,
      ] = useState(true);
      return shown ? h(Child, {
        hide: () => setShown(false),
      }) : 'hidden';
    }
    root.render(h(Parent));
    expect(container.innerHTML).toBe('hidden');
    expect(ref).not.toHaveBeenCalled();
  });

  it('a parent and a child that are both queued render once each, the parent first', async () => {
    const renders: string[] = [];
    let setParent: (n: number) => void = () => undefined;
    let setChild: (n: number) => void = () => undefined;
    function Child(): any {
      const [
        n,
        set,
      ] = useState(0);
      setChild = set;
      renders.push('child');
      return n;
    }
    function Parent(): any {
      const [
        n,
        set,
      ] = useState(0);
      setParent = set;
      renders.push('parent');
      return h(
        'p', null, n, h(Child),
      );
    }
    root.render(h(Parent));
    renders.length = 0;
    setChild(1);
    setParent(1);
    await settle();
    expect(renders).toEqual([
      'parent',
      'child',
    ]);
    expect(container.textContent).toBe('11');
  });

  it('setState during render renders again at once; forever is an error', () => {
    function Clamp(): any {
      const [
        n,
        setN,
      ] = useState(5);
      if (n > 2) {
        setN(n - 1);
      }
      return n;
    }
    root.render(h(Clamp));
    expect(container.textContent).toBe('2');
    function Forever(): any {
      const [
        n,
        setN,
      ] = useState(0);
      setN(n + 1);
      return n;
    }
    expect(() => createRoot(document.createElement('div')).render(h(Forever))).toThrow('Too many re-renders');
  });

  it('memo: skipped while the props are equal, by compare or shallowly', () => {
    const renders: string[] = [];
    const Plain = memo(({
      label,
    }: any) => {
      renders.push('plain ' + label);
      return label;
    });
    const Custom = memo(({
      label,
    }: any) => {
      renders.push('custom ' + label);
      return label;
    }, (a: any, b: any) => a.label.length === b.label.length);
    const tree = (label: string, extra?: any): any => h(
      'p', null, h(Plain, {
        label,
        ...extra,
      }), h(Custom, {
        label,
      }),
    );
    root.render(tree('a'));
    root.render(tree('a'));
    root.render(tree('b'));
    root.render(tree('b', {
      more: 1,
    }));
    root.render(tree('b'));
    expect(renders).toEqual([
      'plain a',
      'custom a',
      'plain b',
      'plain b',
      'plain b',
    ]);
    expect(container.textContent).toBe('ba');
  });

  it('a component that renders the same element is not rendered again', () => {
    let renders = 0;
    function Leaf(): any {
      renders++;
      return 'leaf';
    }
    const leaf = h(Leaf);
    root.render(h(
      'p', null, leaf,
    ));
    root.render(h(
      'p', null, leaf,
    ));
    expect(renders).toBe(1);
    const fragment = h(
      Fragment, null, leaf,
    );
    // in a fragment now: another place, mounted anew — then kept
    root.render(h(
      'p', null, fragment,
    ));
    root.render(h(
      'p', null, fragment,
    ));
    expect(renders).toBe(2);
  });

  it('a state set after unmount is ignored', async () => {
    let set: (n: number) => void = () => undefined;
    function Counter(): any {
      const [
        n,
        setN,
      ] = useState(0);
      set = setN;
      return n;
    }
    root.render(h(Counter));
    root.render(null);
    set(1);
    await settle();
    expect(container.innerHTML).toBe('');
  });

  it('hooks outside a render are an error', () => {
    expect(() => useState(0)).toThrow('Hooks are called only while a component renders.');
  });
});

describe('vdom — contexts', () => {
  const Theme = createContext('light');

  it('the nearest provider, the default outside every provider; Consumer and Provider', () => {
    function Show(): any {
      return useContext(Theme);
    }
    root.render(h(
      'p', null, h(Show), '|', h(
        Theme, {
          value: 'dark',
        }, h(Show), h(
          Theme.Provider, {
            value: 'inner',
          }, h(
            Theme.Consumer, null, (value: string) => '[' + value + ']',
          ),
        ),
      ),
    ));
    expect(container.textContent).toBe('light|dark[inner]');
  });

  it('a provider value change renders the readers, even below a memo that bails out', async () => {
    const renders: string[] = [];
    function Show(): any {
      renders.push('show');
      return useContext(Theme);
    }
    const Wall = memo(() => h(Show));
    let set: (value: string) => void = () => undefined;
    function App(): any {
      const [
        value,
        setValue,
      ] = useState('a');
      set = setValue;
      return h(
        Theme, {
          value,
        }, h(Wall),
      );
    }
    root.render(h(App));
    set('b');
    await settle();
    expect(container.textContent).toBe('b');
    expect(renders).toEqual([
      'show',
      'show',
    ]);
    root.render(null);
    set('c');
    await settle();
    expect(renders.length).toBe(2);
  });

  it('a provider rendered with the same value does not render its readers', () => {
    let renders = 0;
    const Show = memo(() => {
      renders++;
      return useContext(Theme);
    });
    root.render(h(
      Theme, {
        value: 'x',
      }, h(Show),
    ));
    root.render(h(
      Theme, {
        value: 'x',
      }, h(Show),
    ));
    expect(renders).toBe(1);
  });
});

describe('vdom — portals', () => {
  it('children render into the other container, in the same tree', async () => {
    const target = document.createElement('div');
    const Theme = createContext('none');
    function Show(): any {
      return useContext(Theme);
    }
    let set: (n: number) => void = () => undefined;
    function Dialog(): any {
      const [
        n,
        setN,
      ] = useState(1);
      set = setN;
      return createPortal(Array.from({
        length: n,
      }, (_, i) => h(
        'i', {
          key: i,
        }, h(Show),
      )), target);
    }
    root.render(h(
      Theme, {
        value: 'ctx',
      }, h(
        'main', null, 'page',
      ), h(Dialog),
    ));
    expect(container.innerHTML).toBe('<main>page</main>');
    expect(target.innerHTML).toBe('<i>ctx</i>');
    set(2);
    await settle();
    expect(target.innerHTML).toBe('<i>ctx</i><i>ctx</i>');
    root.render(h(
      Theme, {
        value: 'ctx',
      }, h(
        'main', null, 'page',
      ), h(Dialog),
    ));
    root.render(null);
    expect(target.innerHTML).toBe('');
  });

  it('a portal into another container is a new portal', () => {
    const one = document.createElement('div');
    const two = document.createElement('div');
    root.render(createPortal('x', one));
    root.render(createPortal('x', two));
    expect(one.innerHTML).toBe('');
    expect(two.innerHTML).toBe('x');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    root.render(createPortal(h('g'), svg));
    expect((svg.firstChild as Element).namespaceURI).toBe('http://www.w3.org/2000/svg');
  });
});

describe('vdom — effects', () => {
  it('order: insertion during render, layout children-first at commit, passive in a task', async () => {
    const log: string[] = [];
    function Child(): any {
      useEffect(() => {
        log.push('child passive');
        return () => log.push('child passive cleanup');
      });
      useLayoutEffect(() => {
        log.push('child layout');
      });
      return null;
    }
    function Parent(): any {
      useEffect(() => {
        log.push('parent passive');
      }, []);
      useLayoutEffect(() => {
        log.push('parent layout');
        return () => log.push('parent layout cleanup');
      }, []);
      return h(Child);
    }
    root.render(h(Parent));
    expect(log).toEqual([
      'child layout',
      'parent layout',
    ]);
    await settle();
    expect(log).toEqual([
      'child layout',
      'parent layout',
      'child passive',
      'parent passive',
    ]);
    log.length = 0;
    root.render(h(Parent));
    root.render(h(Parent));
    expect(log).toEqual([
      'child layout',
      'child passive cleanup',
      'child passive',
      'child layout',
    ]);
    log.length = 0;
    root.render(null);
    // the passive effects left from the last render run first
    expect(log).toEqual([
      'child passive cleanup',
      'child passive',
      'parent layout cleanup',
      'child passive cleanup',
    ]);
  });

  it('passive effects left from the last render run before the next one', () => {
    const log: string[] = [];
    function Effect(): any {
      useEffect(() => {
        log.push('effect');
      });
      return null;
    }
    root.render(h(Effect));
    expect(log).toEqual([]);
    root.render(h(Effect));
    expect(log).toEqual(['effect']);
  });

  it('an effect of a component a layout effect unmounted before it ran never runs', async () => {
    const log: string[] = [];
    function Effect(): any {
      useEffect(() => {
        log.push('effect');
      });
      return null;
    }
    function Parent(): any {
      const [
        shown,
        setShown,
      ] = useState(true);
      useLayoutEffect(() => setShown(false), []);
      return shown ? h(Effect) : 'gone';
    }
    root.render(h(Parent));
    expect(container.innerHTML).toBe('gone');
    await settle();
    expect(log).toEqual([]);
  });

  it('a layout effect setting state on every commit is an error', () => {
    function Loop(): any {
      const [
        n,
        setN,
      ] = useState(0);
      useLayoutEffect(() => setN(n + 1));
      return n;
    }
    expect(() => root.render(h(Loop))).toThrow('Maximum update depth exceeded');
  });
});
