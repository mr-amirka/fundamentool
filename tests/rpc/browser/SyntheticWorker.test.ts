/**
 * @jest-environment jsdom
 */
/**
 * `SyntheticWorker` — a worker in the same realm: messages wait until the script calls `start()`; the index counter
 * shared through the global context; a script that can't be loaded leaves the next worker free to start.
 */
import {
  SyntheticWorker,
} from '../../../src/rpc/browser/SyntheticWorker';

describe('SyntheticWorker', () => {
  it('messages wait until start(); start() twice does nothing more', () => {
    const worker = new SyntheticWorker('http://localhost/missing-worker.js');
    const seen: unknown[] = [];
    worker.addEventListener('message', (event) => seen.push((event as MessageEvent).data));
    worker.postMessage(1);
    worker.postMessage(2);
    expect(seen).toEqual([]);
    worker.start();
    expect(seen).toEqual([
      1,
      2,
    ]);
    worker.postMessage(3); // started: at once
    worker.start();
    expect(seen).toEqual([
      1,
      2,
      3,
    ]);
  });

  it('the index counts up across workers; connect() waits for the worker that loads the script', async () => {
    const first = await SyntheticWorker.incrementIndex();
    const second = await SyntheticWorker.incrementIndex();
    expect(second).toBe(first + 1);
    let connected = false;
    void SyntheticWorker.connect().then(() => {
      connected = true;
    });
    // A script that can't be loaded: its load fails quietly, the chain goes on
    void new SyntheticWorker('http://localhost/missing-worker.js');
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(connected).toBe(false);
  });
});
