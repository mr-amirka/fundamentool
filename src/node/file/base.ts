import {
  writeFile,
  readFile,
  mkdir,
  readdir,
  WriteFileOptions,
  access as originAccess,
  constants,
} from 'fs';
import {
  dirname,
} from 'path';

type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';


/**
 * Checks whether a file is readable (exists and has read permission).
 *
 * @param path - File path to check.
 * @returns Promise resolved with `true` if readable, `false` otherwise.
 * @example
 * const readable = await access('./data.json'); // => true or false
 */
export const access = async (path: string) => {
  return new Promise((resolve) => {
    originAccess(
      path, constants.R_OK, (err) => {
        resolve(!err);
      },
    );
  });
};

/**
 * Creates a directory recursively (like `mkdir -p`).
 *
 * @param path - Directory path to create.
 * @returns Promise resolved when the directory is created.
 * @example
 * await makeDir('./output/reports');
 */
export const makeDir = (path: string) => {
  return new Promise<void>((resolve, reject) => {
    mkdir(
      path, {
        recursive: true,
      }, (error: any) => {
        error ? reject(error) : resolve();
      },
    );
  });
};

/**
 * Writes data to a file, creating parent directories as needed.
 *
 * @param path - Destination file path.
 * @param data - Data to write.
 * @param options - Optional `fs.writeFile` options.
 * @returns Promise resolved when the write is complete.
 * @example
 * await write('./output/result.json', JSON.stringify(data));
 */
export const write = (
  path: string, data: string | NodeJS.ArrayBufferView, options: WriteFileOptions = {},
) => {
  return new Promise<void>((resolve, reject) => {
    const dirPath = dirname(path);
    dirPath ? mkdir(
      dirPath, {
        recursive: true,
      }, (error: any) => {
        error ? reject(error) : write();
      },
    ) : write();
    
    function write() {
      writeFile(
        path, data, options, (error: any) => {
          error ? reject(error) : resolve();
        },
      );
    }
  });
};

/**
 * Reads a file and resolves with its content.
 *
 * @param path - File path to read.
 * @param options - Encoding or `fs.readFile` options (default: `'utf8'`).
 * @returns Promise resolved with the file content.
 * @example
 * const content = await read('./data.json'); // => '{"a":1}'
 */
export const read = (path: string, options: BufferEncoding | ({
    encoding?: null | undefined;
    flag?: string | undefined;
    /**
    * When provided the corresponding `AbortController` can be used to cancel an asynchronous action.
    */
    signal?: AbortSignal | undefined;
}) | undefined | null = 'utf8') => {
  return new Promise<any>((resolve, reject) => {
    readFile(
      path, options, (error: any, result) => {
        error ? reject(error) : resolve(result);
      },
    );
  });
};

/**
 * Lists files in a directory.
 *
 * @param path - Directory path to list.
 * @returns Promise resolved with an array of file names.
 * @example
 * const files = await readDir('./src'); // => ['index.ts', 'utils.ts', ...]
 */
export async function readDir(path: string) {
  return new Promise((resolve, reject) => {
    readdir(path, (err, files) => {
      err ? reject(err) : resolve(files);
    });
  });
}