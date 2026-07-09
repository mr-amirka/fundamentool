import {
  convertToBreakLineHTML, 
} from '../src/convertToBreakLineHTML';

describe('convertToBreakLineHTML', () => {
  test('wraps single line in span', () => {
    expect(convertToBreakLineHTML('hello')).toBe('<span>hello</span>');
  });

  test('splits on newlines and adds br', () => {
    const result = convertToBreakLineHTML('a\nb');
    expect(result).toContain('<span>a</span>');
    expect(result).toContain('<br/>');
    expect(result).toContain('b');
  });

  test('escapes angle brackets', () => {
    expect(convertToBreakLineHTML('<script>')).toBe('<span>&lt;script&gt;</span>');
  });

  test('empty line becomes br only', () => {
    const result = convertToBreakLineHTML('x\n\ny');
    expect(result).toMatch(/<br\/>/);
  });
});
