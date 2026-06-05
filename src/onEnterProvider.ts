/**
 * Creates key handler that calls `handle` on Enter key.
 * 
 * @param handle - The function to call when the Enter key is pressed.
 * @returns The function to call when the Enter key is pressed.
 * @example
 * const onEnter = onEnterProvider(() => console.log('Enter key pressed'));
 * onEnter({ key: 'Enter' }); // => 'Enter key pressed'
 */
export const onEnterProvider = (
  handle: () => void,
): ((e: { key: string }) => void) => {
  return (e: { key: string }) => {
    if (e.key === 'Enter') {
      handle();
    }
  };
};

