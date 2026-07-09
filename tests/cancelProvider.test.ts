import {
  cancelProvider, 
} from '../src/cancelProvider';

describe('cancelProvider', () => {
  test('calls clearFn with id when invoked', () => {
    const cleared: any[] = [];
    const cancel = cancelProvider((id) => cleared.push(id), 123);
    cancel();
    expect(cleared).toEqual([123]);
  });

  test('can be called multiple times', () => {
    const cleared: any[] = [];
    const cancel = cancelProvider((id) => cleared.push(id), 'my-id');
    cancel();
    cancel();
    expect(cleared).toEqual(['my-id', 'my-id']);
  });

  test('works with clearTimeout mock', () => {
    jest.useFakeTimers();
    const id = setTimeout(() => {}, 1000);
    const cancel = cancelProvider(clearTimeout, id);
    cancel();
    jest.useRealTimers();
  });
});
