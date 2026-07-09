/**
 * Simplified version of `changeProviderProvider`: value is passed directly to the setter.
 *
 * @param set - Function that applies a partial state update.
 * @returns A function that takes a state key and returns a setter for that key.
 * @example
 * const changeField = changeProviderProviderSimple((patch) => setState(patch));
 * const setName = changeField('name');
 * setName('Alice'); // calls setState({ name: 'Alice' })
 */
export function changeProviderProviderSimple<TState>(set: (partial: Partial<TState>) => void) {
  return (name: keyof TState & string) => {
    return (value: any) => {
      set({
        [name]: value,
      } as Partial<TState>);
    };
  };
}

