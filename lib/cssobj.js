/* global define, extend_exclude */

!(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['extend_exclude'], factory) // define(['jquery'], factory)
  } else if (typeof exports === 'object') {
    module.exports = factory(require('extend_exclude')) // factory(require('jquery'))
  } else {
    root.cssobj = factory(extend_exclude) // should return obj in factory
  }
}(this, function (util) {
  'use strict'

  // better type check
  var is = util._is
  var own = util._own
  var isPrimitive = util._isPrim

  /**
   * convert simple Object into tree data
   *
   format:
   {"a":{"b":{"c":{"":["leaf 1"]}}},"abc":123, e:[2,3,4], f:null}
   *        1. every key is folder node
   *        2. "":[] is leaf node
   *        3. except leaf node, array value will return as is
   *        4. {abc:123} is shortcut for {abc:{"": [123]}}
   *
   * @param {object} d - simple object data
   * @param {object} opt - options {indent:String, prefix:String||Boolean, local:Boolean}
   * @param {function} [prop] - function(key,val){} to return {object} to merge into current
   * @param {array} [path] - array path represent root to parent
   * @returns {object} tree data object
   */
  function convertSimpleData (d, opt, prop, path) {
    path = path || []
    if (is('Array', d)) {
      return d.map(function (v) {
        return convertSimpleData(v, opt, prop, path)
      })
    }
    if (is('Object', d)) {
      var propArray = []
      for (var k in d) {
        if (!own(d, k)) continue
        if (atRule(k)) {
          var atObj = cssobj(
            path.length ? objKV({}, getSelector(path, {localNames: {}, local: false}), d[k]) : d[k],
            util._pick2(opt, {store: 1}),
            opt.localNames
          )
          opt.store[k] = atObj.options.store
          continue
        }
        if (isPrimitive(d[k])) {
          propArray.push(getProp(k, opt) + ': ' + d[k])
        } else {
          convertSimpleData(d[k], opt, prop, path.concat({name: k, value: d[k]}))
        }
      }
      if (path.length && propArray.length) objKV(opt.store, getSelector(path, opt), propArray, true)
      return []
    }
    return []
  }

  function getProp (str, opt) {
    return !opt.propSugar ? str : str
      .replace(/^_|(.)_/g, function (m, p) {
        return p === '\\' ? '_' : (p || '') + '-'
      })
      .replace(/^([A-Z])|(.)([A-Z])/g, function (m, z1, p, z2) {
        var z = z1 || z2
        return p === '\\' ? z : (p || '') + '-' + z.toLowerCase()
      })
  }

  var atRule = function (key) { return /^@(?:media|document|supports)/.test(key) }
  var reClass = /:global\s*\(\s*((?:\.[-\w]+\s*)+)\s*\)|(\.)([!-\w]+)/g

  var random = (function () {
    var count = 0
    return function () {
      count++
      return '_' + Math.floor(Math.random() * Math.pow(2, 32)).toString(36) + count + '_'
    }
  })()

  function _splitComma (str) {
    for (var c, i = 0, n = 0, prev = 0, d = []; c = str[i]; i++) {
      if (/[\(\[]/.test(c)) n++
      if (/[\)\]]/.test(c)) n--
      if (!n && c == ',') d.push(str.substring(prev, i)), prev = i + 1
    }
    return d.concat(str.substring(prev))
  }

  function _repeat (str, n) {
    var s = ''
    while (n-- > 0) s += str
    return s
  }

  function getSelector (path, opt) {
    var replacer = function (match, global, dot, name) {
      if (global) {
        return global
      }
      if (name[0] === '!') {
        return dot + name.substr(1)
      }

      if (!opt.local) {
        opt.localNames[name] = name
      } else if (!opt.localNames[name]) {
        opt.localNames[name] = opt.prefix + name
      }

      return dot + opt.localNames[name]
    }

    var localize = function (name) {
      return name.replace(reClass, replacer)
    }

    var item
    var parent = ''
    for (var i = 0, len = path.length; i < len; i++) {
      item = path[i]
      if (!item.selector) {
        item.selector = _splitComma(item.name).map(function (v) {
          return _splitComma(parent).map(function (p) {
            return v.match(/^&|[^\\]&/) ? v.replace(/&/, p) : p + ' ' + v.replace(/\\&/g, '&')
          }).join(',')
        }).join(',').replace(/^\s+/, '')
      }
      parent = item.selector
    }
    return localize(parent)
  }

  function makeCSS (store, opt, level) {
    var k
    var s1 = []
    var s2 = []

    var makeProp = function (propArray) {
      return propArray.map(function (v) { return _repeat(opt.indent, level + 1) + v + ';' }).join('\n')
    }

    var makeRule = function (sel, body) {
      return _repeat(opt.indent, level) + sel +
        '\n' + _repeat(opt.indent, level) + '{\n' +
        body +
        '\n' + _repeat(opt.indent, level) + '}'
    }

    for (k in store) {
      if (!own(store, k)) continue
      // if it's @media etc.
      if (is('Object', store[k])) {
        s2.push(makeRule(k, makeCSS(store[k], opt, level + 1)))
      } else {
        s1.push(store[k].map(function (p) {
          return makeRule(k, makeProp(p))
        }).join('\n'))
      }
    }
    return s1.concat(s2).join('\n')
  }

  function objKV (obj, k, v, isArr) {
    if (!isArr) {
      obj[k] = v
      return obj
    }
    obj[k] = obj[k] || []
    obj[k].push(v)
    return obj
  }

  function cssobj (obj, options, localNames) {
    options = options || {}

    // set default options
    util._default(options, {
      local: true,
      propSugar: true,
      indent: '\t'
    })
    options.prefix = options.prefix || random()
    options.store = {}
    options.localNames = localNames || {}

    convertSimpleData(obj, options)

    var result = {
      css: makeCSS(options.store, options, 0),
      map: options.localNames,
      options: options
    }
    if (options.post) options.post.forEach(function (f) { f(result) })
    return result
  }

  // // no optins
  // console.log(cssobj(obj).css)

  // // save options
  // window.a = cssobj(obj, window.a? window.a.options : {})
  // console.log(a.css)

  // module exports
  return cssobj
}))
