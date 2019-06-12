const config = require('../../../config/jest.umd.config');
const buildJestModuleMap = require('./buildJestModuleMap');

config.rootDir = '../..';

config.moduleNameMapper = buildJestModuleMap(
  config.moduleNameMapper,
  '<rootDir>/common/lib/react-common.umd.js'
);

module.exports = config;
