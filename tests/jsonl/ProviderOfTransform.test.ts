import { Transform } from 'stream';
import { StringDecoder } from 'string_decoder';
import { ProviderOfTransformFrom } from '../../src/jsonl/ProviderOfTransformFrom';
import { ProviderOfTransformTo } from '../../src/jsonl/ProviderOfTransformTo';

const env = { Transform, StringDecoder } as any;

function collectFrom(transform: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const result: any[] = [];
    transform.on('data', (chunk: any) => result.push(chunk));
    transform.on('end', () => resolve(result));
    transform.on('error', reject);
  });
}

function collectTo(transform: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    transform.on('data', (chunk: Buffer) => chunks.push(chunk));
    transform.on('end', () => resolve(Buffer.concat(chunks).toString()));
    transform.on('error', reject);
  });
}

describe('ProviderOfTransformFrom', () => {
  test('parses a single JSONL line', async () => {
    const TransformFrom = ProviderOfTransformFrom(env) as any;
    const stream = new TransformFrom();
    const resultP = collectFrom(stream);

    stream.write('{"a":1}\n');
    stream.end();

    expect(await resultP).toEqual([{ a: 1 }]);
  });

  test('parses multiple JSONL lines from one chunk', async () => {
    const TransformFrom = ProviderOfTransformFrom(env) as any;
    const stream = new TransformFrom();
    const resultP = collectFrom(stream);

    stream.write('{"a":1}\n{"b":2}\n');
    stream.end();

    expect(await resultP).toEqual([{ a: 1 }, { b: 2 }]);
  });

  test('handles lines split across chunks', async () => {
    const TransformFrom = ProviderOfTransformFrom(env) as any;
    const stream = new TransformFrom();
    const resultP = collectFrom(stream);

    stream.write('{"a"');
    stream.write(':1}\n');
    stream.end();

    expect(await resultP).toEqual([{ a: 1 }]);
  });

  test('flushes remaining data without trailing newline', async () => {
    const TransformFrom = ProviderOfTransformFrom(env) as any;
    const stream = new TransformFrom();
    const resultP = collectFrom(stream);

    stream.write('{"x":42}');
    stream.end();

    expect(await resultP).toEqual([{ x: 42 }]);
  });

  test('emits error on malformed JSON', async () => {
    const TransformFrom = ProviderOfTransformFrom(env) as any;
    const stream = new TransformFrom();

    await expect(
      new Promise((_, reject) => {
        stream.on('error', reject);
        stream.write('not-valid-json\n');
        stream.end();
      }),
    ).rejects.toThrow(/Parse error/);
  });
});

describe('ProviderOfTransformTo', () => {
  test('stringifies an object to JSONL line', async () => {
    const TransformTo = ProviderOfTransformTo(env) as any;
    const stream = new TransformTo();
    const resultP = collectTo(stream);

    stream.write({ a: 1 });
    stream.end();

    expect(await resultP).toBe('{"a":1}\n');
  });

  test('stringifies multiple objects', async () => {
    const TransformTo = ProviderOfTransformTo(env) as any;
    const stream = new TransformTo();
    const resultP = collectTo(stream);

    stream.write({ a: 1 });
    stream.write({ b: 2 });
    stream.end();

    expect(await resultP).toBe('{"a":1}\n{"b":2}\n');
  });

  test('emits error on non-serializable value', async () => {
    const TransformTo = ProviderOfTransformTo(env) as any;
    const stream = new TransformTo();

    const circular: any = {};
    circular.self = circular;

    await expect(
      new Promise((_, reject) => {
        stream.on('error', reject);
        stream.write(circular);
        stream.end();
      }),
    ).rejects.toThrow();
  });
});
