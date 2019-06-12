const config = require('../../../config/jest.cjs.config');
const buildJestModuleMap = require('./buildJestModuleMap');

config.rootDir = '../..';

config.moduleNameMapper = buildJestModuleMap(
  config.moduleNameMapper,
  '<rootDir>/hoc/lib/react-hoc.cjs.js'
);

module.exports = config;
