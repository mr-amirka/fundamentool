import {
  wsAsyncRequestProvider, 
} from '../../src/browser/wsAsyncRequestProvider';
import {
  FakeWebSocket, 
} from './wsFakeWebSocket';

describe('browser/wsAsyncRequestProvider', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];

    class FileReaderMock {
      public onload: null | (() => void) = null;
      public onerror: null | ((e: any) => void) = null;
      public result: any;

      readAsText(blob: Blob) {
        blob.text().then((t) => {
          this.result = t;
          this.onload?.();
        });
      }

      readAsDataURL(_blob: Blob) {
        this.result = 'data:TEST';
        this.onload?.();
      }

      abort() {}
    }

    (global as any).FileReader = FileReaderMock;
    (global as any).WebSocket = FakeWebSocket;
  });

  test('sends messages and resolves responses', async () => {
    const request = wsAsyncRequestProvider('ws://example.com', {
      reconnect: false,
    });

    const p = request('test', {
      value: 1, 
    });

    await Promise.resolve();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();

    await Promise.resolve();

    expect(socket.sent.length).toBeGreaterThanOrEqual(1);
    const sent = socket.sent[0];
    const payload = JSON.parse(sent.toString('utf-8'));

    const response = {
      id: payload.id,
      data: 123, 
    };
    const event = {
      data: new Blob([JSON.stringify(response)], {
        type: 'text/plain', 
      }),
    };

    socket.onmessage?.(event as any);

    await expect(p).resolves.toEqual(response);
  });
});
