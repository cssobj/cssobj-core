// rollup.config.js
import {readFileSync} from 'fs'
import replace from 'rollup-plugin-replace'

var pkg = JSON.parse(readFileSync('package.json', 'utf-8'))

var lib = 'lib/cssobj-core.js'

var commitHash = (function () {
  try {
    return readFileSync('.commithash', 'utf-8').trim()
  } catch (err ) {
    return 'unknown'
  }
})()


var banner = readFileSync('lib/zbanner.js', 'utf-8')
    .replace('<@VERSION@>', pkg.version)
    .replace('<@TIME@>', new Date())
    .replace('<@COMMIT@>', commitHash)

export default {
  entry: lib,
  moduleName: 'cssobj_core',
  amd: {id: 'cssobj_core'},
  plugins: [
    replace({
      include: lib,
      delimiters: [ '<@', '@>' ],
      sourceMap: true,
      values: {
        VERSION: pkg.version,
        COMMIT: commitHash,
        TIME: new Date()
      }
    })
  ],
  banner: banner,
  targets: [
    { format: 'iife', dest: 'dist/cssobj-core.iife.js' },
    { format: 'amd',  dest: 'dist/cssobj-core.amd.js'  },
    { format: 'umd',  dest: 'dist/cssobj-core.amd.js'  },
    { format: 'cjs',  dest: 'dist/cssobj-core.cjs.js'  },
    { format: 'es',   dest: 'dist/cssobj-core.es.js'   }
  ]
}
