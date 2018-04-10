import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json';
import ignore from 'rollup-plugin-ignore';

export default {
  input: './src/index.ts',
  output: {
    format: 'es',
    file: 'lib/index.js'
  },
  plugins: [
    resolve({
        browser: true,
        only: ['datavoyager']
    }),
    commonjs({
        namedExports: {
            // left-hand side can be an absolute path, a path
            // relative to the current directory, or the name
            // of a module in node_modules
            'node_modules/datavoyager/build/lib-voyager.js': ['CreateVoyager']
          }
    }),
    ignore(['font-awesome-sass-loader']),
    typescript({typescript: require("typescript")}),
    postcss(),
    // json()
  ],
//   external: id => /^@phosphor|@jupyterlab|react$|react-dom$|vega-lite$|vega$/.test(id)
}
