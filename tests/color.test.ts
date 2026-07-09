import {
  color, 
} from '../src/color';
import {
  colorRange, 
} from '../src/colorRange';

describe('color', () => {
  test('converts 6-digit hex to rgb string', () => {
    expect(color('ff0000')).toEqual(['#f00']);
  });

  test('converts 8-digit hex with full alpha to rgb string', () => {
    expect(color('ff0000ff')).toEqual(['#f00']);
  });

  test('converts 8-digit hex with alpha to rgba string', () => {
    const result = color('ff000080');
    expect(result[0]).toMatch(/^rgba\(/);
    expect(result[0]).toContain('255,0,0');
  });

  test('resolves CT synonym', () => {
    expect(color('CT')).toEqual(['currentColor']);
  });

  test('resolves T synonym', () => {
    expect(color('T')).toEqual(['Transparent']);
  });

  test('resolves CSS variable', () => {
    expect(color('--my-color,red;')).toEqual(['var(--my-color,red)']);
  });

  test('passes through unknown values lowercased', () => {
    expect(color('Red')).toEqual(['red']);
  });
});

describe('colorRange', () => {
  test('returns single color for single-element input with precision 0', () => {
    const result = colorRange([[
      1,
      0,
      0,
      1,
    ]], 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/^rgba\(/);
  });

  test('interpolates between two colors', () => {
    const result = colorRange([[
      1,
      0,
      0,
      1,
    ], [
      0,
      0,
      1,
      1,
    ]], 1);
    expect(result.length).toBeGreaterThan(2);
    expect(result[0]).toMatch(/^rgba\(/);
  });
});
