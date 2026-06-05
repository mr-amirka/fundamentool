/** Fake WebSocket для тестов wsConnect / ws*RequestProvider */
export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  public onopen: (() => void) | null = null;
  public onclose: ((event?: any) => void) | null = null;
  public onerror: ((event?: any) => void) | null = null;
  public onmessage: ((event: any) => void) | null = null;

  public sent: any[] = [];

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: any) {
    this.sent.push(data);
  }

  close() {}
}
