import {
  GLOBAL_CONTEXT, 
} from '../globalContext';
import {
  urlExtend, 
} from '../urlExtend';

let _JSONP_CALLBACK_INDEX = 0;

/**
 * Performs JSONP request by injecting a temporary `<script>` tag.
 *
 * The callback function is placed on `GLOBAL_CONTEXT` so the remote endpoint
 * can call it when it finishes.
 *
 * @param url - Base request URL (without `callback` param).
 * @param params - Query params appended to the URL.
 * @returns Promise resolved with the JSONP callback payload.
 * @example
 * const data = await jsonpRequest('https://api.example.com/data', { id: 1 });
 */
export const jsonpRequest = (url: string, params?: Record<string, any>) => {
  return new Promise((resolve, reject) => {
    const doc = GLOBAL_CONTEXT.document;
    if (!doc) {
      reject(new Error('Document is not found'));
      return;
    }
    const jsonpCallbakName = `JSONP_CALLBACK_${++_JSONP_CALLBACK_INDEX}`;
    const head = doc.head;
    const script = doc.createElement('script');
    script.src = urlExtend(url, {
      query: {
        ...(params || {}),
        callback: jsonpCallbakName,
      },
    }).href;
    // script.src = `https://api.vk.com/method/users.get?user_ids=210700286&fields=bdate&v=5.199&callback=${jsonpCallbakName}`;
    head.appendChild(script);
    GLOBAL_CONTEXT[jsonpCallbakName] = (response: any) => {
      head.removeChild(script);
      delete GLOBAL_CONTEXT[jsonpCallbakName];
      resolve(response);
    };
  });
};
