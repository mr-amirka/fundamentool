import type {
  THistoryPort,
} from '../../src/navigation/history';

/** A browser history in memory: `go` moves, then the event arrives asynchronously — like `popstate`. */
export function fakeHistory(startPath = '/', startState: unknown = null) {
  const stack: { state: unknown;
    path: string }[] = [{
    state: startState,
    path: startPath, 
  }];
  let index = 0;
  let listener: ((state: unknown) => void) | null = null;

  function move(delta: number): void {
    const target = Math.max(0, Math.min(stack.length - 1, index + delta));
    if (target === index) {
      return;
    }
    index = target;
    setTimeout(() => listener?.(stack[index].state), 0);
  }

  const port: THistoryPort = {
    state: () => stack[index].state,
    path: () => stack[index].path,
    push: (state, path) => {
      stack.splice(index + 1);
      stack.push({
        state,
        path, 
      });
      index++;
    },
    replace: (state, path) => {
      stack[index] = {
        state,
        path, 
      };
    },
    go: move,
    listen: (callback) => {
      listener = callback;
      return () => {
        listener = null;
      };
    },
  };
  return {
    port,
    /** The player presses back (browser or Android). */
    userBack: () => move(-1),
    /** The player presses forward. */
    userForward: () => move(1),
    /** The player jumps several entries at once (a long press on back). */
    userGo: (delta: number) => move(delta),
    /** Where the browser is. */
    index: () => index,
    paths: () => stack.map((item) => item.path),
    /** An entry of somebody else (e.g. from before a reload) arrives. */
    foreign: (path: string) => {
      stack.splice(index + 1);
      stack.push({
        state: {
          nav: 'old-session',
          depth: 3, 
        },
        path, 
      });
      index++;
      setTimeout(() => listener?.(stack[index].state), 0);
    },
  };
}

/** Lets queued timers and promises run. */
export function settle(ms = 5): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Retries `check` until it passes (or throws its last failure after `timeout` ms) — no fixed waits that a busy machine outruns. */
export async function waitFor(check: () => void, timeout = 3000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      check();
      return;
    } catch (error) {
      if (Date.now() - start > timeout) {
        throw error;
      }
      await settle(5);
    }
  }
}
