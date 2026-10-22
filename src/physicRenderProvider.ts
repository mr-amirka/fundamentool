import {
  intervalAsync,
} from './async/intervalAsync';

/**
 * Provides simple "physics" render loop with fixed timestep.
 *
 * @param fn - The function to call on each timestep.
 * @param timestep - The timestep to use.
 * @param runner - The runner to use.
 * @returns The physic render provider.
 * @example
 * const physicRender = physicRenderProvider((timestep) => console.log(timestep));
 * physicRender.play(); // => void
 * physicRender.pause(); // => void
 * physicRender.isPlaying(); // => boolean
 */
export const physicRenderProvider = (
  fn: (timestep: number) => void,
  timestep: number,
  runner: typeof intervalAsync = intervalAsync,
) => {
  let stop: (() => void) | 0 = 0;
  let lastTime: number;
  let balance = 0;

  function pause() {
    if (stop) {
      stop();
      stop = 0;
    }
    return self;
  }

  function handle() {
    const currentTime = Date.now();
    const difference = currentTime - lastTime;
    lastTime = currentTime;
    balance += difference;
    // A fixed step: as many steps as the time that passed holds — one `timestep` taken from the balance each
    for (; balance > timestep; balance -= timestep) {
      fn(timestep);
    }
  }

  function play() {
    lastTime = Date.now();
    if (!stop) {
      stop = runner(handle, timestep);
    }
    return self;
  }

  const self = {
    pause,
    play,
    isPlaying: () => !!stop,
  };

  return self;
};

