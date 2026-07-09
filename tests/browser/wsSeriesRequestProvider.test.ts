import {
  wsSeriesRequestProvider, 
} from '../../src/browser/wsSeriesRequestProvider';
import {
  FakeWebSocket, 
} from './wsFakeWebSocket';

describe('browser/wsSeriesRequestProvider', () => {
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

  test('resolves requests in order', async () => {
    const request = wsSeriesRequestProvider('ws://example.com');

    const p1 = request('one', {
      a: 1, 
    });
    const p2 = request('two', {
      b: 2, 
    });

    await Promise.resolve();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();

    await Promise.resolve();
    expect(socket.sent.length).toBeGreaterThanOrEqual(1);

    socket.onmessage?.({
      data: new Blob([JSON.stringify({
        data: 10, 
      })], {
        type: 'text/plain',
      }),
    } as any);

    await Promise.resolve();

    socket.onmessage?.({
      data: new Blob([JSON.stringify({
        data: 20, 
      })], {
        type: 'text/plain',
      }),
    } as any);

    await expect(p1).resolves.toEqual({
      data: 10, 
    });
    await expect(p2).resolves.toEqual({
      data: 20, 
    });
  });
});
