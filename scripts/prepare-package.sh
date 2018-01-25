#!/bin/bash -e

# When we publish to npm, the published files are available in the root
# directory, which allows for a clean include or require of sub-modules.
#
#    var language = require('react-apollo/server');
#

# Ensure a vanilla package.json before deploying so other tools do not interpret
# The built output as requiring any further transformation.
node -e "var package = require('./package.json'); \
  delete package.babel; \
  delete package[\"lint-staged\"]; \
  delete package.jest; \
  delete package.bundlesize; \
  delete package[\"husky\"]; \
  delete package.scripts; \
  delete package.options; \
  package.main = 'index.js'; \
  package.module = 'index.mjs'; \
  package.typings = 'index.d.ts'; \
  var origVersion = 'local';
  var fs = require('fs'); \
  fs.writeFileSync('./lib/package.json', JSON.stringify(package, null, 2)); \
  "


# Copy few more files to ./lib
cp README.md lib/
cp LICENSE lib/
cp src/index.js.flow lib/
cp .npmignore lib/
