const config = require('../../../config/jest.cjs.config');
const buildJestModuleMap = require('./buildJestModuleMap');

config.rootDir = '../..';

config.moduleNameMapper = buildJestModuleMap(
  config.moduleNameMapper,
  '<rootDir>/common/lib/react-common.cjs.js'
);

module.exports = config;
