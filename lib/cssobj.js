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
  var type = function(v){return {}.toString.call(v).slice(8,-1)}
  var own = function(o, k){return {}.hasOwnProperty.call(o, k)}

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
   * @param {object} opt - options {indent:String, prefix:String||Boolean, local:Boolean}
   * @param {function} [prop] - function(key,val){} to return {object} to merge into current
   * @param {array} [path] - array path represent root to parent
   * @returns {object} tree data object
   */
  function convertSimpleData (d, opt, prop, path) {
    path = path || []
    if (isPrimitive(d)) {
      // {abc:123} is shortcut for {abc:{"": [123]}}
      return [util._extend({name: d, _leaf: true}, prop && prop(d, path))]
    }
    if (type(d) === 'Array') {
      return d.map(function(v){
        return convertSimpleData(v,opt,prop,path)
      })
    }
    if (type(d) === 'Object') {
      var node = []
      var propArray = []
      for (var k in d) {
        if(isCondition(k)){
          opt.store[k] = cssobj(
            objKV({}, getSelector(path, {localNames:{}, local:false}), d[k]),
            { prefix: opt.prefix },
            opt.localNames
          ).options.store
          continue
        }
        var child = convertSimpleData(d[k], opt, prop, path.concat({name: k, value: d[k]}))
        // node.push(util._extend({name: k, children:child }, prop && prop(k, path)))
        if (child.length && child[0]._leaf) propArray.push(k.replace(/_/g, '-').replace(/[A-Z]/g, cam2Dash) + ': ' + child[0].name)
      }
      if (path.length) objKV(opt.store, getSelector(path, opt), propArray, true)
      return node
    }
    return []
  }

  var isCondition = function(key){ return /^@(?:media|document|supports)/.test(key) }
  var reClass = /:global\s*\(\s*((?:\.[-\w]+\s*)+)\s*\)|(\.)([!-\w]+)/g
  var reComma = /\s*,\s*/

  var random = function () {
    var count=0
    return function() {
      count++
      return '_' + Math.floor(Math.random() * Math.pow(2, 32)).toString(36) + count + '_'
    }
  }()

  function _repeat (str, n){
    var s=''
    while(n-->0) s+=str
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
      if (!opt.localNames[name])
        opt.localNames[name] = opt.local
        ? opt.prefix + name
        : name
      return dot + opt.localNames[name].match(/\S+$/)
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

  function getCSS (store, opt, level) {
    var k, s1=[], s2=[], level=level|0

    var propStart = function () {return '\n' + _repeat(opt.indent, level) + '{\n'}
    var propEnd = function () {return '\n' + _repeat(opt.indent, level) + '}'}

    var propFormatter  = function (propArray) {
      return propArray.map(function (v) {return _repeat(opt.indent, level+1) + v + ';'}).join('\n')
    }

    var makeRule = function (sel, body) {
      return _repeat(opt.indent, level) + sel + propStart(opt, level) + body + propEnd(opt, level)
    }

    for(k in store){
      if(!own(store,k)) continue
      // if it's @media etc.
      if(type(store[k])==='Object') {
        s2.push( makeRule(k, getCSS(store[k], opt, level+1)) )
      } else {
        s1.push( store[k].map(function(p) {
          return makeRule(k, propFormatter(p))
        }).join('\n') )
      }
    }
    return s1.concat(s2).join('\n')
  }

  function cam2Dash (c) {
    return '-' + c.toLowerCase()
  }

  function objKV (obj, k, v, isArr) {
    if(!isArr) return obj[k]=v, obj
    obj[k] = obj[k] || []
    return obj[k].push(v), obj
  }

  var obj = {
    'ul.menu': {
      background_color: 'red',
      borderRadius: '2px',
      'li.item': [
        {
          '&:before, .link': {
            ".foo[title*='\\&'], :global(.xy)": {color: 'blue'},
            color: 'red'
          },
          'html:global(.ie8) &': {color: 'purple'},
          font_size: '12px'
        },
        {
          'span':{
            font_size: '22px'
          },
          color: 'blue'
        }
      ]
    }
  }

  function cssobj (obj, options, localNames) {
    options = options || {}

    // set default options
    util._deepIt(options, {
      local:true,
      indent:'\t'
    }, function(a,b,key){
      if(!(key in a)) a[key]=b[key]
    })
    options.prefix = options.prefix||random()
    options.store = {}
    options.localNames = localNames||{}

    convertSimpleData(obj, options)

    var result = {
      css: getCSS(options.store, options),
      map: options.localNames,
      options:options
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
