module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: '..',
  projects: ['<rootDir>'],
  globals: {
    'ts-jest': {
      tsConfig: './config/tsconfig.cjs.json',
    },
  },
  setupFiles: ['./config/tests-setup.ts'],
  coverageDirectory: './meta/coverage',
};
