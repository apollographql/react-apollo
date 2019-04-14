const commonJestConfig = require('../../../config/jest.config');

module.exports = {
  ...commonJestConfig,
  setupFiles: ['../../config/tests-setup.ts'],
};
