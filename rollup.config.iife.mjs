import terser from '@rollup/plugin-terser'
import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
// const typescript = require('@rollup/plugin-typescript')
import pkg from './package.json' with { type: 'json' }

const banner = `/**!
* message2call.js v${pkg.version}
* Homepage: ${pkg.homepage}
* License: ${pkg.license}
*/`

/** @type {import('rollup').RollupOptions} */
export default {
  input: 'dist/message2call.js',
  output: [
    {
      file: 'dist/message2call.min.js',
      format: 'iife',
      name: 'Message2call',
      // sourcemap: true,
      banner,
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
    }),
    terser(),
  ],
}
