module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: '../packages',
  projects: ['<rootDir>'],
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/../config/tsconfig.base.json',
    },
  },
  coverageDirectory: './meta/coverage',
  moduleNameMapper: {
    '^@apollo\\/react-components': '<rootDir>/components/src',
    '^@apollo\\/react-hoc': '<rootDir>/hoc/src',
    '^@apollo\\/react-ssr': '<rootDir>/ssr/src',
  },
  //testMatch: ['<rootDir>/*/src/**/__tests__/**/*.test.ts?(x)'],
  testPathIgnorePatterns: ['/examples', '/lib'],
};
