/** A client and a server joined by an in-memory channel: what one posts, the other's listeners get at once. */
export function makeChannel() {
  type Listener = (msg: any) => void;
  const clientListeners: Listener[] = [];
  const serverListeners: Listener[] = [];

  const clientOptions = {
    postMessage: (msg: any) => {
      serverListeners[0]?.(msg);
      return () => {};
    },
    onMessage: (cb: Listener) => {
      clientListeners.push(cb);
      return () => {
        clientListeners.splice(clientListeners.indexOf(cb), 1);
      };
    },
  };

  const serverOptions = {
    postMessage: (msg: any) => {
      clientListeners.forEach((cb) => cb(msg));
      return () => {};
    },
    onMessage: (cb: Listener) => {
      serverListeners.push(cb);
      return () => {
        serverListeners.splice(serverListeners.indexOf(cb), 1);
      };
    },
  };

  return {
    clientOptions,
    serverOptions,
  };
}
