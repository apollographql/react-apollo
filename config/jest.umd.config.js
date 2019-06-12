const config = require('./jest.config');

config.moduleNameMapper = {
  '^@apollo\\/react-([^/]+)': '<rootDir>/$1/lib/react-$1.umd.js',
};

module.exports = config;
