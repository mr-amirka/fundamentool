/**
 * @jest-environment jsdom
 */
import {
  Children,
  cloneElement,
  createContext,
  createElement as h,
  createPortal,
  forwardRef,
  Fragment,
  isValidElement,
  jsx,
  jsxDEV,
  jsxs,
  memo,
  version,
} from '../../src/vdom';

const ELEMENT = Symbol.for('react.transitional.element');

describe('vdom — elements', () => {
  it('createElement: key out of the props, ref in them, children from the third argument', () => {
    const ref = {
      current: null,
    };
    const el = h(
      'div', {
        key: 7,
        ref,
        id: 'a',
        __self: 1,
        __source: 2,
      }, 'x', 'y',
    );
    expect(el).toEqual({
      $$typeof: ELEMENT,
      type: 'div',
      key: '7',
      props: {
        ref,
        id: 'a',
        children: [
          'x',
          'y',
        ],
      },
    });
    expect(h(
      'b', null, 'one',
    ).props).toEqual({
      children: 'one',
    });
    expect(h('b').props).toEqual({});
    expect(h('b', {
      key: undefined,
    }).key).toBe(null);
  });

  it('defaultProps fill what was not given', () => {
    function Button(): null {
      return null;
    }
    (Button as any).defaultProps = {
      kind: 'primary',
      size: 'm',
    };
    expect(h(Button, {
      size: 's',
    }).props).toEqual({
      kind: 'primary',
      size: 's',
    });
    expect(jsx(Button, {}).props).toEqual({
      kind: 'primary',
      size: 'm',
    });
  });

  it('jsx: the props object as is, the key apart or from a spread', () => {
    const props = {
      children: 'Milk',
    };
    const el = jsx(
      'li', props, 'milk',
    );
    expect(el.key).toBe('milk');
    expect(el.props).toBe(props);
    expect(jsx('li', {}).key).toBe(null);
    const spread = jsx('li', {
      key: 3,
      title: 't',
    });
    expect(spread.key).toBe('3');
    expect(spread.props).toEqual({
      title: 't',
    });
    expect(jsx(
      'li', {
        key: undefined,
      }, 'k',
    ).key).toBe('k');
    expect(jsxs).toBe(jsx);
    expect(jsxDEV).toBe(jsx);
  });

  it('isValidElement: elements only', () => {
    expect(isValidElement(h('b'))).toBe(true);
    expect(isValidElement('b')).toBe(false);
    expect(isValidElement(null)).toBe(false);
    expect(isValidElement(createPortal('x', document.createElement('div')))).toBe(false);
  });

  it('cloneElement: props overridden, key and ref replaced, children replaced', () => {
    const ref = {
      current: null,
    };
    const source = h(
      'a', {
        key: 'k',
        ref,
        href: '/',
      }, 'old',
    );
    const same = cloneElement(source, {
      ref: undefined,
      title: 't',
      __self: 1,
    });
    expect(same.key).toBe('k');
    expect(same.props).toEqual({
      ref,
      href: '/',
      title: 't',
      children: 'old',
    });
    const other = cloneElement(
      source, {
        key: 2,
        ref: null,
      }, 'new', 'er',
    );
    expect(other.key).toBe('2');
    expect(other.props.ref).toBe(null);
    expect(other.props.children).toEqual([
      'new',
      'er',
    ]);
    expect(cloneElement(source).props).toEqual(source.props);
  });

  it('forwardRef, memo, createContext, createPortal: React 19 shapes', () => {
    const render = (): null => null;
    expect(forwardRef(render)).toEqual({
      $$typeof: Symbol.for('react.forward_ref'),
      render,
    });
    expect(memo(render).compare).toBe(null);
    const compare = (): boolean => true;
    expect(memo(render, compare).compare).toBe(compare);
    const context = createContext(1);
    expect(context.Provider).toBe(context);
    expect(context._currentValue).toBe(1);
    expect(context.Consumer._context).toBe(context);
    const container = document.createElement('div');
    expect(createPortal('x', container).key).toBe(null);
    expect(createPortal(
      'x', container, 5,
    ).key).toBe('5');
    expect(parseInt(version)).toBe(19);
    expect(Fragment).toBe(Symbol.for('react.fragment'));
  });
});

describe('vdom — Children', () => {
  const a = h('i', {
    key: 'a',
  });
  const b = h('i');

  it('map: nested arrays flattened, keys by place, null skipped', () => {
    const out = Children.map([
      a,
      [
        b,
        'text',
      ],
      null,
      false,
    ], (child) => child);
    expect(out.map((child: any) => child.key ?? child)).toEqual([
      '.$a',
      '.1:0',
      'text',
    ]);
    expect(Children.map(null, (child) => child)).toBe(null);
    expect(Children.map(undefined, (child) => child)).toBe(undefined);
    expect(Children.map(a, (child) => child)[0].key).toBe('.$a');
  });

  it('map: a returned key is kept before the path; arrays returned are flattened', () => {
    const out = Children.map([
      a,
      b,
    ], (child, i) => i === 0
      ? cloneElement(child, {
        key: 'x',
      })
      : [
        child,
        h('u', {
          key: 'y',
        }),
      ]);
    expect(out.map((child: any) => child.key)).toEqual([
      'x/.$a',
      '.1/.0',
      '.1/.$y',
    ]);
    const kept = Children.map([a], (child) => child);
    expect(kept[0].key).toBe('.$a');
    expect(Children.map([a], () => true)).toEqual([]);
  });

  it('map: the context is `this`', () => {
    const context = {
      n: 2,
    };
    expect(Children.map(
      [1], function (this: any, child: any) {
        return child * this.n;
      }, context,
    )).toEqual([2]);
  });

  it('forEach, count, toArray, only', () => {
    const seen: any[] = [];
    Children.forEach([
      a,
      [b],
      undefined,
      true,
    ], (child, i) => seen.push([
      child,
      i,
    ]));
    expect(seen).toEqual([
      [
        a,
        0,
      ],
      [
        b,
        1,
      ],
      [
        null,
        2,
      ],
      [
        null,
        3,
      ],
    ]);
    Children.forEach(null, () => seen.push('never'));
    expect(seen.length).toBe(4);
    expect(Children.count([
      a,
      [
        b,
        null,
      ],
    ])).toBe(3);
    expect(Children.count(null)).toBe(0);
    expect(Children.count('x')).toBe(1);
    expect(Children.count(true)).toBe(1);
    expect(Children.toArray([
      a,
      null,
      'x',
    ]).length).toBe(2);
    expect(Children.toArray(null)).toEqual([]);
    expect(Children.only(a)).toBe(a);
    expect(() => Children.only([a])).toThrow('Children.only expected to receive a single element child.');
    expect(() => Children.only('x')).toThrow('Children.only');
  });
});
