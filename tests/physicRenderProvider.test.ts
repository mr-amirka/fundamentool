import {
  physicRenderProvider,
} from '../src/physicRenderProvider';

describe('physicRenderProvider', () => {
  test('is not playing initially', () => {
    const provider = physicRenderProvider(
      jest.fn(), 16, jest.fn(),
    );
    expect(provider.isPlaying()).toBe(false);
  });

  test('isPlaying returns true after play()', () => {
    const cancel = jest.fn();
    const runner = jest.fn().mockReturnValue(cancel);
    const provider = physicRenderProvider(
      jest.fn(), 16, runner,
    );

    provider.play();

    expect(provider.isPlaying()).toBe(true);
  });

  test('pause() stops the runner and sets isPlaying to false', () => {
    const cancel = jest.fn();
    const runner = jest.fn().mockReturnValue(cancel);
    const provider = physicRenderProvider(
      jest.fn(), 16, runner,
    );

    provider.play();
    provider.pause();

    expect(cancel).toHaveBeenCalled();
    expect(provider.isPlaying()).toBe(false);
  });

  test('play() returns self for chaining', () => {
    const runner = jest.fn().mockReturnValue(jest.fn());
    const provider = physicRenderProvider(
      jest.fn(), 16, runner,
    );

    expect(provider.play()).toBe(provider);
  });

  test('pause() returns self for chaining', () => {
    const runner = jest.fn().mockReturnValue(jest.fn());
    const provider = physicRenderProvider(
      jest.fn(), 16, runner,
    );

    provider.play();
    expect(provider.pause()).toBe(provider);
  });

  test('play() is idempotent — does not start a second runner', () => {
    const runner = jest.fn().mockReturnValue(jest.fn());
    const provider = physicRenderProvider(
      jest.fn(), 16, runner,
    );

    provider.play();
    provider.play();

    expect(runner).toHaveBeenCalledTimes(1);
  });

  test('runner is called with the handle function and timestep', () => {
    const runner = jest.fn().mockReturnValue(jest.fn());
    const provider = physicRenderProvider(
      jest.fn(), 100, runner,
    );

    provider.play();

    expect(runner).toHaveBeenCalledWith(expect.any(Function), 100);
  });
});

describe('physicRenderProvider — the fixed step', () => {
  it('runs as many steps as the time that passed holds, the rest kept for the next frame', () => {
    let tick: () => void = () => undefined;
    const runner = jest.fn((handle: () => void) => {
      tick = handle;
      return jest.fn();
    });
    const steps: number[] = [];
    let now = 1000;
    const clock = jest.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      physicRenderProvider(
        (step) => steps.push(step), 16, runner as never,
      ).play();
      now += 50; // three steps (48 ms), 2 ms left
      tick();
      expect(steps).toEqual([
        16,
        16,
        16,
      ]);
      now += 15; // 17 ms with the rest: one more
      tick();
      expect(steps).toHaveLength(4);
    } finally {
      clock.mockRestore();
    }
  });
});
