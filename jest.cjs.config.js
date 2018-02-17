const { jest } = require('./package.json');

jest.moduleNameMapper = {
  '\\.\\./src$': '<rootDir>/lib/index.js',
  '\\.\\./src/(.*)': '<rootDir>/lib/$1.js',
};

module.exports = jest;
