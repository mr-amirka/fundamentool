import { getBase } from './get';
import { noopHandle } from './noopHandle';

const defaultPath = ['value'];

/**
 * Creates a change handler factory that maps an `event.target` field to a state value.
 *
 * @param set - State setter that accepts a partial state patch.
 * @returns A factory function `(name, prop?, map?)` that returns an event handler.
 * @example
 * const onChange = changeProviderProvider(set)('name', null, (v) => v.trim());
 */
export function changeProviderProvider<TState>(
  set: (partial: Partial<TState>) => void,
) {
  return (
    name: keyof TState & string,
    prop?: string,
    map: (value: any) => any = noopHandle,
  ) => {
    const path = prop ? prop.split('.') : defaultPath;
    return (e: any) => {
      const value = map(getBase(e && e.target, path));
      set({ [name]: value } as Partial<TState>);
    };
  };
}

