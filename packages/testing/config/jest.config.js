module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  rootDir: '../src',
  globals: {
    'ts-jest': {
      tsConfig: './config/tsconfig.cjs.json',
    },
  },
};
