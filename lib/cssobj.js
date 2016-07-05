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
  function parseObj (d, opt, parent) {
    parent = parent || {}
    if (is('Array', d)) {
      return d.map(function (v,i) {
        return parseObj(v, opt, {parent:parent, src:d, index:i})
      })
    }
    if (is('Object', d)) {
      parent.prop={}
      parent.children={}
      for (var k in d) {
        if (!own(d, k)) continue
        if (isPrimitive(d[k])) {
          if(k=='$id') opt.vars[d[k]] = parent
          else parent.prop[getProp(k, opt)] = d[k]
        } else {
          parent.children[k] = parseObj(d[k], opt, {parent:parent, src:d, key:k, value:d[k]})
        }
      }
      return parent
    }
    return parent
  }

  function getProp (str, opt) {
    return !opt.propSugar ? str : str
      .replace(/^_|(.)_/g, function (m, p) {
        return p == '\\' ? '_' : (p || '') + '-'
      })
      .replace(/^([A-Z])|(.)([A-Z])/g, function (m, z1, p, z2) {
        var z = z1 || z2
        return p == '\\' ? z : (p || '') + '-' + z.toLowerCase()
      })
  }

  var reOneRule = /^@(?:charset|import|namespace)/
  var reGroupRule = /^@(?:media|document|supports)/
  var reKeyFrame = /^@keyframes /
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

  function getSelector (node, opt) {
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
    var prev = ''
    var p = node
    var path = [p]
    while (p=p.parent) path.unshift(p)
    for (var i = 0, len = path.length; i < len; i++) {
      item = path[i]
      // only Object type has key, only Object can be parent
      if (typeof item.key!='string') continue
      if(reGroupRule.test(item.key)) continue
      if(reKeyFrame.test(item.parent.key)) return item.key
      if(!reKeyFrame.test(item.key) && /^@/.test(item.key)) return item.key
      if (!item.selector) {
        item.selector = _splitComma(item.key).map(function (v) {
            return _splitComma(prev).map(function (p) {
              return v.match(/^&|[^\\]&/)
                ? v.replace(/&/, p)
                : (p ? p + ' ' : '') + v.replace(/\\&/g, '&')
            }).join(',')
          }).join(',')
      }
      prev = item.selector
    }
    return localize(prev)
  }

  function makeRule(node, opt, level) {
    var indent = _repeat(opt.indent, level)
    var props = Object.keys(node.prop)
    var getVal = function(p){
      var t = node.prop[p]
      return is('Function', t) ? t(node, getSelector(node, opt), opt) : t
    }
    if(reOneRule.test(props)) return indent + props[0] + ' ' + getVal(props[0]) + ';\n'
    return [indent, getSelector(node, opt), '\n' ,
            indent , '{\n' ,
            props.map(function (v) {
              return indent + opt.indent + v + ': ' + getVal(v) + ';'
            }).join('\n') , '\n' ,
            indent , '}' , '\n'
           ].join('')
  }

  function makeCSS(node, opt) {
    var str = [], groupStr=[], groupArr = []
    var curStr = function(){return groupStr[groupArr.length-1] || str}
    var getLevel = function(node){return !!groupArr.length + (node.parent && reKeyFrame.test(node.parent.key))|0}

    var walk = function (node) {
      if(is('Array', node)) return node.map(walk)

      var isGroupRule = reGroupRule.test(node.key)
      var isKeyFrame = reKeyFrame.test(node.key)
      if(isGroupRule) {
        groupArr.push(
          // add split media query support
          groupArr.length
            ? _splitComma(groupArr[groupArr.length-1]).map(function(p){
              return _splitComma(node.key.replace(reGroupRule, '')).map(function(v) {
                return p + ' '+ v
              }).join(',')
            }).join(',')
            : node.key
        )
        groupStr.push([groupArr[groupArr.length-1] + '{\n'])
      }
      if(isKeyFrame) {
        curStr().push(_repeat(opt.indent, getLevel(node)) + node.key+'{\n')
      }

      if (Object.keys(node.prop).length)
        curStr().push(
          makeRule(node, opt, getLevel(node))
        )
      for(var k in node.children)
        walk(node.children[k])

      if(isKeyFrame){
        curStr().push(_repeat(opt.indent, getLevel(node)) + '}\n')
      }
      if(isGroupRule) {
        curStr().push('}\n')
        groupArr.pop()
      }

      if(!groupArr.length)
        while(groupStr.length)
          str.push(groupStr.shift().join(''))
    }
    walk(node)
    return str.join('')
  }

  function cssobj (obj, options, localNames) {
    options = options || {}

    // set default options
    util._default(options, {
      local: true,
      propSugar: true,
      indent: '\t',
    })
    options.vars = {}
    options.prefix = options.prefix || random()
    options.localNames = localNames || {}

    var root = parseObj(obj, options)

    var getCSS = function(name) {
      return makeCSS(options.vars[name], options)
    }

    var updater = function(){
      var str = ''
      for(var k in options.vars) {
        str += getCSS(k)
      }
      return str
    }

    var result = {
      css: makeCSS(root, options),
      getCSS: getCSS,
      map: options.localNames,
      vars: options.vars,
      update: updater,
      options: options
    }

    // root[0].children._p.prop._color= function(){return 'bluesdfsdf'}
    // console.log(root, makeCSS(root[0].children['_p'], options))

    if (options.post) options.post.forEach(function (f) { f(result) })
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
