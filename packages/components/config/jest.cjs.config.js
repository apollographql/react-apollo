const config = require('../../../config/jest.cjs.config');
const buildJestModuleMap = require('./buildJestModuleMap');

config.rootDir = '../..';

config.moduleNameMapper = buildJestModuleMap(
  config.moduleNameMapper,
  '<rootDir>/components/lib/react-components.cjs.js'
);

module.exports = config;
