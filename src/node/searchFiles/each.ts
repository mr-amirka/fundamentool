import { Stats, lstat, readdir } from 'fs';
import { join, basename } from 'path';
import { noop } from '../../noop';

export interface ISearchFilesOptions {
  filter?: (name: string, isDir: boolean, depth: number) => boolean;
  iteratee?: (path: string) => void;
}

/**
 * Recursively walks over files starting from `folderPath`, calling `iteratee`
 * for each file that passes `filter`.
 *
 * @param folderPath - Root directory path to walk.
 * @param options - Optional `filter` and `iteratee` callbacks.
 * @returns Promise resolved when the full walk is complete.
 * @example
 * await each('./src', {
 *   iteratee: (path) => console.log(path),
 * });
 */
export function each(
  folderPath: string,
  options: ISearchFilesOptions = {},
): Promise<void> {
  return new Promise((resolve) => {
    const filter = options.filter || defaultFilter;
    const iteratee = options.iteratee || noop;
    const stop = false;
    let taskCount = 0;

    function dec(): void {
      if (--taskCount === 0) {
        resolve();
      }
    }

    function base(path: string, name: string, depth: number): void {
      taskCount++;
      lstat(path, (err: NodeJS.ErrnoException | null, stats: Stats) => {
        if (stop) {
          return;
        }
        if (err) {
          dec();
          return;
        }
        const isDir = stats.isDirectory();
        if (!filter(name, isDir, depth)) {
          dec();
          return;
        }
        if (!isDir) {
          iteratee(path);
          dec();
          return;
        }
        readdir(path, (readErr, files) => {
          if (stop) {
            return;
          }
          if (readErr) {
            dec();
            return;
          }
          const nextDepth = depth + 1;
          const length = files.length;
          for (let i = 0; i < length; i++) {
            const childName = files[i];
            base(join(path, childName), childName, nextDepth);
          }
          dec();
        });
      });
    }

    function defaultFilter(): boolean {
      return true;
    }

    base(folderPath, basename(folderPath), 0);
  });
}