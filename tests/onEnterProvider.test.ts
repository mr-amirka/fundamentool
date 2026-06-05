import { onEnterProvider } from '../src/onEnterProvider';

describe('onEnterProvider', () => {
  test('calls handler when key is Enter', () => {
    const handle = jest.fn();
    const onEnter = onEnterProvider(handle);

    onEnter({ key: 'Enter' });

    expect(handle).toHaveBeenCalledTimes(1);
  });

  test('does not call handler for other keys', () => {
    const handle = jest.fn();
    const onEnter = onEnterProvider(handle);

    onEnter({ key: 'Escape' });
    onEnter({ key: 'Tab' });
    onEnter({ key: ' ' });

    expect(handle).not.toHaveBeenCalled();
  });

  test('calls handler each time Enter is pressed', () => {
    const handle = jest.fn();
    const onEnter = onEnterProvider(handle);

    onEnter({ key: 'Enter' });
    onEnter({ key: 'Enter' });

    expect(handle).toHaveBeenCalledTimes(2);
  });
});
