module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/tmp/**'],
  coverageThreshold: {
    global: {
      branches: 99,
      functions: 99,
      lines: 99,
      statements: 99,
    },
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  haste: {
    retainAllFiles: true,
    forceNodeFilesystemAPI: true,
  },
};
