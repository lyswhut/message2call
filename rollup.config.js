const resolve = require('@rollup/plugin-node-resolve')
const commonjs = require('@rollup/plugin-commonjs')
const typescript = require('@rollup/plugin-typescript')


module.exports = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/message2call.js',
      format: 'cjs',
    },
    {
      file: 'dist/message2call.esm.js',
      format: 'esm',
    },
  ],
  plugins: [
    typescript({
      tsconfig: 'tsconfig.json',
      outDir: './',
    }),
    resolve(),
    commonjs(),
  ],
}
