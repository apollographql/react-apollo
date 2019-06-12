const config = require('../../../config/jest.cjs.config');
const buildJestModuleMap = require('./buildJestModuleMap');

config.rootDir = '../..';

config.moduleNameMapper = buildJestModuleMap(
  config.moduleNameMapper,
  '<rootDir>/hooks/lib/react-hooks.cjs.js'
);

module.exports = config;
