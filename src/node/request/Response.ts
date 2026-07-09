import { 
  deflate,
  gunzip,
} from 'node:zlib';
const UNZIP_CONTENT = ['deflate', 'gzip'];

/*
TODO:
arrayBuffer() (en-US)
blob() (en-US)
json() (en-US)
text() (en-US)
formData() (en-US)
*/

function toJson(v: any) {
  return JSON.parse(v);
}

/**
 * Wraps a Node.js `http.IncomingMessage` and provides lazy `bytes()`, `text()`, and `json()` accessors.
 * Transparently decompresses `gzip` and `deflate` content encodings.
 *
 * @example
 * const response = Response.provider(incomingMessage);
 * const data = await response.json();
 */
export class Response {
  private _origin: any;
  private _promiseBytes: Promise<any> | undefined;
  private _promiseText: any;
  private _promiseJson: any;

  _text: string | undefined;
  _json: any;

  status: string;
  headers: Record<string, string>;
  

  constructor(origin?: any) {
    this._origin = origin;
    this.status = origin.statusCode;
    this.headers = origin.headers;
  }

  static provider(origin?: any) {
    return new Response(origin);
  }

  bytes() {
    const _promise = this._promiseBytes;
    if (_promise) {
      return _promise;
    }
    const response = this._origin;

    return this._promiseBytes = (new Promise((resolve, reject) => {
      const chunks = [];
      response.setEncoding('binary');
      response
        .on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        })
        .on('end', () => {
          resolve(Buffer.concat(chunks));
        })
        .on('error', reject);
      /*
      return () => {
        response.close
          ? response.close()
          : response.destroy && response.destroy();
      };
      */
    }));
  }

  text() {
    const _promise = this._promiseText;
    if (_promise) {
      return _promise;
    }
    const contentEncoding = this.headers['content-encoding'];
    const skipUnzip = UNZIP_CONTENT.indexOf(contentEncoding) < 0;
    return this._promiseText = this.bytes().then((body) => {
      return skipUnzip ? body.toString('utf8') : new Promise((resolve, reject) => {
        (
          contentEncoding === 'deflate'
            ? deflate
            : gunzip
        )(body, (error, body) => {
          if (error) {
            return reject(error);
          }
          try {
            resolve(body.toString('utf8'));
          } catch (e) {
            return reject(e);
          }
        });
      });
    }).then((v) => this._text = v);
  }

  json() {
    return this._promiseJson || (this._promiseJson = this.text().then(toJson).then((v: any) => this._json = v));
  }

}

