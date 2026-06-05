import { GLOBAL_CONTEXT } from './globalContext';

const EventTargetConstructor = (GLOBAL_CONTEXT.EventTarget || function() {
  console.warn('EventTarget is not support');
}) as typeof EventTarget;

/**
 * A polyfill for the MessagePort interface.
 * 
 */
export class PortPolyfill extends EventTargetConstructor {
  /**
   * Sends a message to the port.
   * 
   * @param data - The data to send.
   * @returns The data.
   * @example
   * const port = new PortPolyfill();
   * port.postMessage('hello'); // => 'hello'
   */
  postMessage(data: any) {
    this.dispatchEvent(new MessageEvent('message', {
      data,
    }));
  }
}
