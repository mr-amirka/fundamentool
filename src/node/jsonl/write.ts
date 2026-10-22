import type {
  CreateWriteStreamOptions,
} from 'fs/promises';
import {
  createWriteStream,
  mkdir,
} from 'fs';
import {
  dirname,
} from 'path';
import {
  TransformTo,
} from './TransformTo';

/**
 * Creates a writable stream for writing JSONL data to a file (its folder made first).
 *
 * The stream finishes when the file is written — `'finish'` (and `finished()`, `pipeline()`) can be followed by
 * reading the file. A failure of the file (it can't be made or opened: a folder in the way, no rights) is the stream's
 * `'error'`.
 *
 * @param path - The path to the file to write to.
 * @param options - The options to pass to the writable stream.
 * @returns A writable stream for writing JSONL data to a file.
 * @example
 * const out = write('./data/rows.jsonl');
 * out.write({ a: 1 });
 * out.end();
 * await finished(out); // the file holds the rows now
 */
export const write = (path: string, options?: CreateWriteStreamOptions): NodeJS.WritableStream => {
  const writable: any = new (TransformTo as any)();
  // The file stream, once its folder is made: what `_final` waits for
  const file = new Promise<NodeJS.WritableStream>((resolve) => {
    mkdir(
      dirname(path),
      {
        recursive: true,
      },
      (error: NodeJS.ErrnoException | null) => {
        if (error) {
          writable.destroy(error);
          return;
        }
        const stream = createWriteStream(path, {
          encoding: 'utf8',
          ...(options || {}),
        });
        stream.on('error', (fileError: Error) => writable.destroy(fileError));
        writable.pipe(stream);
        resolve(stream);
      },
    );
  });

  // A Transform finishes when its own side is done; this one — when the file has the last row
  const final = writable._final;
  writable._final = function (this: any, done: (error?: Error | null) => void) {
    final.call(this, (error?: Error | null) => {
      if (error) {
        done(error);
        return;
      }
      file.then((stream) => stream.once('finish', () => done()));
    });
  };

  return writable;
};
