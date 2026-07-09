import {
  normalizeStep, 
} from '../src/normalizeStep';

describe('normalizeStep', () => {
  test('parses positive number from string', () => {
    expect(normalizeStep('5')).toBe(5);
    expect(normalizeStep('1')).toBe(1);
  });

  test('defaults to 1 for empty/invalid', () => {
    expect(normalizeStep('')).toBe(1);
    expect(normalizeStep(undefined)).toBe(1);
  });

  test('clamps to at least 1', () => {
    expect(normalizeStep('0')).toBe(1);
    expect(normalizeStep('-1')).toBe(1);
  });

  test('when limit provided, returns min(step, limit)', () => {
    expect(normalizeStep('10', 5)).toBe(5);
    expect(normalizeStep('3', 10)).toBe(3);
  });
});
