// fundamentool/vectors — the math over embeddings (fundamentool D-099, lab D-050: the sync half; `fundamentool/embeddings`
// is the async one): the dot product, the nearest vectors, a merge of rankings by rank, a vector as bytes, a long text
// in pieces a model reads whole — by sentences, or by its blocks.
export {
  WHERE,
  dot,
  fuseRanks,
  nearest,
  type TFusedHit,
  type TNearestHit,
  type TVector,
} from './math';
export {
  fromBytes,
  toBytes,
} from './bytes';
export {
  chunkText,
  wordsOf,
  type TChunkTextOptions,
} from './chunkText';
export {
  chunkBlocks,
  type TTextBlock,
} from './chunkBlocks';
