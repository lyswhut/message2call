const terser = require('@rollup/plugin-terser')
const babel = require('@rollup/plugin-babel')
const resolve = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
// const typescript = require('@rollup/plugin-typescript')
const fs = require('node:fs')
const path = require('node:path')

const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), './package.json')))
const banner = `/**!
* message2call.js v${pkg.version}
* Homepage: ${pkg.homepage}
* License: ${pkg.license}
*/`

module.exports = {
  input: 'dist/message2call.esm.js',
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
