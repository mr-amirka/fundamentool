import {
  createEvent,
} from '../../src/createEvent';
import {
  createObservable,
} from '../../src/createObservable';
import {
  isStore,
} from '../../src/is/isStore';

describe('isStore', () => {
  it('a store has getState and watch — fundamentool\'s, a derived one, any alike (effector\'s); an event isn\'t one', () => {
    const $count = createObservable(0);
    expect(isStore($count)).toBe(true);
    expect(isStore($count.map((count) => count + 1))).toBe(true);
    expect(isStore({
      getState: () => 1,
      watch: () => () => undefined,
    })).toBe(true);
    expect(isStore(createEvent())).toBe(false);
    expect(isStore(null)).toBe(false);
    expect(isStore(true)).toBe(false);
    expect(isStore({
      getState: () => 1,
    })).toBe(false);
  });
});
