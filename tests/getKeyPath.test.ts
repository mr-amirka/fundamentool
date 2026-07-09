import {
  getKeyPath, 
} from '../src/getKeyPath';

describe('getKeyPath', () => {
  test('splits dot-notation string', () => {
    expect(getKeyPath('user.name')).toEqual(['user', 'name']);
  });

  test('handles bracket notation — captures only bracket contents, not text between brackets', () => {
    expect(getKeyPath('user[0]')).toEqual(['user', '0']);
    expect(getKeyPath('user[0][name]')).toEqual([
      'user',
      '0',
      'name',
    ]);
  });

  test('handles empty brackets as new-item token', () => {
    expect(getKeyPath('user[]')).toEqual(['user', '[]']);
    expect(getKeyPath('user[][1]')).toEqual([
      'user',
      '[]',
      '1',
    ]);
  });

  test('handles multiple bracket segments', () => {
    expect(getKeyPath('user[0][1]')).toEqual([
      'user',
      '0',
      '1',
    ]);
  });

  test('strips quotes inside brackets', () => {
    expect(getKeyPath('user["name"]')).toEqual(['user', 'name']);
    expect(getKeyPath("user['name']")).toEqual(['user', 'name']);
  });

  test('handles dot inside brackets as nested path', () => {
    expect(getKeyPath('user[name.age]')).toEqual([
      'user',
      'name',
      'age',
    ]);
  });

  test('single key with no dots or brackets', () => {
    expect(getKeyPath('name')).toEqual(['name']);
  });
});
