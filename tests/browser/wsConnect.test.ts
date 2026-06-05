import { wsConnect } from '../../src/browser/wsConnect';
import { FakeWebSocket } from './wsFakeWebSocket';

describe('browser/wsConnect', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    (global as any).WebSocket = FakeWebSocket;
  });

  test('resolves when socket is opened', async () => {
    const promise = wsConnect('ws://example.com');

    const socket = FakeWebSocket.instances[0];
    expect(socket).toBeDefined();
    socket.onopen?.();

    await expect(promise).resolves.toBe(socket as any);
  });
});
