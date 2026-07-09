import {
  hash, 
} from '../../src/node/hash';

describe('node/hash', () => {
  test('returns a hex string', () => {
    const result = hash('hello');
    expect(typeof result).toBe('string');
    expect(/^[0-9a-f]+$/.test(result)).toBe(true);
  });

  test('sha256 by default produces 64-char hex', () => {
    expect(hash('hello').length).toBe(64);
  });

  test('same input always produces same output', () => {
    expect(hash('test')).toBe(hash('test'));
  });

  test('different inputs produce different hashes', () => {
    expect(hash('abc')).not.toBe(hash('def'));
  });

  test('md5 algorithm returns 32-char hex', () => {
    expect(hash('hello', 'md5').length).toBe(32);
  });

  test('accepts Buffer input', () => {
    const result = hash(Buffer.from('hello'));
    expect(result).toBe(hash('hello'));
  });
});
