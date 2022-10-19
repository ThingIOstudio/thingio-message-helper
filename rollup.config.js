import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import builtins from 'rollup-plugin-node-builtins'
import { terser } from 'rollup-plugin-terser';

export default defineConfig({
  input: 'src/main.ts',

  output: [{
    file: 'dist/index.esm.js', // package.json 中 "module": "dist/index.esm.js"
    format: 'esm', // es module 形式的包， 用来import 导入， 可以tree shaking
    sourcemap: true,
  },
  {
    file: 'dist/index.cjs.js', // package.json 中 "main": "dist/index.cjs.js",
    format: 'cjs', // commonjs 形式的包， require 导入
    sourcemap: true,
  },
  {
    file: 'dist/index.umd.js',
    name: 'platfromMessageHelper',
    format: 'umd', // umd 兼容形式的包， 可以直接应用于网页 script
    sourcemap: true,
  }
  ],
  plugins: [
    resolve({
      jsnext: true,
      preferBuiltins: true,
      browser: true
    }),
    commonjs(),
    babel({
      babelHelpers: 'bundled'
    }),
    builtins(),
    typescript({
      module: 'ESNext'
    }),
    json(),
    terser()
  ]
});