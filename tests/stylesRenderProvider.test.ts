import {
  stylesRenderProvider, 
} from '../src/stylesRenderProvider';

function makeDoc() {
  const elements: Record<string, any> = {};
  const headChildren: any[] = [];

  const head: any = {
    appendChild: jest.fn((node) => {
      const idx = headChildren.indexOf(node);
      if (idx !== -1) {
        headChildren.splice(idx, 1);
      }
      headChildren.push(node);
    }),
    removeChild: jest.fn((node) => {
      const idx = headChildren.indexOf(node);
      if (idx !== -1) {
        headChildren.splice(idx, 1);
      }
    }),
    get children() {
      return headChildren; 
    },
  };

  const doc: any = {
    head,
    getElementById: jest.fn((id: string) => elements[id] || null),
    createElement: jest.fn((tag: string) => {
      const node: any = {
        tag,
        id: '',
        childNodes: [],
        get length() {
          return this.childNodes.length; 
        },
        setAttribute: jest.fn(function (attr: string, val: string) {
          this[attr] = val; 
        }),
        removeChild: jest.fn(),
        appendChild: jest.fn(),
        get parentNode() {
          return headChildren.includes(this) ? head : null; 
        },
      };
      return node;
    }),
    createTextNode: jest.fn((text: string) => ({
      text, 
    })),
  };

  return {
    doc,
    head,
    elements,
    headChildren, 
  };
}

describe('stylesRenderProvider', () => {
  test('creates and appends a style element on first render', () => {
    const {
      doc, headChildren, 
    } = makeDoc();
    const render = stylesRenderProvider(doc, 'app-');

    render([{
      name: 'theme',
      revision: 1,
      content: 'body{}', 
    }]);

    expect(doc.createElement).toHaveBeenCalledWith('style');
    expect(headChildren).toHaveLength(1);
  });

  test('does not recreate element on re-render with same revision', () => {
    const {
      doc, 
    } = makeDoc();
    const render = stylesRenderProvider(doc, 'app-');

    render([{
      name: 'theme',
      revision: 1,
      content: 'body{}', 
    }]);
    const callCount = (doc.createElement as jest.Mock).mock.calls.length;

    render([{
      name: 'theme',
      revision: 1,
      content: 'body{}', 
    }]);

    expect(doc.createElement).toHaveBeenCalledTimes(callCount);
  });

  test('updates style content when revision changes', () => {
    const {
      doc, headChildren, 
    } = makeDoc();
    const render = stylesRenderProvider(doc, 'app-');

    render([{
      name: 'theme',
      revision: 1,
      content: 'old {}', 
    }]);
    render([{
      name: 'theme',
      revision: 2,
      content: 'new {}', 
    }]);

    const node = headChildren[0];
    expect(node.appendChild).toHaveBeenCalled();
  });

  test('removes style element when it disappears from list', () => {
    const {
      doc, head, 
    } = makeDoc();
    const render = stylesRenderProvider(doc, 'app-');

    render([{
      name: 'theme',
      revision: 1,
      content: 'body{}', 
    }]);
    render([]);

    expect(head.removeChild).toHaveBeenCalled();
  });

  test('manages multiple styles independently', () => {
    const {
      doc, headChildren, 
    } = makeDoc();
    const render = stylesRenderProvider(doc, 'x-');

    render([{
      name: 'a',
      revision: 1,
      content: '.a{}', 
    }, {
      name: 'b',
      revision: 1,
      content: '.b{}', 
    }]);

    expect(headChildren).toHaveLength(2);
  });

  test('does nothing when head is not available', () => {
    const {
      doc, 
    } = makeDoc();
    (doc as any).head = null;
    const render = stylesRenderProvider(doc, 'app-');

    expect(() => render([{
      name: 'theme',
      revision: 1,
      content: 'body{}', 
    }])).not.toThrow();
  });
});
