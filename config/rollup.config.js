import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';
import invariantPlugin from 'rollup-plugin-invariant';
import fs from 'fs';
import { transformSync } from '@babel/core';
import cjsModulesTransform from '@babel/plugin-transform-modules-commonjs';
import umdModulesTransform from '@babel/plugin-transform-modules-umd';
import { terser as minify } from 'rollup-plugin-terser';

const defaultGlobals = {
  '@apollo/react-common': 'apolloReactCommon',
  '@apollo/react-components': 'apolloReactComponents',
  '@apollo/react-hoc': 'apolloReactHOC',
  '@apollo/react-hooks': 'apolloReactHooks',
  '@apollo/react-testing': 'apolloReactTesting',
  '@apollo/react-ssr': 'apolloReactSSR',
  'apollo-client': 'apolloClient',
  'apollo-utilities': 'apolloUtilities',
  'apollo-cache': 'apolloCache',
  'apollo-cache-inmemory': 'apolloCacheInMemory',
  'apollo-link': 'apolloLink',
  'graphql': 'graphql',
  'react-apollo': 'reactApollo',
  'react': 'React',
  'ts-invariant': 'invariant',
  'tslib': 'tslib',
  'fast-json-stable-stringify': 'stringify',
  'zen-observable': 'zenObservable',
  'hoist-non-react-statics': 'hoistNonReactStatics',
  'prop-types': 'PropTypes',
};

export function rollup({
  name,
  input = './src/index.ts',
  outputPrefix = 'react',
  extraGlobals = {},
}) {
  const tsconfig = './config/tsconfig.json';

  const globals = {
    ...defaultGlobals,
    ...extraGlobals,
  };

  function external(id) {
    return Object.prototype.hasOwnProperty.call(globals, id);
  }

  function outputFile(format) {
    return `./lib/${outputPrefix}-${name}.${format}.js`;
  }

  function onwarn(message) {
    const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];
    if (!suppressed.find(code => message.code === code)) {
      return console.warn(message.message);
    }
  }

  function fromSource(format) {
    return {
      input,
      external,
      output: {
        file: outputFile(format),
        format,
        sourcemap: true,
      },
      plugins: [
        nodeResolve({
          extensions: ['.ts', '.tsx'],
          module: true,
        }),
        typescriptPlugin({ typescript, tsconfig }),
        invariantPlugin({
          // Instead of completely stripping InvariantError messages in
          // production, this option assigns a numeric code to the
          // production version of each error (unique to the call/throw
          // location), which makes it much easier to trace production
          // errors back to the unminified code where they were thrown,
          // where the full error string can be found. See #4519.
          errorCodes: true,
        }),
      ],
      onwarn,
    };
  }

  function fromESM(toFormat) {
    return {
      input: outputFile('esm'),
      output: {
        file: outputFile(toFormat),
        format: 'esm',
        sourcemap: false,
      },
      // The UMD bundle expects `this` to refer to the global object. By default
      // Rollup replaces `this` with `undefined`, but this default behavior can
      // be overridden with the `context` option.
      context: 'this',
      plugins: [
        {
          transform(source, id) {
            const output = transformSync(source, {
              inputSourceMap: JSON.parse(fs.readFileSync(id + '.map')),
              sourceMaps: true,
              plugins: [
                [
                  toFormat === 'umd'
                    ? umdModulesTransform
                    : cjsModulesTransform,
                  {
                    loose: true,
                    allowTopLevelThis: true,
                  },
                ],
              ],
            });

            // There doesn't seem to be any way to get Rollup to emit a source map
            // that goes all the way back to the source file (rather than just to
            // the bundle.esm.js intermediate file), so we pass sourcemap:false in
            // the output options above, and manually write the CJS and UMD source
            // maps here.
            fs.writeFileSync(
              outputFile(toFormat) + '.map',
              JSON.stringify(output.map),
            );

            return {
              code: output.code,
            };
          },
        },
      ],
    };
  }

  return [
    fromSource('esm'),
    fromESM('cjs'),
    fromESM('umd'),
    {
      input: outputFile('cjs'),
      output: {
        file: outputFile('cjs.min'),
        format: 'esm',
      },
      plugins: [
        minify({
          mangle: {
            toplevel: true,
          },
          compress: {
            global_defs: {
              '@process.env.NODE_ENV': JSON.stringify('production'),
            },
          },
        }),
      ],
    },
  ];
}
