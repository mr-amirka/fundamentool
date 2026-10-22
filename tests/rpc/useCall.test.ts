/**
 * `useCall()` (fundamentool D-055): an exported method reaches its own call at its top — the context stays right after
 * any `await`, two calls running at once each keep theirs; anywhere else it throws at once. `this` stays the method's
 * own object. The context keeps its promises: `interrupt` rejects when the client gives up; its members may be taken
 * apart.
 */
import {
  RpcClient,
} from '../../src/rpc/RpcClient';
import {
  RpcConnect,
  useCall,
} from '../../src/rpc/RpcConnect';
import {
  makeChannel,
} from './_channel';

/** Lets the channel's promises and timers settle. */
const flush = (ms = 0) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

/** A client and a server over one channel (`serializable: false` — plain values, no coder). */
function pair(exports: Record<string, any>, serializable = true) {
  const {
    clientOptions, serverOptions,
  } = makeChannel();
  const connect = new RpcConnect({
    ...serverOptions,
    exports,
    serializable,
  });
  const client = new RpcClient({
    ...clientOptions,
    serializable,
  });
  const heard: unknown[] = [];
  client.subscribe((data: unknown) => heard.push(data));
  return {
    client,
    connect,
    heard,
  };
}

const RULE = '[fundamentool] useCall: call it at the top of an exported method, before its first await';

describe('useCall — the call\'s context at the top of an exported method', () => {
  let error: jest.SpyInstance;
  beforeEach(() => {
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    error.mockRestore();
  });

  it('captured at the top, it stays this call after every await — two calls at once each keep their own', async () => {
    const {
      client, heard,
    } = pair({
      async report(name: string, pages: number) {
        const call = useCall();
        for (let page = 1; page <= pages; page++) {
          await call.interrupt(5);
          call.dispatch(`${name} ${page}/${pages}`);
        }
        return `${name}.pdf`;
      },
    });
    const both = Promise.all([
      client.call('report', [
        'a',
        2,
      ]),
      client.call('report', [
        'b',
        3,
      ]),
    ]);
    await expect(both).resolves.toEqual([
      'a.pdf',
      'b.pdf',
    ]);
    await flush();
    expect([...heard].sort()).toEqual([
      'a 1/2',
      'a 2/2',
      'b 1/3',
      'b 2/3',
      'b 3/3',
    ]);
  });

  it('after an await, or outside an exported method — an error at once, naming the rule', async () => {
    const {
      client,
    } = pair({
      async late() {
        await Promise.resolve();
        return useCall();
      },
    });
    await expect(client.call('late')).rejects.toThrow(RULE);
    expect(() => useCall()).toThrow(RULE);
  });

  it('`this` stays the method\'s own object: a counter counts', async () => {
    const {
      client,
    } = pair({
      counter: {
        count: 0,
        inc(this: { count: number }) {
          return ++this.count;
        },
      },
    });
    await expect(client.call('counter.inc')).resolves.toBe(1);
    await expect(client.call('counter.inc')).resolves.toBe(2);
  });

  it('interrupt waits and gives its value; when the client gives up it rejects at once — the signal aborted', async () => {
    let signal: { aborted: boolean } | undefined;
    let stopped: unknown;
    const {
      client,
    } = pair({
      async wait(value: string) {
        return useCall().interrupt(5, value);
      },
      async crawl() {
        const call = useCall();
        signal = call.signal as never;
        try {
          await call.interrupt(10000);
        } catch (caught) {
          stopped = caught;
        }
        try {
          await call.interrupt(1); // aborted already: at once
        } catch (caught) {
          return (caught as Error).message;
        }
      },
    });
    await expect(client.call('wait', ['done'])).resolves.toBe('done');

    const controller = new AbortController();
    const crawling = client.call(
      'crawl', [], {
        signal: controller.signal,
      },
    ).catch((caught: Error) => caught.name);
    await flush();
    controller.abort();
    await expect(crawling).resolves.toBe('AbortError');
    await flush();
    expect(signal?.aborted).toBe(true);
    expect(stopped).toEqual(new Error('[fundamentool] interrupt: the call was aborted by the client'));
  });

  it('its members may be taken apart; dispatchToAll reaches every connection; a subscription method has its call too', async () => {
    const {
      client, heard,
    } = pair({
      async announce(text: string) {
        const {
          dispatchToAll, getConnections,
        } = useCall();
        dispatchToAll(text);
        return getConnections().length;
      },
      watch(listener: (value: string) => void) {
        const {
          dispatch,
        } = useCall();
        dispatch('watching');
        listener('first');
        return () => undefined;
      },
    });
    await expect(client.call('announce', ['price list changed'])).resolves.toBe(1);
    const seen: string[] = [];
    const unsubscribe = client.on('watch', [(value: string) => seen.push(value)]);
    await flush(5);
    unsubscribe();
    await flush();
    expect(heard).toEqual([
      'price list changed',
      'watching',
    ]);
    expect(seen).toEqual(['first']);
  });

  it('over a plain connection (not serializable) the context sends values as they are', async () => {
    const {
      client, heard,
    } = pair({
      async tell() {
        const call = useCall();
        call.dispatch({
          to: 'one',
        });
        call.dispatchToAll({
          to: 'all',
        });
        return true;
      },
    }, false);
    await expect(client.call('tell')).resolves.toBe(true);
    await flush();
    expect(heard).toEqual([
      {
        to: 'one',
      },
      {
        to: 'all',
      },
    ]);
  });
});
