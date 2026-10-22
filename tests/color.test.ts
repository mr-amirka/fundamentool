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
    const result = colorRange([
      [
        1,
        0,
        0,
        1,
      ],
    ], 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/^rgba\(/);
  });

  test('interpolates between two colors', () => {
    const result = colorRange([
      [
        1,
        0,
        0,
        1,
      ],
      [
        0,
        0,
        1,
        1,
      ],
    ], 1);
    expect(result.length).toBeGreaterThan(2);
    expect(result[0]).toMatch(/^rgba\(/);
  });
});

describe('color — every length and form', () => {
  it('hex of 1–8 digits, with an alpha suffix; env() and var() without a fallback', () => {
    expect(color('f')).toEqual(['#fff']);
    expect(color('f.5')).toEqual(['rgba(255,255,255,.5)']);
    expect(color('f8')).toEqual(['rgba(255,255,255,.53)']);
    expect(color('f00')).toEqual(['#f00']);
    expect(color('f008')).toEqual(['rgba(255,0,0,.53)']);
    expect(color('f0080')).toEqual(['rgba(255,0,0,.5)']);
    expect(color('ff0000', true)).toEqual(['#f00']);
    expect(color('ff00007')).toEqual(['rgba(255,0,0,.47)']);
    expect(color('12345678', true)).toEqual([
      '#123456',
      'rgba(18,52,86,.47)',
    ]);
    expect(color('000.0')).toEqual(['rgba(0,0,0,0)']);
    expect(color('--x')).toEqual(['var(--x)']);
    expect(color('---safe-area,0')).toEqual(['env(--safe-area,0)']);
  });

  it('normalize without a value; one and double', () => {
    expect(color.normalize('')).toEqual([
      0,
      0,
      0,
      1,
    ]);
    expect(color.normalize('', '.5')).toEqual([
      0,
      0,
      0,
      0.5,
    ]);
    expect(color.one('f')).toBe(1);
    expect(color.double('00ff', 2)).toBe(1);
    expect(color.rgbStringify([
      17,
      34,
      51,
    ])).toBe('#123');
  });
});

describe('colorRange — the default precision', () => {
  it('0: the colors themselves, no steps between', () => {
    expect(colorRange([
      [
        0,
        0,
        0,
        1,
      ],
      [
        1,
        1,
        1,
        0.5,
      ],
    ])).toEqual([
      'rgba(0,0,0,1)',
      'rgba(255,255,255,0.5)',
    ]);
  });
});
