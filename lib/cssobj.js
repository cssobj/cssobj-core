!(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory) // define(['jquery'], factory)
  } else if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory() // factory(require('jquery'))
  } else {
    root.cssobj = factory() // should return obj in factory
  }
}(this, function () {
  'use strict'

  // better type check
  var type = {}.toString
  var own = {}.hasOwnProperty
  var OBJECT = type.call({})
  var ARRAY = type.call([])
  var STRING = type.call('')

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
  function convertSimpleData (d, prop, path) {
    path = path || []
    if (isPrimitive(d)) {
      // {abc:123} is shortcut for {abc:{"": [123]}}
      return [Object.assign({name: d, _leaf: true}, prop && prop(d, path))]
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
        var child = convertSimpleData(d[k], prop, path.concat({name: k, value: d[k]}))
        // node.push(Object.assign({name: k, children:child }, prop && prop(k, path)))
        if (child.length && child[0]._leaf) propArray.push(k.replace(/_/g, '-').replace(/[A-Z]/g, decamelize) + ':' + child[0].name)
      }
      if (path.length) objKV(buf, getSelector(path), propArray)
      return node
    }
    return []
  }

  var propStart = '{\n'
  var propEnd = '\n}'
  var reClass = /:global\s*\(\s*((?:\.[-\w]+\s*)+)\s*\)|(\.)([-\w]+)/g
  var reComma = /\s*,\s*/

  var buf = {}
  var localNames = {}
  var count = 0
  var postPlugins = []
  var selectorPlugins = []

  var prefix = function() {
    return '_' + Math.floor(Math.random() * Math.pow(2, 32)).toString(36)
  }

  function propFormatter (propArray) {
    return propArray.map(function (v) {return '\t' + v}).join(';\n')
  }

  function replacer (match, global, dot, name) {
    if (global) {
      return global
    }
    if (!localNames[name]) localNames[name] = prefix() + count + '_' + name
    return dot + localNames[name].match(/\S+$/)
  }

  function localize (name) {
    return name.replace(reClass, replacer)
  }

  function getSelector (path) {
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
    return Object.keys(buf).map(
      function (k) {
        return k + ' ' +
          propStart +
          propFormatter(buf[k]) +
          propEnd
      }).join('\n')
  }

  function decamelize (match) {
    return '-' + match.toLowerCase()
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

  function cssobj (obj) {
    count++
    convertSimpleData(obj)
    var result = {css: getCSS(), map: localNames}
    localNames = {}
    buf = {}
    postPlugins.forEach(function(f){ f.call(null, result, count) })
    return result
  }

  cssobj.use = function(type, fn) {
    switch(type){
    case 'post':
      postPlugins.push(fn)
      break
    case 'selector':
      selectorPlugins.push(fn)
      break
    }
  }

  // console.log(cssobj(obj).css)

  // module exports
  return cssobj
}))
