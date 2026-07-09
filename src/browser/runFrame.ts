declare function requestAnimationFrame(callback: (time: number) => void): number;

/**
 * Runs `callback` on each animation frame and accumulates elapsed time until
 * `interval` ms is reached, then calls `callback(balance)` and resets the balance.
 *
 * @param callback - Function called with the accumulated time delta in ms.
 * @param interval - Minimum interval between calls in ms (default: 0, every frame).
 * @returns A function that stops the animation loop.
 * @example
 * const stop = runFrame((delta) => console.log(delta), 100);
 * stop(); // stops the loop
 */
export function runFrame(callback: (delta: number) => void,
  interval: number = 0): () => void {
  let stop = false;
  let balance = 0;
  let lastTime = Date.now();

  function step(): void {
    if (stop) {
      return;
    }
    const now = Date.now();
    balance += now - lastTime;
    lastTime = now;
    if (balance >= interval) {
      callback(balance);
      balance = 0;
    }
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);

  return () => {
    stop = true;
  };
}