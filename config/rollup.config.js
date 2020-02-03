import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';
import invariantPlugin from 'rollup-plugin-invariant';
import fs from 'fs';
import { transformSync } from '@babel/core';
import cjsModulesTransform from '@babel/plugin-transform-modules-commonjs';
import { terser as minify } from 'rollup-plugin-terser';

const external = [
  '@apollo/react-common',
  '@apollo/react-components',
  '@apollo/react-hoc',
  '@apollo/react-hooks',
  '@apollo/react-testing',
  '@apollo/react-ssr',
  '@apollo/client',
  'graphql',
  'react-apollo',
  'react',
  'ts-invariant',
  'tslib',
  'fast-json-stable-stringify',
  'zen-observable',
  'hoist-non-react-statics',
  'prop-types',
  '@wry/equality',
];

export function rollup({
  name,
  input = './src/index.ts',
  outputPrefix = 'react',
}) {
  const tsconfig = './config/tsconfig.json';

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

  function fromESM() {
    return {
      input: outputFile('esm'),
      output: {
        file: outputFile('cjs'),
        format: 'esm',
        sourcemap: false,
      },
      plugins: [
        {
          transform(source, id) {
            const output = transformSync(source, {
              inputSourceMap: JSON.parse(fs.readFileSync(id + '.map')),
              sourceMaps: true,
              plugins: [
                [
                  cjsModulesTransform,
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
            // the output options above, and manually write the CJS source
            // maps here.
            fs.writeFileSync(
              outputFile('cjs') + '.map',
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
    fromESM(),
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
