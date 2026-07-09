import {
  withResult, 
} from '../src/withResult';

describe('withResult', () => {
  test('calls original function and returns fixed result', () => {
    const sideEffect = jest.fn();
    const handler = withResult(sideEffect, false);
    const result = handler(1, 2);
    expect(sideEffect).toHaveBeenCalledWith(1, 2);
    expect(result).toBe(false);
  });

  test('always returns the given constant', () => {
    const handler = withResult(() => 99, 'constant');
    expect(handler()).toBe('constant');
  });

  test('uses provided context', () => {
    const ctx = {
      value: 42, 
    };
    let capturedThis: any;
    const handler = withResult(
      function(this: any) {
        capturedThis = this; 
      }, null, ctx,
    );
    handler();
    expect(capturedThis).toBe(ctx);
  });
});
