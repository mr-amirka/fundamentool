import { setStyleSheet } from '../src/setStyleSheet';

function makeNode(childTexts: string[] = []): any {
  const children: any[] = childTexts.map((text) => ({ type: 'text', text }));
  return {
    childNodes: children,
    get length() { return children.length; },
    removeChild: jest.fn((child) => {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
    }),
    appendChild: jest.fn((child) => children.push(child)),
  };
}

function makeDocument() {
  return {
    createTextNode: jest.fn((text: string) => ({ type: 'text', text })),
  };
}

describe('setStyleSheet', () => {
  test('appends text node when no styleSheet property', () => {
    const node = makeNode();
    const doc = makeDocument();

    setStyleSheet(node as any, 'body { margin: 0; }', doc as any);

    expect(doc.createTextNode).toHaveBeenCalledWith('body { margin: 0; }');
    expect(node.appendChild).toHaveBeenCalled();
  });

  test('removes existing child nodes before appending new one', () => {
    const node = makeNode(['old text']);
    const doc = makeDocument();

    setStyleSheet(node as any, '.new {}', doc as any);

    expect(node.removeChild).toHaveBeenCalledTimes(1);
    expect(node.appendChild).toHaveBeenCalledTimes(1);
  });

  test('sets cssText directly when styleSheet property exists', () => {
    const node: any = makeNode();
    node.styleSheet = { cssText: '' };
    const doc = makeDocument();

    setStyleSheet(node, '.old { color: red; }', doc as any);

    expect(node.styleSheet.cssText).toBe('.old { color: red; }');
    expect(doc.createTextNode).not.toHaveBeenCalled();
  });
});
