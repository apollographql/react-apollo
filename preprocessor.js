// Copyright 2004-present Facebook. All Rights Reserved.

const tsc = require('typescript');
const babelJest = require('babel-jest');
const babelTransform = babelJest.createTransformer();
const tsconfig = require('./tsconfig.json');

module.exports = {
  process(src, path) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      return tsc.transpile(
        src,
        tsconfig.compilerOptions,
        path,
        []
      );
    }
    if (path.endsWith('.js') || path.endsWith('.jsx')) {
      return babelTransform.process(src, path);
    }
    return src;
  },
};
