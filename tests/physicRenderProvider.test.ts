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
