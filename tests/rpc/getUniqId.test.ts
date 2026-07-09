import {
  getUniqId, 
} from '../../src/rpc/getUniqId';

describe('rpc/getUniqId', () => {
  test('returns a non-empty string', () => {
    expect(typeof getUniqId()).toBe('string');
    expect(getUniqId().length).toBeGreaterThan(0);
  });

  test('returns unique values on each call', () => {
    const ids = new Set(Array.from({
      length: 100, 
    }, () => getUniqId()));
    expect(ids.size).toBe(100);
  });
});
