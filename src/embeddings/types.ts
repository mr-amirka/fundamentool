/** The types of `fundamentool/embeddings` (fundamentool D-098, D-099). */
import type {
  TVector,
} from '../vectors';

/** What a text is for: a question asked (`query`) or a text kept to be found (`document`) — some models embed them apart. */
export type TEmbedRole = 'query' | 'document';

/**
 * The port: a model that turns texts into vectors. A model maps the role its own way — a prefix (e5's `query:` /
 * `passage:`), a second model (Yandex's), nothing (bge-m3). Any object of this shape is a model: a local one
 * (`transformersModel`), or one an app writes over a remote API (fundamentool D-098 leaves them a door).
 */
export type TEmbeddingModel = {
  /** Names the model, its build and its quantization — what a consumer stores beside each vector. */
  readonly id: string;
  /** The numbers in each of its vectors. */
  readonly dim: number;
  /** The most texts one `embed` call takes. */
  readonly maxBatch: number;
  /** At most `maxBatch` texts → their vectors, in order. */
  embed(texts: readonly string[], role: TEmbedRole, signal?: AbortSignal): Promise<readonly TVector[]>;
};

/** `createEmbedder`'s options. */
export type TEmbedderOptions = {
  /** The model. */
  model: TEmbeddingModel;
  /** Texts per call of the model (default and at most: its `maxBatch`). */
  batch?: number;
};

/** What `embed` is told. */
export type TEmbedOptions = {
  /** The texts' role. */
  as: TEmbedRole;
  /** Stops between batches: the promise rejects with the signal's reason. */
  signal?: AbortSignal;
};

/** An embedder: texts in, vectors of unit length out. */
export type TEmbedder = {
  /** The model's `id` and `dim` — what a consumer stores beside a vector, so a change of model is seen. */
  readonly info: {
    readonly id: string;
    readonly dim: number;
  };
  /** The texts' vectors, in order, each of unit length (so `dot` is their cosine); `[]` for no texts. */
  embed(texts: readonly string[], options: TEmbedOptions): Promise<Float32Array[]>;
};
