import {
  PortPolyfill, 
} from '../src/PortPolyfill';

describe('PortPolyfill', () => {
  test('dispatches message event on postMessage', () => {
    const port = new PortPolyfill();
    const received: any[] = [];
    port.addEventListener('message', (e: Event) => {
      received.push((e as MessageEvent).data);
    });
    port.postMessage('hello');
    port.postMessage({
      x: 1, 
    });
    expect(received).toEqual(['hello', {
      x: 1, 
    }]);
  });

  test('multiple listeners receive the same message', () => {
    const port = new PortPolyfill();
    const log: string[] = [];
    port.addEventListener('message', () => log.push('a'));
    port.addEventListener('message', () => log.push('b'));
    port.postMessage('test');
    expect(log).toEqual(['a', 'b']);
  });
});
