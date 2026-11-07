/**
 * fundamentool/embeddings' model across a channel (fundamentool D-107): `modelHandlers` served by an `RpcConnect`,
 * `rpcModel` calling it through an `RpcClient` over the in-memory channel the rpc tests use.
 */
import {
  createEmbedder,
  modelHandlers,
  rpcModel,
  WHERE,
} from '../../src/embeddings';
import type {
  TEmbeddingModel,
} from '../../src/embeddings';
import {
  RpcClient,
} from '../../src/rpc/RpcClient';
import {
  RpcConnect,
} from '../../src/rpc/RpcConnect';
import {
  makeChannel,
} from '../rpc/_channel';

/** A model of 2 numbers: a text's length and whether its role was the query's. */
function lengthModel(overrides: Partial<TEmbeddingModel> = {}): TEmbeddingModel & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    id: 'lengths',
    dim: 2,
    maxBatch: 2,
    calls,
    async embed(texts, role) {
      calls.push([...texts]);
      return texts.map((text) => Float32Array.from([
        text.length,
        role === 'query' ? 1 : 0,
      ]));
    },
    ...overrides,
  };
}

/** The model served on one side of a channel, and a client on the other. */
function across(model: TEmbeddingModel): { client: RpcClient;
  close(): void; } {
  const {
    clientOptions, serverOptions,
  } = makeChannel();
  const connect = new RpcConnect({
    ...serverOptions,
    exports: modelHandlers(model),
  });
  const client = new RpcClient(clientOptions);
  return {
    client,
    close: () => {
      client.destroy();
      connect.destroy();
    },
  };
}

describe('modelHandlers', () => {
  it('embed: the model\'s vectors as plain arrays — what any channel carries', async () => {
    expect(await modelHandlers(lengthModel()).embed([
      'ab',
      'abc',
    ], 'query')).toEqual([
      [
        2,
        1,
      ],
      [
        3,
        1,
      ],
    ]);
  });
});

describe('rpcModel', () => {
  it('is what the info says, and calls nothing until a text is embedded', () => {
    const caller = jest.fn();
    const model = rpcModel({
      id: 'local:x@q8',
      dim: 2,
      maxBatch: 16,
    }, caller);
    expect([
      model.id,
      model.dim,
      model.maxBatch,
    ]).toEqual([
      'local:x@q8',
      2,
      16,
    ]);
    expect(caller).not.toHaveBeenCalled();
  });

  it('embeds across the channel: the vectors as Float32Array, the role carried', async () => {
    const local = lengthModel();
    const {
      client, close,
    } = across(local);
    try {
      const model = rpcModel(local, () => client);
      const vectors = await model.embed(['abcd'], 'document');
      expect(vectors[0]).toBeInstanceOf(Float32Array);
      expect(Array.from(vectors[0])).toEqual([
        4,
        0,
      ]);
      expect(local.calls).toEqual([['abcd']]);
    } finally {
      close();
    }
  });

  it('under createEmbedder: batches of the other side\'s maxBatch, each one call', async () => {
    const local = lengthModel();
    const {
      client, close,
    } = across(local);
    try {
      const embedder = createEmbedder({
        model: rpcModel(local, () => client),
      });
      expect(await embedder.embed([
        'a',
        'bb',
        'ccc',
      ], {
        as: 'query',
      })).toHaveLength(3);
      expect(local.calls.map((call) => call.length)).toEqual([
        2,
        1,
      ]);
    } finally {
      close();
    }
  });

  it('an aborted signal: rejects before calling; aborted during the call — rejects at once, the result dropped', async () => {
    let finish: () => void = () => undefined;
    const local = lengthModel({
      embed: (texts) => new Promise((resolve) => {
        finish = () => {
          resolve(texts.map(() => Float32Array.from([
            0,
            0,
          ])));
        };
      }),
    });
    const {
      client, close,
    } = across(local);
    try {
      const caller = jest.fn(() => client);
      const model = rpcModel(local, caller);
      const before = new AbortController();
      before.abort(new Error('preempted'));
      await expect(model.embed(
        ['x'], 'query', before.signal,
      )).rejects.toThrow('preempted');
      expect(caller).not.toHaveBeenCalled();
      const during = new AbortController();
      const embedding = model.embed(
        ['x'], 'query', during.signal,
      );
      during.abort(new Error('preempted'));
      await expect(embedding).rejects.toThrow();
      finish();
    } finally {
      close();
    }
  });

  it.each([
    [
      'its own error',
      async () => {
        throw new Error('model gone');
      },
      'model gone',
    ],
    [
      'a vector of another length',
      async () => [Float32Array.from([1])],
      `${WHERE} rpcModel: lengths gave a vector of 1, 2 expected`,
    ],
  ])('the other side gives %s — rejected with it', async (
    _name, embed, message,
  ) => {
    // The serving side logs a failed call of its own: not this test's output.
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const local = lengthModel();
    const {
      client, close,
    } = across({
      ...local,
      embed,
    });
    try {
      await expect(rpcModel(local, () => client).embed(['x'], 'query')).rejects.toThrow(message);
    } finally {
      close();
      logged.mockRestore();
    }
  });
});
