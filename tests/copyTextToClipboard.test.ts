import { copyTextToClipboard } from '../src/copyTextToClipboard';

describe('copyTextToClipboard', () => {
  test('uses navigator.clipboard.writeText when available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    const win = {
      navigator: { clipboard: { writeText } },
      document: {},
    };

    copyTextToClipboard('hello', win);

    expect(writeText).toHaveBeenCalledWith('hello');
  });

  test('falls back to execCommand when clipboard API unavailable', () => {
    const execCommand = jest.fn().mockReturnValue(true);
    const textArea: any = {
      value: '',
      style: {},
      focus: jest.fn(),
      select: jest.fn(),
    };
    const win = {
      navigator: {},
      document: {
        createElement: jest.fn().mockReturnValue(textArea),
        body: {
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        },
        execCommand,
      },
    };

    copyTextToClipboard('world', win);

    expect(win.document.createElement).toHaveBeenCalledWith('textarea');
    expect(textArea.value).toBe('world');
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(win.document.body.removeChild).toHaveBeenCalledWith(textArea);
  });

  test('does nothing when no window is available', () => {
    expect(() => copyTextToClipboard('text', undefined)).not.toThrow();
  });

  test('does nothing when document is missing', () => {
    const win = { navigator: {} };
    expect(() => copyTextToClipboard('text', win as any)).not.toThrow();
  });
});
