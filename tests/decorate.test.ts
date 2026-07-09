import {
  decorate, 
} from '../src/decorate';

describe('decorate', () => {
  test('calls original function', () => {
    const fn = decorate((x: number) => x * 2, [] as any[]);
    expect((fn as any)(3)).toBe(6);
  });

  test('applies single decorator', () => {
    const double = decorate((x: number) => x,
      ((emit: any) => (x: number) => emit(x) * 2) as any);
    expect((double as any)(5)).toBe(10);
  });

  test('applies array of decorators - last applied runs outermost', () => {
    const calls: string[] = [];
    const fn = decorate((x: number) => x,
      [((emit: any) => (x: number) => {
        calls.push('first'); return emit(x); 
      }) as any, ((emit: any) => (x: number) => {
        calls.push('second'); return emit(x); 
      }) as any]);
    (fn as any)(1);
    // d2 wraps d1, so d2 ('second') runs before d1 ('first')
    expect(calls).toEqual(['second', 'first']);
  });

  test('use() adds additional decorator', () => {
    const calls: string[] = [];
    const fn = decorate((x: number) => x, [] as any[]);
    fn.use(((emit: any) => (x: number) => {
      calls.push('extra'); return emit(x); 
    }) as any);
    (fn as any)(1);
    expect(calls).toEqual(['extra']);
  });

  test('returns instance from use()', () => {
    const fn = decorate((x: number) => x, [] as any[]);
    expect(fn.use((e: any) => e)).toBe(fn);
  });
});
