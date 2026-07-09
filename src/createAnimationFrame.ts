/**
 * Creates an animation frame.
 * 
 * @param callback - The callback to call when the animation frame is ready.
 * @param interval - The interval to call the callback.
 * @returns The function to stop the animation frame.
 * @example
 * const stop = createAnimationFrame((balance) => {
 *   console.log('tick', balance);
 * }, 100);
 * stop(); // stops the animation frame loop
 */
export const createAnimationFrame = (callback: (balance: number) => void, interval?: number) => {
  const _interval = interval || 0;
  let _stop = false;
  let _balance = 0;
  let _lastTime = Date.now();
  function step() {
    if (_stop) {
      return;
    }
    const _time = Date.now();
    _balance += _time - _lastTime;
    _lastTime = _time;
    if (_balance >= _interval) {
      callback(_balance);
      _balance = 0;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  return () => {
    _stop = true;
  };
};
