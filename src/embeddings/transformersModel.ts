/**
 * A local model run by `@huggingface/transformers` (fundamentool D-098, D-099). fundamentool doesn't import the
 * library: the caller passes its namespace, as `sqliteAdapter(new Database(file))` takes its driver.
 */
import {
  describeValue,
} from '../describeValue';
import {
  hasOwn,
} from '../hasOwn';
import {
  custom,
  lazy,
  number,
  object,
  oneOf,
  string,
} from '../schema';
import type {
  TEmbeddingModel,
  TEmbedRole,
} from './types';
import {
  WHERE,
} from './createEmbedder';

/**
 * How a model turns its tokens into one vector: `mean`, `cls` or `last_token` through the library's `pipeline`;
 * `sentence` — the model's own `sentence_embedding` output (EmbeddingGemma: pooling and dense layers inside the model),
 * through `AutoTokenizer` and `AutoModel`.
 */
export type TPooling = 'mean' | 'cls' | 'last_token' | 'sentence';

/** What the model is told before a text of each role: e5's `query: ` / `passage: `. */
export type TPrefixes = {
  query?: string;
  document?: string;
};

/** The weights' quantizations the library loads. */
export const DTYPES = [
  'fp32',
  'fp16',
  'q8',
  'int8',
  'uint8',
  'q4',
  'q4f16',
  'bnb4',
] as const;

/** One of `DTYPES`. */
export type TDtype = typeof DTYPES[number];

/** What a tensor of the library gives: one list of numbers per text. */
type TTensorLike = {
  tolist(): number[][];
};

/**
 * The part of `@huggingface/transformers` the model uses — `import * as transformers from '@huggingface/transformers'`
 * fits it. Methods, not function fields, so the library's own wider signatures are accepted.
 */
export type TTransformersLibrary = {
  pipeline(task: 'feature-extraction', model: string, options?: { dtype?: TDtype }): Promise<unknown>;
  AutoTokenizer: {
    from_pretrained(model: string): Promise<unknown>;
  };
  AutoModel: {
    from_pretrained(model: string, options?: { dtype?: TDtype }): Promise<unknown>;
  };
};

/** `transformersModel`'s options. */
export type TTransformersModelOptions = {
  /**
   * The library's namespace, or a loader of it called on the first `embed` — `() => import('@huggingface/transformers')`
   * keeps the library (and its runtime) unloaded until a text is embedded.
   */
  library: TTransformersLibrary | (() => Promise<TTransformersLibrary>);
  /** The model's id on the Hugging Face hub: a known one carries its `dim`, `pooling` and `prefixes`. */
  id: string;
  /** The weights' quantization (default `q8`): part of `info.id`, so vectors of another one are told apart. */
  dtype?: TDtype;
  /** The numbers per vector — required for an unknown id. */
  dim?: number;
  /** Required for an unknown id. */
  pooling?: TPooling;
  /** For an unknown id: none unless given. */
  prefixes?: TPrefixes;
  /** Texts per run (default 16). */
  maxBatch?: number;
};

const MEAN = 'mean';
const CLS = 'cls';
const LAST_TOKEN = 'last_token';
const SENTENCE = 'sentence';

const POOLINGS: readonly TPooling[] = [
  MEAN,
  CLS,
  LAST_TOKEN,
  SENTENCE,
];

type TRecipe = {
  dim: number;
  pooling: TPooling;
  prefixes: TPrefixes;
  maxBatch?: number;
};

/** The models measured for the lab (fundamentool research 25): their vector, their pooling, their prefixes. */
export const KNOWN_MODELS: Readonly<Record<string, Readonly<TRecipe>>> = {
  'Xenova/multilingual-e5-small': {
    dim: 384,
    pooling: MEAN,
    prefixes: {
      query: 'query: ',
      document: 'passage: ',
    },
  },
  'Xenova/paraphrase-multilingual-MiniLM-L12-v2': {
    dim: 384,
    pooling: MEAN,
    prefixes: {},
  },
  'Xenova/bge-m3': {
    dim: 1024,
    pooling: CLS,
    prefixes: {},
  },
  'onnx-community/embeddinggemma-300m-ONNX': {
    dim: 768,
    pooling: SENTENCE,
    prefixes: {
      query: 'task: search result | query: ',
      document: 'title: none | text: ',
    },
  },
  'onnx-community/Qwen3-Embedding-0.6B-ONNX': {
    dim: 1024,
    pooling: LAST_TOKEN,
    prefixes: {
      query: 'Instruct: Given a search query, retrieve the code or the document that answers it\nQuery: ',
    },
    // The last token is the text's own only when the batch is padded on the left; one text a run never pads.
    maxBatch: 1,
  },
  'Snowflake/snowflake-arctic-embed-l-v2.0': {
    dim: 1024,
    pooling: CLS,
    prefixes: {
      query: 'query: ',
    },
  },
};

const DEFAULT_BATCH = 16;

