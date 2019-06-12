const config = require('../../../config/jest.umd.config');
const buildJestModuleMap = require('./buildJestModuleMap');

config.rootDir = '../..';

config.moduleNameMapper = buildJestModuleMap(
  config.moduleNameMapper,
  '<rootDir>/hoc/lib/react-hoc.umd.js'
);

module.exports = config;
