import { changeProviderProvider } from '../src/changeProviderProvider';

interface IState {
  name: string;
  checked: boolean;
  age: number;
}

describe('changeProviderProvider', () => {
  test('calls set with patch for event.target.value by default', () => {
    const set = jest.fn();
    const onChange = changeProviderProvider<IState>(set)('name');

    onChange({ target: { value: 'Alice' } });

    expect(set).toHaveBeenCalledWith({ name: 'Alice' });
  });

  test('reads nested prop from event.target via dot-path', () => {
    const set = jest.fn();
    const onChange = changeProviderProvider<IState>(set)('checked', 'checked');

    onChange({ target: { checked: true } });

    expect(set).toHaveBeenCalledWith({ checked: true });
  });

  test('applies map transform to extracted value', () => {
    const set = jest.fn();
    const onChange = changeProviderProvider<IState>(set)('name', undefined, (v: string) => v.trim());

    onChange({ target: { value: '  Bob  ' } });

    expect(set).toHaveBeenCalledWith({ name: 'Bob' });
  });

  test('handles null event gracefully', () => {
    const set = jest.fn();
    const onChange = changeProviderProvider<IState>(set)('name');

    onChange(null);

    expect(set).toHaveBeenCalledWith({ name: undefined });
  });

  test('returns a new handler for each field', () => {
    const set = jest.fn();
    const factory = changeProviderProvider<IState>(set);
    const onName = factory('name');
    const onAge = factory('age');

    onName({ target: { value: 'Carol' } });
    onAge({ target: { value: 30 } });

    expect(set).toHaveBeenNthCalledWith(1, { name: 'Carol' });
    expect(set).toHaveBeenNthCalledWith(2, { age: 30 });
  });
});
