// Copyright 2004-present Facebook. All Rights Reserved.

const tsc = require('typescript');
const babelJest = require('babel-jest');
const babelTransform = babelJest.createTransformer();

module.exports = {
  process(src, path) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      return tsc.transpile(
        src,
        {
          module: tsc.ModuleKind.CommonJS,
          jsx: tsc.JsxEmit.React,
          target: tsc.ScriptTarget.ES5
        },
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
