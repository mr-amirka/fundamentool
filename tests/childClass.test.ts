import {
  childClass, 
} from '../src/childClass';

function Parent(this: any, v: number) {
  (this as any).value = v;
}

(Parent as any).prototype = {
  inc(this: any) {
    this.value += 1;
  },
};

describe('childClass', () => {
  test('wraps Parent constructor with custom constructor logic', () => {
    const C = childClass(
      Parent as any,
      (
        self, superFn, v: number,
      ) => {
        superFn(v * 2);
        (self as any).extra = v;
      },
      {},
    );

    const instance: any = new (C as any)(10);

    expect(instance.value).toBe(20);
    expect(instance.extra).toBe(10);
    instance.inc();
    expect(instance.value).toBe(21);
  });
});
