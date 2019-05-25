import fs from 'fs';
import path from 'path';
import node from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import cjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import { terser as minify } from 'rollup-plugin-terser';

// The source-map-explorer package which powers `npm run analyze` works by
// examining the bundle.min.js.map file, so it's important to include the
// source maps of all the individual package bundles that went into
// building the final application bundle.
const sourceMapLoaderPlugin = {
  load(id) {
    if (id.endsWith('.esm.js')) {
      try {
        const map = JSON.parse(fs.readFileSync(id + '.map'));
        map.sources.forEach((source, i) => {
          map.sources[i] = path.normalize(path.join(id, source));
        });
        return {
          code: fs.readFileSync(id, 'utf8'),
          map: map
        };
      } catch (e) {
        console.log('failed to find source map for ' + id);
      }
    }
    return null;
  }
};

function build({ outputPrefix, externals = [] }) {
  return {
    input: 'main.js',
    output: {
      file: outputPrefix + '.min.js',
      format: 'cjs',
      sourcemap: true
    },
    external(id) {
      return externals.indexOf(id) >= 0;
    },
    plugins: [
      node({
        module: true
      }),
      replace({
        // It's important to replace process.env.NODE_ENV earlier in the Rollup
        // pipeline (as well as later, during minification), so Rollup can prune
        // the module dependency graph using this information.
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      sourceMapLoaderPlugin,
      babel({
        exclude: 'node_modules/**',
        presets: [require('@babel/preset-react')]
      }),
      cjs({
        namedExports: {
          'node_modules/react/index.js': [
            'Component',
            'createElement',
            'Children'
          ],
          'node_modules/prop-types/index.js': [
            'any',
            'arrayOf',
            'bool',
            'func',
            'node',
            'number',
            'object',
            'oneOfType',
            'string'
          ],
          'node_modules/react/index.js': [
            'useContext',
            'useReducer',
            'useRef',
            'useEffect',
            'useState'
          ]
        }
      }),
      minify({
        mangle: {
          toplevel: true
        },
        compress: {
          dead_code: true,
          global_defs: {
            '@process.env.NODE_ENV': JSON.stringify('production')
          }
        }
      })
    ]
  };
}

export default [
  build({
    // While react and react-dom are certainly relevant to bundle size, they
    // would dwarf the Apollo and graphql-js packages, and there's not much we
    // can do about how large they are, since they ship their own minified
    // production builds.
    externals: ['react', 'react-dom'],
    outputPrefix: 'app-without-react'
  }),
  build({
    externals: [],
    outputPrefix: 'app-with-react'
  })
];
