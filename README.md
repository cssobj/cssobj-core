# CSSOBJ-CORE

[![Join the chat at https://gitter.im/css-in-js/cssobj](https://badges.gitter.im/css-in-js/cssobj.svg)](https://gitter.im/css-in-js/cssobj)
[![Build Status](https://travis-ci.org/cssobj/cssobj-core.svg?branch=master)](https://travis-ci.org/cssobj/cssobj-core)
[![Coverage Status](https://coveralls.io/repos/github/cssobj/cssobj-core/badge.svg?branch=master)](https://coveralls.io/github/cssobj/cssobj-core?branch=master)

  Generate **Virtual CSS** middle format, support for all cssobj functions and plugins.

  **Notice** The core API is different than [cssobj][]

[cssobj]: https://github.com/cssobj/cssobj

## API

### cssobj_core (config?: object) -> cssobj_factory_function

  The `config` param is almost the same as [cssobj][], but **without** `local` and `cssom`

  The `config` param has 2 props: `plugins`, `state`, the 2 are same as [cssobj][]

### cssobj_factory_function (obj?: object, state?: any) -> cssobj_result: object

  All the things of `cssobj_factory_function` same as [cssobj][]

### cssobj_result

  The `cssobj_result` almost same as [cssobj][], but **don't have** below

  (below added by [cssobj-plugin-localize](https://github.com/cssobj/cssobj-plugin-localize) in [cssobj][])

  - `space`

  - `localNames`

  - `mapClass`

  - `mapSel`

  - `cssdom`

  (below added by [plugin-cssom](https://github.com/cssobj/cssobj-plugin-cssom) in [cssobj][])

  - `cssdom`
