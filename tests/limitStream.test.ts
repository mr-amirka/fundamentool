/**
 * `limitStream` — an object stream read in portions of at most `limit` items: the portions, then `[]` after its end, an
 * error rejecting the waiting and every later portion.
 */
import {
  EventEmitter,
} from 'events';
import {
  Readable,
} from 'stream';
import {
  limitStream,
} from '../src/limitStream';

describe('limitStream', () => {
  it('portions of at most `limit`; after the end — empty ones; close closes the stream', async () => {
    const stream = Readable.from([
      1,
      2,
      3,
    ]) as Readable & { close?: () => void };
    stream.close = jest.fn();
    const next = limitStream(stream, 2);
    expect(await next()).toEqual([
      1,
      2,
    ]);
    expect(await next()).toEqual([3]); // the rest was buffered already — taken at once
    expect(await next()).toEqual([]); // the end
    expect(await next()).toEqual([]);
    next.close();
    expect(stream.close).toHaveBeenCalled();
  });

  it('an error rejects the waiting portion and every later one; a read that throws is an error too', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const stream = new Readable({
        objectMode: true,
        read() {},
      });
      const next = limitStream(stream);
      const waiting = next();
      const failure = new Error('disk');
      stream.destroy(failure);
      await expect(waiting).rejects.toBe(failure);
      await expect(next()).rejects.toBe(failure);

      // A stream whose read throws: only what limitStream uses (a real Readable reads by itself on 'readable')
      const throwing = Object.assign(new EventEmitter(), {
        read: () => {
          throw new Error('bad read');
        },
      }) as unknown as NodeJS.ReadableStream;
      const portion = limitStream(throwing)();
      throwing.emit('readable');
      await expect(portion).rejects.toThrow('bad read');
    } finally {
      error.mockRestore();
    }
  });
});
