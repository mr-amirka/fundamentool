import { camelToSnakeCase } from '../src/camelToSnakeCase';

describe('camelToSnakeCase', () => {
  test('converts camelCase to snake_case', () => {
    expect(camelToSnakeCase('helloWorld')).toBe('hello_world');
  });
});
