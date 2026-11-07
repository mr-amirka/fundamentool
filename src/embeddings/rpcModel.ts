/**
 * A model across a channel (fundamentool D-107): its calls served where it runs (`modelHandlers`) — a worker thread,
 * another process, a server — and a model of the same shape where it is called (`rpcModel`). Any `fundamentool/rpc`
 * pair carries it; this module knows only the calls' shape.
 */
import type {
  TEmbeddingModel,
  TEmbedRole,
} from './types';
import {
  WHERE,
} from './createEmbedder';

/** What `rpcModel` needs of the model it stands for — known without running it. */
export type TModelInfo = Pick<TEmbeddingModel, 'id' | 'dim' | 'maxBatch'>;

/** The calls a model's side serves: `embed`, its vectors as plain arrays — what any channel can carry. */
export type TModelHandlers = {
  embed(texts: readonly string[], role: TEmbedRole): Promise<number[][]>;
};

/** What `rpcModel` calls through — an `RpcClient`, or anything with its `call`. */
export type TModelCaller = {
  call(method: 'embed', args: [texts: readonly string[], role: TEmbedRole], options?: { signal?: AbortSignal }): Promise<unknown>;
};

/**
 * A model's calls, for the side that runs it.
 *
 * @param model - The model, as `transformersModel` gives it.
 * @returns The handlers — to `NodeRpcConnectWorker.run`, or any RPC server.
 * @example
 * // embedWorker.js — the worker thread
 * NodeRpcConnectWorker.run(modelHandlers(transformersModel({ library: () => import('@huggingface/transformers'), id })));
 */
export function modelHandlers(model: TEmbeddingModel): TModelHandlers {
  return {
    embed: async (texts, role) => (await model.embed(texts, role)).map((vector) => Array.from(vector)),
  };
}

/**
 * A model whose `embed` crosses a channel to where the model runs: what it is (`id`, `dim`, `maxBatch`) known here,
 * so nothing starts until a text is embedded. The signal goes with the call: aborted, it rejects here at once — the
 * other side finishes the texts it took (at most `maxBatch`), its result dropped.
 *
 * @param info   - The model's `id`, `dim`, `maxBatch` — the running model's, as `transformersModel` names it.
 * @param caller - Gives the client to call through, at the first text: `() => new NodeRpcClientWorker(script)`.
 * @returns The model.
 * @throws {TypeError} The other side's vector of another length — rejects with it.
 * @example
 * const local = transformersModel({ library: load, id: 'onnx-community/embeddinggemma-300m-ONNX' }); // never loads here
 * const model = rpcModel(local, () => worker ??= new NodeRpcClientWorker('./embedWorker.js'));
 * const embedder = createEmbedder({ model });
 */
export function rpcModel(info: TModelInfo, caller: () => TModelCaller): TEmbeddingModel {
  const {
    id,
    dim,
    maxBatch,
  } = info;
  return {
    id,
    dim,
    maxBatch,
    embed: async (
      texts, role, signal,
    ) => {
      signal?.throwIfAborted();
      const vectors = await caller().call(
        'embed', [
          texts,
          role,
        ], {
          signal,
        },
      ) as number[][];
      signal?.throwIfAborted();
      return vectors.map((vector) => {
        if (vector.length !== dim) {
          throw new TypeError(`${WHERE} rpcModel: ${id} gave a vector of ${vector.length}, ${dim} expected`);
        }
        return Float32Array.from(vector);
      });
    },
  };
}
