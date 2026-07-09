import type {
  CreateWriteStreamOptions, 
} from 'fs/promises';
import {
  createWriteStream, mkdir, 
} from 'fs';
import {
  dirname, 
} from 'path';
import {
  TransformTo, 
} from './TransformTo';


/**
 * Creates a writable stream for writing JSONL data to a file.
 * @param path - The path to the file to write to.
 * @param options - The options to pass to the writable stream.
 * @returns A writable stream for writing JSONL data to a file.
 * @example
 * const out = write('./data.jsonl');
 * out.write({ a: 1 });
 * out.end();
 */
export const write = (path: string, options?: CreateWriteStreamOptions): NodeJS.WritableStream => {
  const writable: any = new (TransformTo as any)();
  const dname = dirname(path);

  function base(error?: NodeJS.ErrnoException | null): void {
    if (error) {
      writable.destroy(error);
      return;
    }
    writable.pipe(createWriteStream(path, {
      encoding: 'utf8',
      ...(options || {}),
    }));
  }

  if (dname) {
    mkdir(
      dname,
      {
        recursive: true,
      },
      base,
    );
  } else {
    base();
  }

  return writable;
};
