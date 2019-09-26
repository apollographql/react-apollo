const config = require('./jest.config');

config.moduleNameMapper = {
  '^@apollo\\/react-components':
    '<rootDir>/components/lib/react-components.cjs.js',
  '^@apollo\\/react-hoc': '<rootDir>/hoc/lib/react-hoc.cjs.js',
  '^@apollo\\/react-ssr': '<rootDir>/ssr/lib/react-ssr.cjs.js',
};

module.exports = config;
