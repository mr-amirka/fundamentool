/**
 * Copy text to clipboard.
 *
 * Uses the modern `navigator.clipboard.writeText` API when available,
 * and falls back to a hidden textarea + `document.execCommand('copy')`
 * in older environments.
 *
 * @param text - Text content to copy.
 * @param win - Optional window-like object, used mainly for testing.
 * @example
 * copyTextToClipboard('Hello, World!');
 * // Copies "Hello, World!" to the system clipboard
 */
export const copyTextToClipboard = (
  text: string,
  win?: { navigator?: any; document?: any },
): void => {
  const ctx: any = win || (typeof window !== 'undefined' ? window : undefined);
  if (!ctx) {
    // No window available (for example, in Node.js) – nothing to do.
    return;
  }

  const { navigator, document } = ctx;

  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('copyTextToClipboard: Could not copy text: ', err);
    });
    return;
  }

  if (!document || !document.createElement) {
    return;
  }

  const textArea = document.createElement('textarea');
  const { style } = textArea;
  textArea.value = text;
  style.position = 'fixed';
  style.zIndex = '-1';
  style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('fallbackCopyTextToClipboard: unable to copy', err);
  }

  document.body.removeChild(textArea);
};
