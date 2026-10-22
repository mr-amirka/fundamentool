import {
  colorGetBackground,
} from '../src/colorGetBackground';

describe('colorGetBackground', () => {
  test('returns linear gradient for two colors', () => {
    const result = colorGetBackground('ff0000-0000ff');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/linear-gradient/);
    expect(result[0]).toMatch(/180deg/);
  });

  test('returns radial gradient when _r suffix is used', () => {
    const result = colorGetBackground('ff0000-0000ff_r');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/radial-gradient/);
  });

  test('returns repeating gradient for _rpt suffix', () => {
    const result = colorGetBackground('ff0000-0000ff_rpt');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/repeating-linear-gradient/);
  });

  test('applies custom angle via _g suffix', () => {
    const result = colorGetBackground('ff0000-0000ff_g90');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/270deg/);
  });

  test('returns single color (not gradient) for single stop', () => {
    const result = colorGetBackground('ff0000');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/#f00|rgb/i);
  });

  test('alt mode returns rgb/rgba alternatives', () => {
    const result = colorGetBackground('ff000080-0000ff80', true);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('returns array', () => {
    const result = colorGetBackground('ff0000-ffffff');
    expect(Array.isArray(result)).toBe(true);
  });

  test('не падает на именованных синонимах цвета (regexpBg их не матчит)', () => {
    expect(() => colorGetBackground('Transparent')).not.toThrow();
    expect(colorGetBackground('Transparent')).toEqual(['transparent']);
    expect(colorGetBackground('T')).toEqual(['Transparent']);
    expect(colorGetBackground('CT')).toEqual(['currentColor']);
  });

  it('an angle below zero wraps round; a named radial shape; a stop\'s own position and unit', () => {
    expect(colorGetBackground('ff0000-0000ff_g-270')).toEqual(['linear-gradient(270deg,#f00 0%,#00f 100%)']);
    expect(colorGetBackground('ff0000-0000ff_r_ellipse_closestSide'))
      .toEqual(['radial-gradient(ellipse closest-side,#f00 0%,#00f 100%)']);
    expect(colorGetBackground('ff0000p20-0000ffp40px')).toEqual(['linear-gradient(180deg,#f00 20%,#00f 40px)']);
  });

  it('nothing to draw: no gradient; several stops with alpha: the rgba form', () => {
    expect(colorGetBackground('')).toEqual([]);
    expect(colorGetBackground('ff0000.5-0000ff')).toEqual(['linear-gradient(180deg,rgba(255,0,0,.5) 0%,#00f 100%)']);
  });
});
