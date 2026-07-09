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
});
