import {
  copyTextToClipboard,
} from '../src/copyTextToClipboard';

describe('copyTextToClipboard', () => {
  test('uses navigator.clipboard.writeText when available', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    const win = {
      navigator: {
        clipboard: {
          writeText,
        },
      },
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
    const win = {
      navigator: {},
    };
    expect(() => copyTextToClipboard('text', win as any)).not.toThrow();
  });
});

describe('copyTextToClipboard — the page\'s window, failures', () => {
  it('no window given: the page\'s own', () => {
    const writeText = jest.fn(() => Promise.resolve());
    (globalThis as any).window = {
      navigator: {
        clipboard: {
          writeText,
        },
      },
    };
    try {
      copyTextToClipboard('hi');
    } finally {
      delete (globalThis as any).window;
    }
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('the clipboard refuses, the old copy command throws: logged, nothing thrown; the textarea removed', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const refused = new Error('denied');
      copyTextToClipboard('hi', {
        navigator: {
          clipboard: {
            writeText: () => Promise.reject(refused),
          },
        },
      });
      await Promise.resolve();
      await Promise.resolve();
      expect(error).toHaveBeenCalledWith('copyTextToClipboard: Could not copy text: ', refused);

      const failure = new Error('no copy');
      const textArea = {
        style: {},
        focus: jest.fn(),
        select: jest.fn(),
      };
      const body = {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      };
      copyTextToClipboard('hi', {
        document: {
          createElement: () => textArea,
          body,
          execCommand: () => {
            throw failure;
          },
        },
      });
      expect(error).toHaveBeenCalledWith('fallbackCopyTextToClipboard: unable to copy', failure);
      expect(body.removeChild).toHaveBeenCalledWith(textArea);
    } finally {
      error.mockRestore();
    }
  });
});
