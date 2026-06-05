import { aggregate } from '../src/aggregate';

describe('aggregate | aggregate functions array into one function', () => {
  test('with outputs array', () => {
    const outputs: number[] = [];
    const aggregateFn = aggregate([
      (a: number, b: number) => {
        outputs.push(a + b);
      },
      (a: number, b: number) => {
        outputs.push(a * b);
      },
      (a: number, b: number) => {
        outputs.push(a - b);
      },
      (a: number, b: number) => {
        outputs.push(b - a);
      },
    ]);

    expect(outputs).toEqual([]);
    aggregateFn(5, 7);
    expect(outputs).toEqual([12, 35, -2, 2]);
  });

  test('with this', () => {
    const self: { v: number } = { v: 0 };
    const aggregateFn = aggregate([
      function (this: { v: number }, v: number) {
        this.v += 2 * v;
      },
      function (this: { v: number }, v: number) {
        this.v += 5 * v;
      },
      function (this: { v: number }, v: number) {
        this.v += v;
      },
    ]);

    expect(self.v).toEqual(0);
    aggregateFn.call(self, 2);
    expect(self.v).toEqual(16);
  });
});

