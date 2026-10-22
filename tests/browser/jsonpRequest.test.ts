import {
  jsonpRequest,
} from '../../src/browser/jsonpRequest';
import {
  setupBrowserDomMocks,
} from './browserDomMocks';

describe('browser/jsonpRequest', () => {
  beforeEach(() => {
    setupBrowserDomMocks();
  });

  test('injects script and resolves with callback data', async () => {
    const promise = jsonpRequest('https://example.com/test', {
      q: 1,
    }) as Promise<any>;

    const callbackName = Object.keys(globalThis).find((k) =>
      k.startsWith('JSONP_CALLBACK_'));

    expect(callbackName).toBeTruthy();

    const response = {
      ok: true,
    };
    (globalThis as any)[callbackName as string](response);

    const result = await promise;

    expect(result).toEqual(response);
    expect((global as any).document.head.appendChild).toHaveBeenCalled();
    expect((global as any).document.head.removeChild).toHaveBeenCalled();
  });

  it('the script fails to load: rejects, the script and the callback removed', async () => {
    const head = (global as any).document.head;
    const promise = jsonpRequest('https://example.com/missing') as Promise<unknown>;
    const script = head.appendChild.mock.calls.at(-1)[0];
    expect(script.src).toMatch(/^https:\/\/example\.com\/missing\?callback=JSONP_CALLBACK_\d+$/); // no params: only the callback
    const callbackName = /callback=(\w+)/.exec(script.src)![1];
    script.onerror();
    await expect(promise).rejects.toThrow(`JSONP request failed: ${script.src}`);
    expect(head.removeChild).toHaveBeenCalledWith(script);
    expect(callbackName in globalThis).toBe(false);
  });

  it('no document (a worker, a server): rejects', async () => {
    const doc = (global as any).document;
    delete (global as any).document;
    try {
      await expect(jsonpRequest('https://example.com/x')).rejects.toThrow('Document is not found');
    } finally {
      (global as any).document = doc;
    }
  });
});
