import {
  changeProviderProviderSimple, 
} from '../src/changeProviderProviderSimple';

interface IState {
  name: string;
  age: number;
  active: boolean;
  count: number;
}

describe('changeProviderProviderSimple', () => {
  test('creates setter for a named field', () => {
    const patches: Partial<IState>[] = [];
    const change = changeProviderProviderSimple<IState>((patch) => patches.push(patch));

    const setName = change('name');
    setName('Alice');

    expect(patches).toEqual([{
      name: 'Alice', 
    }]);
  });

  test('creates independent setters for different fields', () => {
    const patches: Partial<IState>[] = [];
    const change = changeProviderProviderSimple<IState>((patch) => patches.push(patch));

    change('age')(30);
    change('active')(true);

    expect(patches).toEqual([{
      age: 30, 
    }, {
      active: true, 
    }]);
  });

  test('each call to setter invokes set with correct partial', () => {
    let lastPatch: Partial<IState> | undefined;
    const change = changeProviderProviderSimple<IState>((patch) => {
      lastPatch = patch; 
    });
    const setCount = change('count');

    setCount(1);
    expect(lastPatch).toEqual({
      count: 1, 
    });
    setCount(2);
    expect(lastPatch).toEqual({
      count: 2, 
    });
  });
});
