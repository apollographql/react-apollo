# This is taken from graphql-js which does a great job of publishing with
# including sub-modules
# https://github.com/graphql/graphql-js/blob/master/resources/prepublish.sh#L23

# Publishing to NPM is currently supported by Travis CI, which ensures that all
# tests pass first and the deployed module contains the correct file structure.
# In order to prevent inadvertently circumventing this, we ensure that a CI
# environment exists before continuing.
if [ "$CI" != true ]; then
  echo "\n\n\n  \033[101;30m Only Travis CI can publish to NPM. \033[0m" 1>&2;
  echo "  Ensure git is left is a good state by backing out any commits and deleting any tags." 1>&2;
  echo "  Then read CONTRIBUTING.md to learn how to publish to NPM.\n\n\n" 1>&2;
  exit 1;
fi;

# When Travis CI publishes to NPM, the published files are available in the root
# directory, which allows for a clean include or require of sub-modules.
#
#    var language = require('graphql/language');
#
# go back one level
npm i && cp -R ./lib/src/ ./

# Ensure a vanilla package.json before deploying so other tools do not interpret
# The built output as requiring any further transformation.
node -e "var package = require('./package.json'); \
  delete package.babel; delete package.scripts; delete package.options; \
  require('fs').writeFileSync('package.json', JSON.stringify(package));"

npm i ci-npm-publish -g

ls ./
npm-publish
