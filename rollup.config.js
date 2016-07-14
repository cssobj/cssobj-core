// rollup.config.js

export default {
  entry: 'lib/cssobj-core.js',
  moduleName: 'cssobj_core',
  moduleId: 'cssobj_core',
  targets: [
    { format: 'iife', dest: 'dist/cssobj-core.iife.js' },
    { format: 'amd',  dest: 'dist/cssobj-core.amd.js'  },
    { format: 'cjs',  dest: 'dist/cssobj-core.cjs.js'  },
    { format: 'es',   dest: 'dist/cssobj-core.es.js'   }
  ]
}
