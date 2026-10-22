/**
 * The items of an object stream, once it ends. With `onReadable` it is told each time items are ready: a `'readable'`
 * listener takes a stream out of flowing mode (`'data'` stops), so the items are read here then — not lost, the promise
 * not left waiting.
 *
 * @param stream - An object stream (JSON Lines records).
 * @param onReadable - Called when items are ready, before they are taken.
 * @returns The items, in order.
 * @example
 * const records = await collect(read('./log.jsonl'), () => progress.tick());
 */
export function collect(stream: NodeJS.ReadableStream, onReadable?: () => void): Promise<any[]> {
  return new Promise<any[]>((resolve, reject) => {
    const items: any[] = [];
    if (onReadable) {
      stream.on('readable', () => {
        onReadable();
        let item: unknown;
        while ((item = stream.read()) !== null) {
          items.push(item);
        }
      });
    } else {
      stream.on('data', (item: any) => items.push(item));
    }
    stream.on('end', () => resolve(items));
    stream.on('error', reject);
  });
}
