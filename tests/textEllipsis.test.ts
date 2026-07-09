import {
  textEllipsis, 
} from '../src/textEllipsis';

describe('textEllipsis', () => {
  test('truncates text exceeding the limit', () => {
    expect(textEllipsis('hello world', 5)).toBe('hello...');
  });

  test('does not truncate text within limit', () => {
    expect(textEllipsis('hi', 5)).toBe('hi');
  });

  test('does not truncate text equal to limit', () => {
    expect(textEllipsis('hello', 5)).toBe('hello');
  });

  test('uses default limit of 12', () => {
    expect(textEllipsis('this is a very long text')).toBe('this is a ve...');
  });

  test('uses custom suffix', () => {
    expect(textEllipsis(
      'hello world', 5, ' …',
    )).toBe('hello …');
  });

  test('handles undefined input', () => {
    expect(textEllipsis(undefined, 5)).toBe('');
  });

  test('handles null input', () => {
    expect(textEllipsis(null, 5)).toBe('');
  });

  test('converts non-string to string', () => {
    expect(textEllipsis(12345678901234, 5)).toBe('12345...');
  });
});
