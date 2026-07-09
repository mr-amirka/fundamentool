import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import {
  formatTime, 
} from '../../formatTime';
import {
  param,
} from '../../param';
import {
  urlParse,
} from '../../urlParse';
import {
  wait, 
} from '../../wait';
import {
  createTimeout, 
} from '../../createTimeout';
import {
  noop, 
} from '../../noop';
import {
  Response, 
} from './Response';

export type TRequestOptions = {
  body?: any,
  sign?: boolean,
  query?: Record<string, any>,
  headers?: Record<string, string>,
};

export type TClientOptions = {
  retry?: boolean,
  minLatency?: number,
  retryTimeoutSec?: number,
  retryLimit?: number,
  timestampKey?: string,
  apiSecret?: string,
  defaultHeaders?: Record<string, string>,
  baseUrl?: string,
};

export type TResponse = {
  status: number,
  headers: Record<string, any>,
  data: any,
};

export type TRequestFn = (path: string, options?: TRequestOptions) => Promise<TResponse>;

function noopHandle<A>(v: A) {
  return v;
}

const DEFAULT_RETRY_LIMIT = 3;
const DEFAULT_RETRY_TIMEOUT = 10;
const REQUEST_TIMEOUT = 1000 * 20;
const METHODS = [
  'POST',
  'GET',
  'DELETE',
];

/**
 * HTTP/HTTPS request client with optional retry logic, HMAC signing, and minimum latency enforcement.
 * Exposes `post`, `get`, and `delete` convenience methods, plus a low-level `request` method.
 *
 * @example
 * const client = new Client({ baseUrl: 'https://api.example.com', retry: true });
 * const { data } = await client.get('/users', { query: { page: 1 } });
 */
export class Client {
  constructor(options: TClientOptions = {}) {
    const retry = options.retry;
    const minLatency = options.minLatency || 20;
    const retryTimeout = options.retryTimeoutSec || DEFAULT_RETRY_TIMEOUT;
    const retryLimit = options.retryLimit || DEFAULT_RETRY_LIMIT;
    const timestampKey = options.timestampKey || 'timestamp';
    const apiSecret = options.apiSecret;
    const defaultHeaders = options.defaultHeaders || {};
    const baseUrl = options.baseUrl || '';
    let _requestId = 0;
    let _lockedTime = 0;

    const agentOptions = {
      maxSockets: 20,
    };
    const httpAgent = new http.Agent({
      ...agentOptions,
    });
    const httpsAgent = new https.Agent({
      ...agentOptions,
    });

    let _promiseBetweenLatency = Promise.resolve();

    const promiseWithLatency = minLatency
      ? (<A>(fn: () => A) => {
        const promise = _promiseBetweenLatency
          .catch(noop)
          .then(() => {
            return Promise.all([Promise.resolve().then(fn), wait(minLatency)]);
          })
          .then((v) => v[0]);

        _promiseBetweenLatency = promise as Promise<void>;

        return promise;
      })
      : noopHandle;

    function request(
      method: string, path: string, options: TRequestOptions = {},
    ) {
      const {
        sign,
        body,
      } = options;
      const headers = options.headers || {};

      const id = ++_requestId;
      let numberOfRetries = 0;

      // console.log(formatTime(), 'request', id, method, path, _params);

      return base() as Promise<TResponse>;

      function base() {
        const time = Date.now();
        if (_lockedTime > time) {
          return wait(_lockedTime - time)
            .then(base);
        }

        const query = {
          ...(options.query || {}),
        };
        sign && (query[timestampKey] = time);
        let queryString = param(query);

        if (sign) {
          const signature = crypto
            .createHmac('sha256', apiSecret || '')
            .update(queryString)
            .digest('hex');

          queryString += `${(queryString ? '&' : '')}signature=${signature}`;
        }

        const loc = urlParse(`${baseUrl}${path}${(queryString ? `?${queryString}` : '')}`);
        const url = loc.href;

        function extendError(error: any) {
          error.id = id;
          error.method = method;
          error.url = url;
          console.error(error.time = formatTime(), error);
          return error;
        }
        function throwError(error: any, message?: string) {
          message && (error.message = message);
          throw extendError(error);
        }

        return promiseWithLatency(() => (new Promise((resolve, reject) => {
          function cancel() {
            const _req = req;
            (req as any) = 0;
            _req && (
              cancelTimeoutCheck(),
              _req.destroy()
            );
          }
          const cancelTimeoutCheck = createTimeout(() => {
            _timeouted = true;
            reject(extendError(new Error('Request timeout')));
            cancel();
          }, REQUEST_TIMEOUT);

          const isHTTPS = loc.protocol == 'https';
          let _timeouted = false;

          let req = (isHTTPS ? https : http)
            .request(
              url, {
                method,
                headers: {
                  ...defaultHeaders,
                  ...headers,
                },
                agent: isHTTPS ? httpsAgent : httpAgent,
              }, (response) => {
                if (_timeouted) {
                  return;
                }
                cancelTimeoutCheck();
                resolve(response);
              },
            )
            .on('error', (err) => {
              if (_timeouted) {
                return;
              }
              cancel();
              reject(extendError(err));
            });

          body && req.write(body);
          req.end();
        })).then((originResponse: any) => {
          const {
            statusCode,
            headers,
          } = originResponse;
          const retryAfter = Number(headers['x-retry-after'] || headers['retry-after'] || 0);
          const timeToWait = (retryAfter || retryTimeout) * 1000;

          if (
            retry && (
              statusCode === 503
              || statusCode === 429
              || statusCode === 418
            )
          ) {
            _lockedTime = Date.now() + timeToWait;
            numberOfRetries++;
            if (numberOfRetries > retryLimit) {
              throwError({},
                `${formatTime()} Request ${id} on ${method} ${url}. The retry limit has been exceeded`);
            }
            // eslint-disable-next-line
            console.log(`${formatTime()} Request ${id} on ${method} ${url}. You have reached the rate limit for the API. Please retry in ${
              retryAfter} seconds`);

            return wait(timeToWait).then(base);
          }

          const response = Response.provider(originResponse);

          return response.json().then((data: any) => {
            if (data.msg) {
              throwError(data);
            }
            return {
              status: statusCode,
              headers,
              data,
            };
          }, (error: any) => {
            throwError({
              code: statusCode,
              text: response._text,
              // response,
            });
          });
        }));
      }
    }

    this.request = request;

    METHODS.forEach((method: string) => {
      this[method.toLowerCase()] = (path: string, options: TRequestOptions = {}) => {
        return request(
          method, path, options,
        );
      };
    });
  }

  request: (method: string, path: string, options: TRequestOptions) => Promise<TResponse>;
  post: TRequestFn;
  get: TRequestFn;
  delete: TRequestFn;
}
