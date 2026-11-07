/**
 * fundamentool/embeddings (fundamentool D-098, D-099): the embedder over a model, and a local model over a fake
 * `@huggingface/transformers` passed in as the caller passes the real one.
 */
import {
  createEmbedder,
  DTYPES,
  KNOWN_MODELS,
  transformersModel,
  WHERE,
} from '../../src/embeddings';
import type {
  TEmbeddingModel,
  TTransformersLibrary,
} from '../../src/embeddings';

/** A model of 2 numbers: a text's length and its count of spaces, so its vector shows what reached it. */
function fakeModel(overrides: Partial<TEmbeddingModel> = {}): TEmbeddingModel & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    id: 'fake',
    dim: 2,
    maxBatch: 2,
    calls,
    async embed(texts) {
      calls.push([...texts]);
      return texts.map((text) => [
        text.length,
        text.split(' ').length - 1,
      ]);
    },
    ...overrides,
  };
}

describe('DTYPES', () => {
  it('the quantizations the library loads — the type, the options\' check and a config\'s from one list', () => {
    expect(DTYPES).toEqual([
      'fp32',
      'fp16',
      'q8',
      'int8',
      'uint8',
      'q4',
      'q4f16',
      'bnb4',
    ]);
  });
});

describe('createEmbedder', () => {
  it('info: the model\'s id and dim', () => {
    expect(createEmbedder({
      model: fakeModel(),
    }).info).toEqual({
      id: 'fake',
      dim: 2,
    });
  });

  it('batches of the model\'s maxBatch, shortest first (equal lengths in order); vectors in the texts\' order, each of unit length', async () => {
    const model = fakeModel();
    const vectors = await createEmbedder({
      model,
    }).embed([
      'abc',
      'a b',
      'x',
    ], {
      as: 'document',
    });
    expect(model.calls).toEqual([
      [
        'x',
        'abc',
      ],
      ['a b'],
    ]);
    expect(vectors.map((vector) => [...vector])).toEqual([
      [
        1,
        0,
      ],
      [
        expect.closeTo(3 / Math.sqrt(10)),
        expect.closeTo(1 / Math.sqrt(10)),
      ],
      [
        1,
        0,
      ],
    ]);
    expect(vectors[0]).toBeInstanceOf(Float32Array);
  });

  it('batch: smaller is taken, larger than the model\'s is cut to it', async () => {
    const small = fakeModel();
    await createEmbedder({
      model: small,
      batch: 1,
    }).embed([
      'a',
      'b',
    ], {
      as: 'query',
    });
    expect(small.calls).toHaveLength(2);
    const large = fakeModel();
    await createEmbedder({
      model: large,
      batch: 10,
    }).embed([
      'a',
      'b',
      'c',
    ], {
      as: 'query',
    });
    expect(large.calls).toHaveLength(2);
  });

  it('no texts: no vectors, no call; a vector of zeros stays zeros', async () => {
    const model = fakeModel({
      async embed(texts) {
        return texts.map(() => [
          0,
          0,
        ]);
      },
    });
    const embedder = createEmbedder({
      model,
    });
    expect(await embedder.embed([], {
      as: 'document',
    })).toEqual([]);
    expect([
      ...(await embedder.embed(['a'], {
        as: 'document',
      }))[0],
    ]).toEqual([
      0,
      0,
    ]);
  });

  it('the role reaches the model', async () => {
    const roles: string[] = [];
    await createEmbedder({
      model: fakeModel({
        async embed(texts, role) {
          roles.push(role);
          return texts.map(() => [
            1,
            0,
          ]);
        },
      }),
    }).embed(['a'], {
      as: 'query',
    });
    expect(roles).toEqual(['query']);
  });

  it('refuses what isn\'t texts, a role that isn\'t one, an empty text by its index', async () => {
    const embedder = createEmbedder({
      model: fakeModel(),
    });
    await expect(embedder.embed('a' as never, {
      as: 'query',
    })).rejects.toThrow(`${WHERE} embed: an array of texts expected, got string`);
    await expect(embedder.embed(['a'], {
      as: 'question',
    } as never)).rejects.toThrow(`${WHERE} embed: { as: 'query' | 'document' } expected, got string "question"`);
    await expect(embedder.embed(['a'], undefined as never)).rejects.toThrow('got undefined');
    await expect(embedder.embed([
      'a',
      ' ',
    ], {
      as: 'query',
    })).rejects.toThrow(`${WHERE} embed: text 1 is empty or no string`);
    await expect(embedder.embed([3 as never], {
      as: 'query',
    })).rejects.toThrow('text 0');
  });

  it('a model that gives the wrong count or length: an error naming it', async () => {
    await expect(createEmbedder({
      model: fakeModel({
        async embed() {
          return [];
        },
      }),
    }).embed(['a'], {
      as: 'query',
    })).rejects.toThrow(`${WHERE} embed: fake gave 0 vectors for 1 texts`);
    await expect(createEmbedder({
      model: fakeModel({
        async embed() {
          return [[1]];
        },
      }),
    }).embed(['a'], {
      as: 'query',
    })).rejects.toThrow(`${WHERE} embed: fake gave a vector of 1 numbers, its dim is 2`);
  });

  it('signal: stops between batches with its reason', async () => {
    const controller = new AbortController();
    const model = fakeModel({
      maxBatch: 1,
    });
    const embed = model.embed;
    model.embed = async (texts, role) => {
      controller.abort(new Error('enough'));
      return embed(texts, role);
    };
    await expect(createEmbedder({
      model,
    }).embed([
      'a',
      'b',
    ], {
      as: 'document',
      signal: controller.signal,
    })).rejects.toThrow('enough');
    expect(model.calls).toHaveLength(1);
  });

  it('options are checked in development: an unknown key, a model that isn\'t one, a batch', () => {
    expect(() => createEmbedder({
      model: fakeModel(),
      batches: 2,
    } as never)).toThrow('batch');
    expect(() => createEmbedder({
      model: {
        id: 'x',
      } as never,
    })).toThrow('a model: { id, dim, maxBatch, embed(texts, role, signal?) }');
    expect(() => createEmbedder({
      model: null as never,
    })).toThrow(`${WHERE} createEmbedder`);
    expect(() => createEmbedder({
      model: fakeModel(),
      batch: 0,
    })).toThrow(`${WHERE} createEmbedder`);
  });

  it('skips the options check in production', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(createEmbedder({
        model: fakeModel(),
        batches: 2,
      } as never).info.id).toBe('fake');
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});

/** A fake library: records what it loads and what it is asked; a text's vector is [its length, 1, 0, …]. */
function fakeLibrary(options: { fail?: number;
  noSentence?: boolean } = {}) {
  const log: unknown[] = [];
  let fails = options.fail ?? 0;
  const vectorsOf = (texts: string[], dim: number) => texts.map((text) => Array.from({
    length: dim,
  }, (_, i) => (i === 0 ? text.length : i === 1 ? 1 : 0)));
  const library: TTransformersLibrary = {
    async pipeline(
      task, model, loadOptions,
    ) {
      log.push([
        'pipeline',
        task,
        model,
        loadOptions,
      ]);
      if (fails > 0) {
        fails--;
        throw new Error('offline');
      }
      return async (texts: string[], runOptions: object) => {
        log.push([
          'run',
          texts,
          runOptions,
        ]);
        return {
          tolist: () => vectorsOf(texts, KNOWN_MODELS[model]?.dim ?? 3),
        };
      };
    },
    AutoTokenizer: {
      async from_pretrained(model) {
        log.push([
          'tokenizer',
          model,
        ]);
        return (texts: string[], tokenizeOptions: object) => ({
          texts,
          tokenizeOptions,
        });
      },
    },
    AutoModel: {
      async from_pretrained(model, loadOptions) {
        log.push([
          'model',
          model,
          loadOptions,
        ]);
        return async (inputs: { texts: string[];
          tokenizeOptions: object }) => {
          log.push([
            'run',
            inputs.texts,
            inputs.tokenizeOptions,
          ]);
          return options.noSentence ? {} : {
            sentence_embedding: {
              tolist: () => vectorsOf(inputs.texts, 768),
            },
          };
        };
      },
    },
  };
  return {
    library,
    log,
  };
}

describe('transformersModel', () => {
  it('a known id: its dim, pooling and prefixes; nothing loads until the first embed', async () => {
    const {
      library,
      log,
    } = fakeLibrary();
    const model = transformersModel({
      library,
      id: 'Xenova/multilingual-e5-small',
    });
    expect([
      model.id,
      model.dim,
      model.maxBatch,
    ]).toEqual([
      'local:Xenova/multilingual-e5-small@q8',
      384,
      16,
    ]);
    expect(log).toEqual([]);
    const vectors = await model.embed(['how far'], 'query');
    expect(Array.from(vectors[0]).slice(0, 2)).toEqual([
      'query: how far'.length,
      1,
    ]);
    await model.embed(['a'], 'document');
    expect(log).toEqual([
      [
        'pipeline',
        'feature-extraction',
        'Xenova/multilingual-e5-small',
        {
          dtype: 'q8',
        },
      ],
      [
        'run',
        ['query: how far'],
        {
          pooling: 'mean',
          normalize: false,
        },
      ],
      [
        'run',
        ['passage: a'],
        {
          pooling: 'mean',
          normalize: false,
        },
      ],
    ]);
  });

  it('a model without prefixes gets the texts as written; dtype and maxBatch are taken', async () => {
    const {
      library,
      log,
    } = fakeLibrary();
    const model = transformersModel({
      library,
      id: 'Xenova/bge-m3',
      dtype: 'fp32',
      maxBatch: 4,
    });
    expect([
      model.id,
      model.maxBatch,
    ]).toEqual([
      'local:Xenova/bge-m3@fp32',
      4,
    ]);
    await model.embed(['a'], 'query');
    expect(log[1]).toEqual([
      'run',
      ['a'],
      {
        pooling: 'cls',
        normalize: false,
      },
    ]);
  });

  it('a model whose own maxBatch is in its recipe: Qwen3, one text a run', () => {
    expect(transformersModel({
      library: fakeLibrary().library,
      id: 'onnx-community/Qwen3-Embedding-0.6B-ONNX',
    }).maxBatch).toBe(1);
  });

  it('sentence pooling: the tokenizer and the model, the model\'s sentence_embedding', async () => {
    const {
      library,
      log,
    } = fakeLibrary();
    const model = transformersModel({
      library,
      id: 'onnx-community/embeddinggemma-300m-ONNX',
    });
    const [vector] = await model.embed(['x'], 'document');
    expect(vector).toHaveLength(768);
    expect(log).toEqual([
      [
        'tokenizer',
        'onnx-community/embeddinggemma-300m-ONNX',
      ],
      [
        'model',
        'onnx-community/embeddinggemma-300m-ONNX',
        {
          dtype: 'q8',
        },
      ],
      [
        'run',
        ['title: none | text: x'],
        {
          padding: true,
          truncation: true,
        },
      ],
    ]);
  });

  it('sentence pooling on a model without that output: an error naming it', async () => {
    await expect(transformersModel({
      library: fakeLibrary({
        noSentence: true,
      }).library,
      id: 'any/model',
      dim: 768,
      pooling: 'sentence',
    }).embed(['x'], 'query')).rejects.toThrow(`${WHERE} transformersModel: any/model has no sentence_embedding output`);
  });

  it('calls made while it loads share the one load; a failed load is tried again', async () => {
    const {
      library,
      log,
    } = fakeLibrary({
      fail: 1,
    });
    const model = transformersModel({
      library,
      id: 'Xenova/bge-m3',
    });
    await expect(Promise.all([
      model.embed(['a'], 'query'),
      model.embed(['b'], 'query'),
    ])).rejects.toThrow('offline');
    await Promise.all([
      model.embed(['a'], 'query'),
      model.embed(['b'], 'query'),
    ]);
    expect(log.filter((entry) => (entry as string[])[0] === 'pipeline')).toHaveLength(2);
  });

  it('an unknown id: its dim, pooling and prefixes as given; without dim and pooling it is refused', async () => {
    const {
      library,
      log,
    } = fakeLibrary();
    const model = transformersModel({
      library,
      id: 'me/my-model',
      dim: 3,
      pooling: 'last_token',
      prefixes: {
        query: 'q: ',
      },
    });
    await model.embed(['a'], 'query');
    await model.embed(['b'], 'document');
    expect(log.slice(1)).toEqual([
      [
        'run',
        ['q: a'],
        {
          pooling: 'last_token',
          normalize: false,
        },
      ],
      [
        'run',
        ['b'],
        {
          pooling: 'last_token',
          normalize: false,
        },
      ],
    ]);
    expect(() => transformersModel({
      library,
      id: 'me/my-model',
      dim: 3,
    })).toThrow(`${WHERE} transformersModel: me/my-model isn't a known model — give its dim and pooling (known: Xenova/multilingual-e5-small,`);
    expect(() => transformersModel({
      library,
      id: 'toString',
    })).toThrow('isn\'t a known model');
  });

  it('signal: an aborted call loads nothing; one aborted during the load runs nothing', async () => {
    const {
      library,
      log,
    } = fakeLibrary();
    const model = transformersModel({
      library,
      id: 'Xenova/bge-m3',
    });
    const controller = new AbortController();
    controller.abort(new Error('stop'));
    await expect(model.embed(
      ['a'], 'query', controller.signal,
    )).rejects.toThrow('stop');
    expect(log).toEqual([]);
    const later = new AbortController();
    const call = model.embed(
      ['a'], 'query', later.signal,
    );
    later.abort(new Error('late'));
    await expect(call).rejects.toThrow('late');
    expect(log.map((entry) => (entry as string[])[0])).toEqual(['pipeline']);
  });

  it('library as a loader: called on the first embed, once; a loader that gives no library is an error', async () => {
    const {
      library,
      log,
    } = fakeLibrary();
    let loads = 0;
    const model = transformersModel({
      library: async () => {
        loads++;
        return library;
      },
      id: 'Xenova/bge-m3',
    });
    expect(loads).toBe(0);
    await model.embed(['a'], 'query');
    await model.embed(['b'], 'query');
    expect(loads).toBe(1);
    expect(log[0]).toEqual([
      'pipeline',
      'feature-extraction',
      'Xenova/bge-m3',
      {
        dtype: 'q8',
      },
    ]);
    await expect(transformersModel({
      library: async () => ({}) as never,
      id: 'Xenova/bge-m3',
    }).embed(['a'], 'query')).rejects.toThrow(`${WHERE} transformersModel: the loader gave object, @huggingface/transformers' namespace`);
  });

  it('works under createEmbedder: unit vectors of the model\'s dim', async () => {
    const [vector] = await createEmbedder({
      model: transformersModel({
        library: fakeLibrary().library,
        id: 'Xenova/multilingual-e5-small',
      }),
    }).embed(['abc'], {
      as: 'document',
    });
    expect(vector).toHaveLength(384);
    expect(vector.reduce((sum, x) => sum + x * x, 0)).toBeCloseTo(1);
  });

  it('options are checked in development: an unknown key, the library, a dtype, a pooling', () => {
    const {
      library,
    } = fakeLibrary();
    expect(() => transformersModel({
      library,
      id: 'Xenova/bge-m3',
      dtypes: 'q8',
    } as never)).toThrow('dtype');
    expect(() => transformersModel({
      library: {
        pipeline: () => undefined,
      } as never,
      id: 'Xenova/bge-m3',
    })).toThrow('@huggingface/transformers\' namespace: { pipeline, AutoTokenizer, AutoModel }, or a loader of it');
    expect(() => transformersModel({
      library,
      id: 'Xenova/bge-m3',
      dtype: 'q2' as never,
    })).toThrow(`${WHERE} transformersModel`);
    expect(() => transformersModel({
      library,
      id: 'me/model',
      dim: 3,
      pooling: 'max' as never,
    })).toThrow(`${WHERE} transformersModel`);
  });

  it('skips the options check in production', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(transformersModel({
        library: fakeLibrary().library,
        id: 'Xenova/bge-m3',
        dtypes: 'q8',
      } as never).dim).toBe(1024);
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});
