import {
  templateProvider, 
} from '../src/templateProvider';
import {
  templatePartsJoin, 
} from '../src/templatePartsJoin';

describe('templatePartsJoin', () => {
  test('joins parts by calling each with scope', () => {
    const parts = [(s: Record<string, unknown>) => String(s.a), (s: Record<string, unknown>) => String(s.b)];
    const t = templatePartsJoin(parts);
    expect(t({
      a: 1,
      b: 2, 
    })).toBe('12');
  });
});

describe('templateProvider', () => {
  test('replaces {{path}} with scope value', () => {
    const t = templateProvider('Hello {{name}}!');
    expect(t({
      name: 'World', 
    })).toBe('Hello World!');
  });
  test('multiple placeholders', () => {
    const t = templateProvider('{{a}}-{{b}}-{{c}}');
    expect(t({
      a: 1,
      b: 2,
      c: 3, 
    })).toBe('1-2-3');
  });
  test('nested path', () => {
    const t = templateProvider('{{user.name}}');
    expect(t({
      user: {
        name: 'Vasya', 
      }, 
    })).toBe('Vasya');
  });
});
