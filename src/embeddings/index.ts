// fundamentool/embeddings — texts in, vectors out (fundamentool D-098, D-099, lab D-050: the async half;
// `fundamentool/vectors` is the sync one): the embedder over a model, the model's port, a local model run by
// `@huggingface/transformers` — the library passed in by the caller, never imported here.
export {
  WHERE,
  createEmbedder,
} from './createEmbedder';
export {
  KNOWN_MODELS,
  transformersModel,
  type TDtype,
  type TPooling,
  type TPrefixes,
  type TTransformersLibrary,
  type TTransformersModelOptions,
} from './transformersModel';
export type {
  TEmbedder,
  TEmbedderOptions,
  TEmbeddingModel,
  TEmbedOptions,
  TEmbedRole,
} from './types';
