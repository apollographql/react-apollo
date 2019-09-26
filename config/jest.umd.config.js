const config = require('./jest.config');

config.moduleNameMapper = {
  '^@apollo\\/react-components':
    '<rootDir>/components/lib/react-components.umd.js',
  '^@apollo\\/react-hoc': '<rootDir>/hoc/lib/react-hoc.umd.js',
  '^@apollo\\/react-ssr': '<rootDir>/ssr/lib/react-ssr.umd.js',
};

module.exports = config;
