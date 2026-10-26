/**
 * @jest-environment jsdom
 */
import {
  diffProps,
  setProp,
} from '../../src/vdom/dom';
import {
  createElement as h,
  createRoot,
} from '../../src/vdom';

describe('vdom — props onto the DOM', () => {
  it('className, htmlFor, properties, attributes, removal', () => {
    const label = document.createElement('label');
    diffProps(
      label, {
        className: 'a',
        htmlFor: 'x',
        title: 't',
        'data-id': 7,
        'aria-hidden': false,
        hidden: false,
        width: 10,
      }, {}, null,
    );
    expect(label.outerHTML).toBe('<label class="a" for="x" title="t" data-id="7" aria-hidden="false" width="10"></label>');
    diffProps(
      label, {
        className: 'a',
        'data-id': null,
        hidden: true,
      }, {
        className: 'a',
        htmlFor: 'x',
        title: 't',
        'data-id': 7,
        'aria-hidden': false,
        width: 10,
      }, null,
    );
    expect(label.outerHTML).toBe('<label class="a" hidden=""></label>');
  });

  it('a read-only property is written as an attribute; functions that are not handlers are skipped', () => {
    const input = document.createElement('input');
    setProp(
      input, 'list', 'options', undefined, null,
    );
    expect(input.getAttribute('list')).toBe('options');
    const div = document.createElement('div');
    const strict = document.createElement('div');
    Object.defineProperty(
      strict, 'locked', {
        get: () => 1,
        set: () => {
          throw new TypeError('read-only');
        },
      },
    );
    setProp(
      strict, 'locked', 'x', undefined, null,
    );
    expect(strict.getAttribute('locked')).toBe('x');
    setProp(
      div, 'render', () => 1, undefined, null,
    );
    expect(div.hasAttribute('render')).toBe(false);
  });

  it('style: an object diffed, numbers in px unless unitless, custom properties, strings', () => {
    const div = document.createElement('div');
    setProp(
      div, 'style', {
        width: 10,
        opacity: 0.5,
        '--gap': '4px',
        color: 'red',
      }, undefined, null,
    );
    expect(div.style.width).toBe('10px');
    expect(div.style.opacity).toBe('0.5');
    expect(div.style.getPropertyValue('--gap')).toBe('4px');
    setProp(
      div, 'style', {
        width: 10,
        '--gap': null,
        color: null,
      }, {
        width: 10,
        opacity: 0.5,
        '--gap': '4px',
        color: 'red',
      }, null,
    );
    expect(div.style.cssText).toBe('width: 10px;');
    setProp(
      div, 'style', 'color: blue', {
        width: 10,
      }, null,
    );
    expect(div.style.cssText).toBe('color: blue;');
    setProp(
      div, 'style', {
        height: 1,
      }, 'color: blue', null,
    );
    expect(div.style.cssText).toBe('height: 1px;');
    setProp(
      div, 'style', null, {
        height: 1,
      }, null,
    );
    expect(div.style.cssText).toBe('');
  });
});

describe('vdom — events', () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => container.remove());

  it('handlers swapped without re-listening, removed; React event members', () => {
    const root = createRoot(container);
    const seen: any[] = [];
    const first = (event: any): void => {
      seen.push([
        'first',
        event.nativeEvent === event,
        event.isDefaultPrevented(),
        event.isPropagationStopped(),
      ]);
      event.persist();
    };
    root.render(h('button', {
      onClick: first,
    }));
    const button = container.firstChild as HTMLButtonElement;
    button.click();
    root.render(h('button', {
      onClick: (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        seen.push([
          'second',
          event.isDefaultPrevented(),
          event.isPropagationStopped(),
        ]);
      },
    }));
    button.click();
    root.render(h('button', {
      onClick: null,
    }));
    button.click();
    root.render(h('button'));
    expect(seen).toEqual([
      [
        'first',
        true,
        false,
        false,
      ],
      [
        'second',
        true,
        true,
      ],
    ]);
    root.unmount();
  });

  it('React names to DOM events: change of a text field is input, double click, focus / blur bubble, capture', () => {
    const root = createRoot(container);
    const seen: string[] = [];
    const log = (name: string) => (event: any): void => {
      seen.push(name + ':' + event.type);
    };
    root.render(h(
      'div', {
        onFocus: log('focus'),
        onBlur: log('blur'),
        onClickCapture: log('capture'),
        onGotPointerCapture: log('got'),
      },
      h('input', {
        onChange: log('text'),
      }),
      h('textarea', {
        onChange: log('area'),
      }),
      h('input', {
        type: 'checkbox',
        onChange: log('box'),
      }),
      h('select', {
        onChange: log('select'),
      }),
      h('span', {
        onDoubleClick: log('double'),
      }),
    ));
    const [
      text,
      area,
      box,
      select,
    ] = Array.from(container.querySelectorAll('input, textarea, select')) as HTMLElement[];
    text.dispatchEvent(new Event('input', {
      bubbles: true,
    }));
    area.dispatchEvent(new Event('input', {
      bubbles: true,
    }));
    box.dispatchEvent(new Event('change', {
      bubbles: true,
    }));
    select.dispatchEvent(new Event('change', {
      bubbles: true,
    }));
    container.querySelector('span')!.dispatchEvent(new MouseEvent('dblclick', {
      bubbles: true,
    }));
    text.focus();
    text.blur();
    box.click();
    container.firstChild!.dispatchEvent(new Event('gotpointercapture'));
    expect(seen).toEqual([
      'text:input',
      'area:input',
      'box:change',
      'select:change',
      'double:dblclick',
      'focus:focusin',
      'blur:focusout',
      'capture:click',
      'box:change',
      'got:gotpointercapture',
    ]);
    root.unmount();
  });
});
