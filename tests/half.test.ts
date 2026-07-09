import {
  half, halfLast, 
} from '../src/half';

describe('half', () => {
  test('splits on first occurrence', () => {
    const [left, right] = half('a-b-c', '-');
    expect(left).toBe('a');
    expect(right).toBe('b-c');
  });

  test('returns full string in first element when separator not found', () => {
    const [left, right] = half('hello', '-');
    expect(left).toBe('hello');
    expect(right).toBe('');
  });

  test('splits on multi-char separator', () => {
    const [left, right] = half('one::two::three', '::');
    expect(left).toBe('one');
    expect(right).toBe('two::three');
  });
});

describe('halfLast', () => {
  test('splits on last occurrence', () => {
    const [left, right] = halfLast('a-b-c', '-');
    expect(left).toBe('a-b');
    expect(right).toBe('c');
  });

  test('returns full string in second element when separator not found', () => {
    const [left, right] = halfLast('hello', '-');
    expect(left).toBe('hello');
    expect(right).toBe('');
  });
});
