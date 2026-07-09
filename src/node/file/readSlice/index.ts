import {
  open, read, close, 
} from 'fs';
import {
  noop, 
} from '../../../noop';
import {
  createTimeout, 
} from '../../../createTimeout';

const DEFAULT_BUFFER_LENGTH = 1024 * 8;
const READ_TIMEOUT = 60000;

interface IReadSliceResult {
  /** Bytes read, or `null` when the read reached EOF at 0 bytes. */
  buffer: Buffer | null;
  /** Position right after the read slice — pass as the next call's `position` to continue reading. */
  position: number;
}

/**
 * Reads a slice of `bufferLength` bytes from `path` starting at `position`.
 *
 * Each attempt is bounded by `readTimeout`; on timeout the file descriptor
 * is closed and reopened up to `additionaAttemptLimit` extra times before
 * the promise rejects. Pass `signal` to abort early.
 *
 * @param path - File path to read from.
 * @param position - Byte offset to start reading at (default `0`).
 * @param bufferLength - Number of bytes to read per attempt (default 8 KiB).
 * @param readTimeout - Timeout per attempt in ms (default 60000).
 * @param additionaAttemptLimit - Extra retries after a timeout before rejecting (default `0`).
 * @param signal - Optional `AbortSignal` to cancel the read early.
 * @returns Promise resolving to the read buffer (or `null` at EOF) and the next `position`.
 * @example
 * const { buffer, position } = await readSlice('/tmp/big.log', 0, 4096);
 * const next = await readSlice('/tmp/big.log', position, 4096);
 */
export const readSlice = (
  path: string,
  position: number = 0,
  bufferLength: number = DEFAULT_BUFFER_LENGTH,
  readTimeout: number = READ_TIMEOUT,
  additionaAttemptLimit: number = 0,
  signal?: AbortSignal,
): Promise<IReadSliceResult> => {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.allocUnsafe(bufferLength);
    let fd: number | 0 = 0;
    let stop = 0;
    let attemptIndex = 0;
    let cancelTimeout: () => void = noop;

    function closeBase(): void {
      if (fd) {
        close(fd, () => undefined);
        fd = 0;
      }
    }

    function onThen(data: IReadSliceResult): void {
      cancelTimeout();
      resolve(data);
    }

    function onCatch(error: any): void {
      cancelTimeout();
      reject(error);
    }

    function onTimeout(): void {
      const error = new Error(`File read timed out: ${path} on position ${position}`);
      attemptIndex++;

      if (attemptIndex > additionaAttemptLimit) {
        reject(error);
        return;
      }

      // eslint-disable-next-line no-console
      console.error(error, {
        attempt: attemptIndex, 
      });

      closeBase();
      base();
    }

    function base(): void {
      cancelTimeout = createTimeout(onTimeout, readTimeout);

      open(
        path, 'r', (error, paramFD) => {
          if (error) {
            onCatch(error);
            return;
          }

          fd = paramFD;

          if (stop) {
            closeBase();
            return;
          }

          read(
            paramFD, buffer, 0, bufferLength, position, (readError, bytesRead) => {
              if (stop) {
                return;
              }

              if (readError) {
                onCatch(readError);
              } else {
                const dataBuffer = bytesRead > 0
                  ? (bytesRead === bufferLength ? buffer : buffer.slice(0, bytesRead))
                  : null;
                onThen({
                  buffer: dataBuffer,
                  position: position + bytesRead,
                });
              }

              closeBase();
            },
          );
        },
      );
    }

    base();

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          stop = 1;
          cancelTimeout();
          closeBase();
          reject(new Error('aborted'));
        },
        {
          once: true, 
        },
      );
    }
  });
};
