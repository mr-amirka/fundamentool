import {
  wait, 
} from '../src/wait';
import {
  noop, 
} from '../src/noop';
import {
  getUniqId, 
} from '../src/getUniqId';
import {
  attachEvent, 
} from '../src/attachEvent';

describe('core basics', () => {
  test('wait resolves with provided value', async () => {
    const value = {
      a: 1, 
    };
    const result = await wait(0, value);
    expect(result).toBe(value);
  });

  test('noop does nothing and returns undefined', () => {
    expect(noop()).toBeUndefined();
  });

  test('getUniqId increments and supports prefix', () => {
    const id1 = getUniqId();
    const id2 = getUniqId();
    expect(parseInt(id2, 10)).toBeGreaterThan(parseInt(id1, 10));

    const prefixed = getUniqId('p-');
    expect(prefixed.startsWith('p-')).toBe(true);
  });

  test('attachEvent registers and unregisters listener', () => {
    const calls: Array<{ type: string;
listener: any;
options: any }> = [];

    const target = {
      addEventListener(
        type: string, listener: any, options?: any,
      ) {
        calls.push({
          type,
          listener,
          options, 
        });
      },
      removeEventListener(
        type: string, listener: any, options?: any,
      ) {
        calls.push({
          type: `remove:${type}`,
          listener,
          options, 
        });
      },
    } as any;

    const listener = () => undefined;
    const unsubscribe = attachEvent(
      target, 'click', listener, {
        passive: true, 
      },
    );

    expect(calls).toEqual([{
      type: 'click',
      listener,
      options: {
        passive: true, 
      }, 
    }]);

    unsubscribe();

    expect(calls).toEqual([{
      type: 'click',
      listener,
      options: {
        passive: true, 
      }, 
    }, {
      type: 'remove:click',
      listener,
      options: {
        passive: true, 
      }, 
    }]);
  });
});

