import { open, read, close } from 'fs';
import { noop } from '../../../noop';
import { createTimeout } from '../../../createTimeout';

const DEFAULT_BUFFER_LENGTH = 1024 * 8;
const READ_TIMEOUT = 60000;

interface IReadSliceResult {
  buffer: Buffer | null;
  position: number;
}

/**
 * Reads a slice from file starting at `position` with retries and timeout.
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
      console.error(error, { attempt: attemptIndex });

      closeBase();
      base();
    }

    function base(): void {
      cancelTimeout = createTimeout(onTimeout, readTimeout);

      open(path, 'r', (error, paramFD) => {
        if (error) {
          onCatch(error);
          return;
        }

        fd = paramFD;

        if (stop) {
          closeBase();
          return;
        }

        read(paramFD, buffer, 0, bufferLength, position, (readError, bytesRead) => {
          if (stop) {
            return;
          }

          if (readError) {
            onCatch(readError);
          } else {
            const dataBuffer =
              bytesRead > 0
                ? (bytesRead === bufferLength ? buffer : buffer.slice(0, bytesRead))
                : null;
            onThen({
              buffer: dataBuffer,
              position: position + bytesRead,
            });
          }

          closeBase();
        });
      });
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
        { once: true },
      );
    }
  });
};
