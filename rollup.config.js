import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: './src/index.js',
  output: {
    file: './dist/index.js',
    format: 'iife',
    name: 'App',
    sourcemap: true,
  },
  plugins: [
    babel({
      exclude: 'node_modules/**'
    }),
    resolve({
    jsnext: true,
    main: true
    }),
    commonjs(),
  ],
}
