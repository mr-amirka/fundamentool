/** The embedder over a model (fundamentool D-099): batches, checks, unit length. */
import {
  describeValue,
} from '../describeValue';
import {
  custom,
  lazy,
  number,
  object,
} from '../schema';
import type {
  TVector,
} from '../vectors';
import type {
  TEmbedder,
  TEmbedderOptions,
  TEmbedOptions,
  TEmbeddingModel,
} from './types';

/** The prefix of the module's messages. */
export const WHERE = '[fundamentool/embeddings]';

const isModel = (value: unknown): boolean => typeof value === 'object' && value !== null
  && typeof (value as TEmbeddingModel).id === 'string' && Number.isInteger((value as TEmbeddingModel).dim)
  && (value as TEmbeddingModel).dim > 0 && Number.isInteger((value as TEmbeddingModel).maxBatch)
  && (value as TEmbeddingModel).maxBatch > 0 && typeof (value as TEmbeddingModel).embed === 'function';

const OPTIONS = /*#__PURE__*/ lazy(() => object({
  model: custom<TEmbeddingModel>(isModel, 'a model: { id, dim, maxBatch, embed(texts, role, signal?) }'),
  batch: number().int().min(1).optional(),
}));

const ROLES = new Set([
  'query',
  'document',
]);

/** A vector scaled to unit length, as a `Float32Array`; a vector of zeros stays zeros. */
function unit(vector: TVector): Float32Array {
  const length = vector.length;
  const out = new Float32Array(length);
  let sum = 0;
  for (let i = 0; i < length; i++) {
    sum += vector[i] * vector[i];
  }
  const scale = sum > 0 ? 1 / Math.sqrt(sum) : 0;
  for (let i = 0; i < length; i++) {
    out[i] = vector[i] * scale;
  }
  return out;
}

/**
 * An embedder over a model: the texts cut into batches the model takes — shortest first, so a batch's texts are of a
 * length and none is padded to a much longer one (a third faster on the lab's sections, fundamentool D-102) — every
 * vector checked to be the model's length, scaled to unit length and given back in the texts' order.
 *
 * @param options - `model` (the port), `batch` (texts per call, at most the model's `maxBatch`).
 * @returns The embedder.
 * @throws {TypeError} In development, an unknown option ("did you mean") or a value that isn't one.
 * @example
 * import * as transformers from '@huggingface/transformers';
 * const model = transformersModel({ library: transformers, id: 'onnx-community/embeddinggemma-300m-ONNX' });
 * const embedder = createEmbedder({ model });
 * const [query] = await embedder.embed(['how far apart are two strings'], { as: 'query' });
 */
export function createEmbedder(options: TEmbedderOptions): TEmbedder {
  if (process.env.NODE_ENV !== 'production') {
    OPTIONS().parse(options, `${WHERE} createEmbedder`);
  }
  const {
    model,
  } = options;
  const batch = Math.min(options.batch ?? model.maxBatch, model.maxBatch);
  const where = `${WHERE} embed`;
  return {
    info: {
      id: model.id,
      dim: model.dim,
    },
    async embed(texts: readonly string[], embedOptions: TEmbedOptions): Promise<Float32Array[]> {
      if (!Array.isArray(texts)) {
        throw new TypeError(`${where}: an array of texts expected, got ${describeValue(texts)}`);
      }
      const role = embedOptions?.as;
      if (!ROLES.has(role)) {
        throw new TypeError(`${where}: { as: 'query' | 'document' } expected, got ${describeValue(role)}`);
      }
      const count = texts.length;
      for (let index = 0; index < count; index++) {
        if (typeof texts[index] !== 'string' || texts[index].trim() === '') {
          throw new TypeError(`${where}: text ${index} is empty or no string — a model would give it a vector of nothing`);
        }
      }
      const signal = embedOptions.signal;
      const vectors: Float32Array[] = new Array(count);
      // The texts' indexes by length: a model pads a batch to its longest text, so like lengths go together.
      const order = Array.from({
        length: count,
      }, (_, index) => index).sort((a, b) => texts[a].length - texts[b].length || a - b);
      for (let start = 0; start < count; start += batch) {
        signal?.throwIfAborted();
        const indexes = order.slice(start, start + batch);
        const part = indexes.map((index) => texts[index]);
        const got = await model.embed(
          part, role, signal,
        );
        if (got.length !== part.length) {
          throw new Error(`${where}: ${model.id} gave ${got.length} vectors for ${part.length} texts`);
        }
        const size = got.length;
        for (let at = 0; at < size; at++) {
          const vector = got[at];
          if (vector.length !== model.dim) {
            throw new Error(`${where}: ${model.id} gave a vector of ${vector.length} numbers, its dim is ${model.dim}`);
          }
          vectors[indexes[at]] = unit(vector);
        }
      }
      return vectors;
    },
  };
}
