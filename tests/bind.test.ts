import {
  bind, 
} from '../src/bind';

describe('bind', () => {
  test('add args', () => {
    const log = jest.fn();
    const consoleObj = {
      log,
    };

    const logInfo = bind(
      consoleObj.log, consoleObj, ['info:'],
    );
    expect(log.mock.calls.length).toBe(0);

    logInfo('Хрю!');
    expect(log.mock.calls.length).toBe(1);
    expect(log.mock.calls[0]).toEqual(['info:', 'Хрю!']);
  });

  test('add several args', () => {
    const log = jest.fn();
    const consoleObj = {
      log,
    };

    const logBinded = bind(
      consoleObj.log, consoleObj, ['a', 'b'],
    );
    expect(log.mock.calls.length).toBe(0);

    logBinded(
      'c', 'd', 'e',
    );
    expect(log.mock.calls.length).toBe(1);
    expect(log.mock.calls[0]).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  test('context', () => {
    let ctx: any = null;
    function log(this: any) {
      ctx = this;
    }
    const consoleObj = {
      log,
    };

    const logInfo = bind(
      consoleObj.log, consoleObj, ['info:'],
    );
    expect(ctx).toBe(null);

    logInfo('Ups!');
    expect(ctx).toBe(consoleObj);
  });
});

