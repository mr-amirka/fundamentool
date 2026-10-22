/**
 * @jest-environment jsdom
 */
/**
 * The blob reader (`provider(fnName)`): reads with the FileReader method named; a read can be cancelled; a reader's
 * error rejects.
 */
import {
  provider,
} from '../../../src/browser/blob/provider';

describe('browser/blob/provider', () => {
  it('reads; cancel() stops a read — the reader aborted, nothing settles', async () => {
    const toText = provider<string>('readAsText');
    await expect(toText(new Blob(['hello']))).resolves.toBe('hello');
    let settled = false;
    const reading = toText(new Blob(['never']));
    reading.then(() => {
      settled = true;
    }, () => {
      settled = true;
    });
    reading.cancel();
    reading.cancel(); // twice: nothing more
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(settled).toBe(false);
  });

  it('a reader\'s error rejects', async () => {
    const original = FileReader.prototype.readAsText;
    FileReader.prototype.readAsText = function failing(this: FileReader) {
      setTimeout(() => this.onerror?.(new ProgressEvent('error') as never), 0);
    };
    try {
      await expect(provider('readAsText')(new Blob(['x']))).rejects.toBeInstanceOf(ProgressEvent);
    } finally {
      FileReader.prototype.readAsText = original;
    }
  });
});
