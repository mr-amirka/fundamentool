import { create } from '../src/create';

describe('create', () => {
  test('creates object with given prototype', () => {
    const proto = { a: 1 };
    const obj = create(proto);

    expect(Object.getPrototypeOf(obj)).toBe(proto);
    // свойства прототипа доступны через прототип
    expect((obj as any).a).toBe(1);
    expect(obj).toHaveProperty('a', 1);
  });

  test('allows null prototype but throws for primitives', () => {
    expect(() => create(null as any)).not.toThrow();
    expect(() => create(1 as any)).toThrow(TypeError);
  });
});
