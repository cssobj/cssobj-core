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

  // using var as iteral to help optimize
  var newLine = '\n'
  var ARRAY = 'Array'

  // better type check
  var is = util._is
  var own = util._own
  var isIterable = util._isIter

  var reOneRule = /@(?:charset|import|namespace)/
  var reGroupRule = /^@(?:media|document|supports) /
  var reKeyFrame = /^@keyframes /
  var reClass = /:global\s*\(\s*((?:\.[-\w]+\s*)+)\s*\)|(\.)([!-\w]+)/g

  var random = (function () {
    var count = 0
    return function () {
      count++
      return '_' + Math.floor(Math.random() * Math.pow(2, 32)).toString(36) + count + '_'
    }
  })()

  var _util = {
    is: is,
    own: own,
    random: random,
    getSelector: getSelector,
    getParent: getParent,
    findObj: findObj,
    arrayKV: arrayKV,
    strSugar: strSugar,
    strRepeat: strRepeat,
    splitComma: splitComma
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
  function parseObj (d, opt, parent) {
    parent = parent || {}
    if (is(ARRAY, d)) {
      return d.map(function (v,i) {
        return parseObj(v, opt, {parent:parent, src:d, index:i, value:d[i]})
      })
    }
    if (is('Object', d)) {
      parent.prop={}
      parent.children={}
      for (var k in d) {
        if (!own(d, k)) continue
        if (!isIterable(d[k]) || is(ARRAY, d[k]) && !isIterable(d[k][0])) {
          ![].concat(d[k]).forEach(function(v){
            if(k=='$id') opt._ref[v] = d
            else arrayKV(parent.prop, getProp(k, opt), v)
          })
        } else {
          parent.children[k] = parseObj(d[k], opt, {parent:parent, src:d, key:k, value:d[k]})
        }
      }
      return parent
    }
    return parent
  }

  function getParent(node, test) {
    var p = node
    while(p && !test(p)) p=p.parent
    return p
  }

  function arrayKV(obj, k, v) {
    obj[k] = obj[k] || []
    obj[k].push(v)
  }

  function strSugar(str, sugar) {
    return sugar.reduce(
      function(pre, cur) {
        return pre.replace(
          new RegExp('^(_)|(.)(_)'.replace(/_/g, cur[0]), 'g'),
          function (m, z1, p, z2) {
            var z = z1 || z2
            return p == '\\' ? z : (p || '') + cur[1](z)
          }
        )
      },
      str
    )
  }

  function getProp (str, opt) {
    return !opt.propSugar
      ? str
      : strSugar(str, [
        ['_', function (z) { return '-' }],
        ['[A-Z]', function(z){ return '-' + z.toLowerCase() }]
      ])
  }

  function splitComma (str) {
    for (var c, i = 0, n = 0, prev = 0, d = []; c = str[i]; i++) {
      if (/[\(\[]/.test(c)) n++
      if (/[\)\]]/.test(c)) n--
      if (!n && c == ',') d.push(str.substring(prev, i)), prev = i + 1
    }
    return d.concat(str.substring(prev))
  }

  function strRepeat (str, n) {
    var s = ''
    while (n-- > 0) s += str
    return s
  }

  function getSelector (node, opt) {
    var NS = opt._localNames
    var replacer = function (match, global, dot, name) {
      if (global) {
        return global
      }
      if (name[0] === '!') {
        return dot + name.substr(1)
      }

      if (!opt.local) {
        NS[name] = name
      } else if (!NS[name]) {
        NS[name] = opt.prefix + name
      }

      return dot + NS[name]
    }

    var localize = function (name) {
      return name.replace(reClass, replacer)
    }

    var item
    var prev = ''
    var p = node
    var path = [p]
    while (p=p.parent) path.unshift(p)
    for (var i = 0, len = path.length; i < len; i++) {
      item = path[i]
      // only Object type has key, only Object can be parent
      if (!item.key || reGroupRule.test(item.key)) continue
      if(reKeyFrame.test(item.parent.key)) return item.key
      if(!reKeyFrame.test(item.key) && /^@/.test(item.key)) return item.key
      if (!item.selector) {
        item.selector = splitComma(item.key).map(function (v) {
          return !prev ? v : splitComma(prev).map(function (p) {
            return v.match(/^&|[^\\]&/)
              ? v.replace(/&/, p)
              : p + ' ' + v.replace(/\\&/g, '&')
          }).join(',')
        }).join(',')
      }
      prev = item.selector
    }
    return localize(prev)
  }

  function makeRule(node, opt, level) {
    var indent = strRepeat(opt.indent, level)
    var props = Object.keys(node.prop)
    var selector = getSelector(node, opt)
    var getVal = function(indent, key, sep, end){
      var propArr = [].concat(node.prop[key])
      return propArr.map(function(t){
        var val = is('Function', t)
            ? t(node, opt)
            : t
        val = applyPlugins(opt, 'value', val, key, node)
        return !val && val!==0 ? '' : indent + key + sep + val + end
      }).join('')
    }

    var str=''
    props.forEach(function(v){
      if(reOneRule.test(v)) str += getVal(indent, v, ' ', ';'+newLine)
    })

    return !selector
      ? str
      : str + [indent, selector , ' {' + newLine ,
         props.map(function (v) {
           return getVal(indent + opt.indent, v, ': ', ';' + newLine)
         }).join('') ,
         indent , '}' + newLine
        ].join('')
  }

  function makeCSS(node, opt, recursive) {
    var str = [], groupStr=[]

    var newGroup = function(node, cur){
      var p=node, path=[]
      while(p) {
        if( reGroupRule.test(p.key) ) path.unshift(p.key)
        p = p.parent
      }
      var rule = path[0].match(reGroupRule).pop()
      var selector = rule + path.reduce(function(pre, cur){
        return splitComma(cur.replace(reGroupRule,'')).map(function(v) {
          return !pre ? v : splitComma(pre.replace(reGroupRule,'')).map(function(p){
            return p + ' and ' + v
          }).join(',')
        }).join(','+newLine)
      }, '')
      cur.push(selector + ' {'+newLine)
      groupStr.push(cur)
    }

    var walk = function (node, groupLevel) {
      if(!node) return ''
      if(is(ARRAY, node)) return node.map(function(v){walk(v,groupLevel)})

      var cur = groupStr[groupLevel-1] || str
      var isGroupRule = reGroupRule.test(node.key)
      var isKeyFrameNode = reKeyFrame.test(node.key)
      var isInKeyFrame = !!getParent(node.parent, function(v){
        return reKeyFrame.test(v.key)
      })
      if(isGroupRule) {
        groupLevel++
        cur = []
        newGroup(node, cur)
      }
      var indentLevel = !!groupLevel + isInKeyFrame
      var indent = strRepeat(opt.indent, indentLevel)
      if(isKeyFrameNode) {
        cur.push(indent + node.key+' {'+newLine)
      }

      if (Object.keys(node.prop).length)
        cur.push(
          makeRule(node, opt, indentLevel)
        )

      if(recursive)
        for(var k in node.children)
          walk(node.children[k], groupLevel)

      if(isKeyFrameNode){
        cur.push(indent + '}'+newLine)
      }
      if(isGroupRule) {
        cur.push('}'+newLine)
        groupLevel--
      }

      if(!groupLevel)
        while(groupStr.length)
          str.push(groupStr.shift().join(''))

    }
    walk(node,0)

    return str.join('')
  }

  function applyPlugins(opt, type) {
    var args = [].slice.call(arguments, 2)
    var plugin = opt.plugins[type]
    return !plugin ? args[0] : [].concat(plugin).reduce(
      function (pre, f) { return f.apply(null, [pre].concat(args)) },
      args.shift()
    )
  }

  function findObj(obj, root) {
    var found
    var walk = function(node) {
      if (is(ARRAY, node)) return node.some(walk)
      if (node.value==obj) return found = node
      for(var k in node.children){
        if (found) return
        walk(node.children[k])
      }
    }
    walk(root)
    return found
  }

  function cssobj (obj, options, localNames) {
    options = options || {}

    // set default options
    util._default(options, {
      local: true,
      propSugar: true,
      indent: '\t',
      plugins: {}
    })

    options._events = {}
    options._util = _util
    options.prefix = options.prefix || random()

    var ref = options._ref = {}
    var nameMap = options._localNames = localNames || {}

    var root = parseObj(obj, options)

    // var d=testObj[1]['.p']
    // console.log(1111, d, findObj(d, root))

    var updater = function(updateObj, recursive) {
      if (updateObj === true) recursive = true, updateObj = 0

      var mapRef = function(k) { return isIterable(k) ? k : ref[k] }

      var args = !updateObj
          ? Object.keys(ref).map(mapRef)
          : [].concat(updateObj).map(mapRef)

      var css = args.map(function(k) {
        var target = findObj(k, root)
        return makeCSS(parseObj(k, options, target), options, recursive)
      }).join('')

      var cb = options._events['update']
      cb && css && cb.forEach(function (v) {v(css)})
      return css
    }

    var result = {
      root: root,
      css: makeCSS(root, options, true),
      map: nameMap,
      ref: ref,
      update: updater,
      options: options
    }

    result.on = function(eventName, cb) {
      arrayKV(options._events, eventName, cb)
    }

    result.off = function(eventName, cb) {
      var i, arr = options._events[eventName]
      if(!arr) return
      if(!cb) return arr = []
      if( (i = arr.indexOf(cb)) > -1) arr.splice(i, 1)
    }

    // root[0].children._p.prop._color= function(){return 'bluesdfsdf'}
    // console.log(root, makeCSS(root[0].children['_p'], options))
    applyPlugins(options, 'post', result)
    return result
  }

  // no optins
  // console.log(cssobj({p:{color:123}}).css)

  // // save options
  // window.a = cssobj(obj, window.a? window.a.options : {})
  // console.log(a.css)

  // module exports
  return cssobj
}))
