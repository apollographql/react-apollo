const config = require('../../../config/jest.umd.config');
const buildJestModuleMap = require('./buildJestModuleMap');

config.rootDir = '../..';

config.moduleNameMapper = buildJestModuleMap(
  config.moduleNameMapper,
  '<rootDir>/hooks/lib/react-hooks.umd.js'
);

module.exports = config;
