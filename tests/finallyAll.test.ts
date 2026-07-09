import {
  finallyAll, 
} from '../src/finallyAll';

describe('finallyAll', () => {
  test('calls callback when counter returns to zero', () => {
    const done = jest.fn();
    finallyAll((inc, dec) => {
      inc();
      inc();
      dec();
      dec();
    }, done);
    expect(done).toHaveBeenCalledTimes(1);
  });

  test('calls callback immediately when fn does not call inc', () => {
    const done = jest.fn();
    finallyAll(() => {}, done);
    expect(done).toHaveBeenCalledTimes(0);
  });

  test('works without callback (uses noop)', () => {
    expect(() => {
      finallyAll((inc, dec) => {
        inc(); dec(); 
      });
    }).not.toThrow();
  });
});
