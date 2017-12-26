#!/bin/bash -e

# When we publish to npm, the published files are available in the root
# directory, which allows for a clean include or require of sub-modules.
#
#    var language = require('react-apollo/server');
#

# Clear the built output
rm -rf ./lib ./npm

# Compile new files
npm run compile

# Make sure the ./npm directory is empty
rm -rf ./npm
mkdir ./npm

# Copy all files from ./lib to /npm
cd ./lib && cp -r ./ ../npm/

# Back to the root directory
cd ../

# Ensure a vanilla package.json before deploying so other tools do not interpret
# The built output as requiring any further transformation.
node -e "var package = require('./package.json'); \
  delete package.babel; \
  delete package[\"lint-staged\"]; \
  delete package.jest; \
  delete package.bundlesize; \
  delete package[\"pre-commit\"]; \
  delete package.scripts; \
  delete package.options; \
  package.main = 'umd/react-apollo.umd.js'; \
  package.module = 'index.js'; \
  package['jsnext:main'] = 'index.js'; \
  package.typings = 'index.d.ts'; \
  var origVersion = 'local';
  var fs = require('fs'); \
  fs.writeFileSync('./npm/package.json', JSON.stringify(package, null, 2)); \
  "


# Copy few more files to ./npm
cp README.md npm/
cp LICENSE npm/
cp src/index.js.flow npm/
# please keep this in sync with the filename used in package.main
cp src/index.js.flow npm/react-apollo.umd.js.flow

