module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: '../packages',
  projects: ['<rootDir>'],
  globals: {
    'ts-jest': {
      tsConfig: './config/tsconfig.base.json',
    },
  },
  coverageDirectory: './meta/coverage',
  moduleNameMapper: {
    '^@apollo\\/react-([^/]+)': '<rootDir>/$1/src',
  },
  testPathIgnorePatterns: ['/examples'],
};
