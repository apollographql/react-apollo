module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: '..',
  projects: ['<rootDir>'],
  globals: {
    'ts-jest': {
      tsConfig: './config/tsconfig.base.json',
    },
  },
  // globals: {
  //   'ts-jest': {
  //     tsConfig: './config/tsconfig.cjs.json',
  //   },
  // },
  coverageDirectory: './meta/coverage',
  moduleNameMapper: {
    '^@apollo\\/react-([^/]+)': '<rootDir>/packages/$1/src',
  },
};
