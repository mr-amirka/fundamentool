import {
  joinMaps, 
} from '../../src/join/joinMaps';

describe('joinMaps', () => {
  test('joins keys from prefixes and suffixes into a flags map', () => {
    expect(joinMaps({
      a: 1, 
    }, {
      b: 1,
      c: 1, 
    })).toEqual({
      ab: 1,
      ac: 1, 
    });
  });

  test('uses separator between prefix and suffix keys', () => {
    expect(joinMaps(
      {
        a: 1, 
      }, {
        b: 1, 
      }, '.',
    )).toEqual({
      'a.b': 1, 
    });
  });

  test('writes into existing output map', () => {
    const output = {
      x: 1, 
    };
    joinMaps(
      {
        a: 1, 
      }, {
        b: 1, 
      }, '', output,
    );
    expect(output).toEqual({
      x: 1,
      ab: 1, 
    });
  });

  test('handles empty maps', () => {
    expect(joinMaps({}, {
      a: 1, 
    })).toEqual({});
    expect(joinMaps({
      a: 1, 
    }, {})).toEqual({});
  });
});