const isLibrary = (value: unknown): boolean => {
  const library = value as TTransformersLibrary;
  return typeof value === 'object' && value !== null && typeof library.pipeline === 'function'
    && typeof library.AutoTokenizer?.from_pretrained === 'function'
    && typeof library.AutoModel?.from_pretrained === 'function';
};

const LIBRARY = "@huggingface/transformers' namespace: { pipeline, AutoTokenizer, AutoModel }";

const OPTIONS = /*#__PURE__*/ lazy(() => object({
  library: custom<TTransformersModelOptions['library']>((value) => typeof value === 'function' || isLibrary(value), `${LIBRARY}, or a loader of it`),
  id: string(),
  dtype: oneOf(DTYPES).optional(),
  dim: number().int().min(1).optional(),
  pooling: oneOf(POOLINGS).optional(),
  prefixes: object({
    query: string().optional(),
    document: string().optional(),
  }).optional(),
  maxBatch: number().int().min(1).optional(),
}));

type TRun = (texts: string[]) => Promise<number[][]>;

/** Loads the model the recipe's way; the run it returns gives one vector per text. */
async function load(
  given: TTransformersModelOptions['library'], id: string, dtype: TDtype, pooling: TPooling,
): Promise<TRun> {
  const library = typeof given === 'function' ? await given() : given;
  if (!isLibrary(library)) {
    throw new TypeError(`${WHERE} transformersModel: the loader gave ${describeValue(library)}, ${LIBRARY} expected`);
  }
  if (pooling === SENTENCE) {
    const tokenizer = await library.AutoTokenizer.from_pretrained(id) as (texts: string[], options: object) => unknown;
    const model = await library.AutoModel.from_pretrained(id, {
      dtype,
    }) as (inputs: unknown) => Promise<{ sentence_embedding?: TTensorLike }>;
    return async (texts) => {
      const output = await model(tokenizer(texts, {
        padding: true,
        truncation: true,
      }));
      if (output.sentence_embedding === undefined) {
        throw new Error(`${WHERE} transformersModel: ${id} has no sentence_embedding output — give it another pooling`);
      }
      return output.sentence_embedding.tolist();
    };
  }
  const extract = await library.pipeline(
    'feature-extraction', id, {
      dtype,
    },
  ) as (texts: string[], options: object) => Promise<TTensorLike>;
  return async (texts) => (await extract(texts, {
    pooling,
    normalize: false,
  })).tolist();
}

/**
 * A model run on this machine by `@huggingface/transformers`. Nothing loads until the first `embed`; calls made while it
 * loads wait for the one load; a load that fails is tried again by the next call.
 *
 * @param options - `library` (the namespace, or its loader), `id`, `dtype` (default `q8`); for an id not in `KNOWN_MODELS`, `dim` and
 *                  `pooling` (and `prefixes` when it has them); `maxBatch` (default 16).
 * @returns The model, for `createEmbedder`; its `id` is `local:<id>@<dtype>`.
 * @throws {TypeError} In development, an unknown option ("did you mean") or a value that isn't one; an unknown id
 *                     without its `dim` and `pooling`.
 * @example
 * import * as transformers from '@huggingface/transformers';
 * const model = transformersModel({ library: transformers, id: 'Xenova/multilingual-e5-small' });
 * model.id; // => 'local:Xenova/multilingual-e5-small@q8'
 * // the library loaded on the first embed:
 * transformersModel({ library: () => import('@huggingface/transformers'), id: 'Xenova/bge-m3' });
 */
export function transformersModel(options: TTransformersModelOptions): TEmbeddingModel {
  const where = `${WHERE} transformersModel`;
  if (process.env.NODE_ENV !== 'production') {
    OPTIONS().parse(options, where);
  }
  const {
    library,
    id,
  } = options;
  const known = hasOwn(KNOWN_MODELS, id) ? KNOWN_MODELS[id] : undefined;
  const dim = options.dim ?? known?.dim;
  const pooling = options.pooling ?? known?.pooling;
  if (dim === undefined || pooling === undefined) {
    throw new TypeError(`${where}: ${id} isn't a known model — give its dim and pooling (known: ${Object.keys(KNOWN_MODELS).join(', ')})`);
  }
  const prefixes = options.prefixes ?? known?.prefixes ?? {};
  const dtype = options.dtype ?? 'q8';
  let loading: Promise<TRun> | undefined;
  const run = (): Promise<TRun> => {
    loading ??= load(
      library, id, dtype, pooling,
    ).catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
    return loading;
  };
  return {
    id: `local:${id}@${dtype}`,
    dim,
    maxBatch: options.maxBatch ?? known?.maxBatch ?? DEFAULT_BATCH,
    async embed(
      texts: readonly string[], role: TEmbedRole, signal?: AbortSignal,
    ): Promise<number[][]> {
      signal?.throwIfAborted();
      const embedTexts = await run();
      signal?.throwIfAborted();
      const prefix = prefixes[role] ?? '';
      return embedTexts(prefix === '' ? [...texts] : texts.map((text) => prefix + text));
    },
  };
}
