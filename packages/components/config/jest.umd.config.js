const config = require('../../../config/jest.umd.config');
const buildJestModuleMap = require('./buildJestModuleMap');

config.rootDir = '../..';

config.moduleNameMapper = buildJestModuleMap(
  config.moduleNameMapper,
  '<rootDir>/components/lib/react-components.umd.js'
);

module.exports = config;
