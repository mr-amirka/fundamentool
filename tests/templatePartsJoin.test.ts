import { templatePartsJoin } from '../src/templatePartsJoin';

describe('templatePartsJoin', () => {
  test('joins static string parts', () => {
    const render = templatePartsJoin([() => 'Hello', () => ' ', () => 'World']);
    expect(render({})).toBe('Hello World');
  });

  test('renders dynamic parts from scope', () => {
    const render = templatePartsJoin([
      () => 'Hi, ',
      (scope: any) => scope.name,
      () => '!',
    ]);
    expect(render({ name: 'Alice' })).toBe('Hi, Alice!');
  });

  test('returns empty string for empty parts', () => {
    const render = templatePartsJoin([]);
    expect(render({})).toBe('');
  });

  test('handles undefined part value as empty', () => {
    const render = templatePartsJoin([() => undefined]);
    expect(render({})).toBe('');
  });

  test('handles numeric part values', () => {
    const render = templatePartsJoin([() => 42]);
    expect(render({})).toBe('42');
  });
});
