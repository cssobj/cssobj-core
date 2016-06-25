!(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['extend_exclude'], factory) // define(['jquery'], factory)
  } else if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory(require('extend_exclude')) // factory(require('jquery'))
  } else {
    root.cssobj = factory(extend_exclude) // should return obj in factory
  }
}(this, function (util) {
  'use strict'

  // better type check
  var type = {}.toString
  var own = {}.hasOwnProperty
  var OBJECT = type.call({})
  var ARRAY = type.call([])

  function isPrimitive (val) {
    return typeof val !== 'object' || !val
  }

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
   * @param {function} [prop] - function(key,val){} to return {object} to merge into current
   * @param {array} [path] - array path represent root to parent
   * @returns {object} tree data object
   */
  function convertSimpleData (d, options, prop, path) {
    path = path || []
    if (isPrimitive(d)) {
      // {abc:123} is shortcut for {abc:{"": [123]}}
      return [util._extend({name: d, _leaf: true}, prop && prop(d, path))]
    }
    if (type.call(d) === ARRAY) {
      return d
      // return d.map(function (v, i) {
      //   return convertSimpleData(v, prop, path.concat(i))
      // })
    }
    if (type.call(d) === OBJECT) {
      var node = []
      var propArray = []
      for (var k in d) {
        var child = convertSimpleData(d[k], options, prop, path.concat({name: k, value: d[k]}))
        // node.push(util._extend({name: k, children:child }, prop && prop(k, path)))
        if (child.length && child[0]._leaf) propArray.push(k.replace(/_/g, '-').replace(/[A-Z]/g, cam2Dash) + ':' + child[0].name)
      }
      if (path.length) objKV(store, getSelector(path, options), propArray)
      return node
    }
    return []
  }

  var propStart = '{\n'
  var propEnd = '\n}'
  var reClass = /:global\s*\(\s*((?:\.[-\w]+\s*)+)\s*\)|(\.)([!-\w]+)/g
  var reComma = /\s*,\s*/

  var store = {}
  var localNames = {}

  var count=0
  var random = function () {
    count++
    return '_' + Math.floor(Math.random() * Math.pow(2, 32)).toString(36) + count + '_'
  }

  function propFormatter (propArray) {
    return propArray.map(function (v) {return '\t' + v}).join(';\n')
  }

  function getSelector (path, options) {
    var replacer = function (match, global, dot, name) {
      if (global) {
        return global
      }
      if (name[0] === '!') {
        return dot + name.substr(1)
      }
      if (!localNames[name]) localNames[name] = options.local
        ? ( options.prefix=options.prefix||random(), options.prefix + name)
        : name
      return dot + localNames[name].match(/\S+$/)
    }

    var localize = function (name) {
      return name.replace(reClass, replacer)
    }

    var item, parent = ''
    for (var i = 0, len = path.length; i < len; i++) {
      item = path[i]
      if (!item.selector) {
        item.selector = item.name.split(reComma).map(function (v) {
          return parent.split(reComma).map(function (p) {
            return v.match(/^&|[^\\]&/) ? v.replace(/&/, p) : p.split(' ').concat(v.replace(/\\&/g, '&')).join(' ')
          }).join(', ')
        }).join(', ').replace(/^\s+/, '')
      }
      parent = item.selector
    }
    return localize(parent)
  }

  function getCSS () {
    return Object.keys(store).map(
      function (k) {
        return k + ' ' +
          propStart +
          propFormatter(store[k]) +
          propEnd
      }).join('\n')
  }

  function cam2Dash (c) {
    return '-' + c.toLowerCase()
  }

  function objKV (obj, k, v) {
    return obj[k] = v
  }

  var obj = {
    'ul.menu': {
      background_color: 'red',
      borderRadius: '2px',
      'li.item, li.cc': {
        '&:before, .link': {
          ".foo[title*='\\&'], :global(.xy)": {color: 'blue'},
          color: 'red'
        },
        'html:global(.ie8) &': {color: 'purple'},
        font_size: '12px'
      }
    }
  }

  var defaultOption = {local:true}
  function cssobj (obj, options) {
    options = options || {}
    // set default options
    util._deepIt(options, defaultOption, function(a,b,key){
      if(!(key in a)) a[key]=b[key]
    })
    convertSimpleData(obj, options)
    var result = {css: getCSS(), map: localNames, options:options}
    localNames = {}
    store = {}
    if (options.post) options.post.forEach(function (f) { f(result) })
    return result
  }

  // window.a = cssobj(obj, window.a? window.a.options : {})
  // console.log(a.css)

  // module exports
  return cssobj
}))
