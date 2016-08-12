/* lib cssobj */
'use strict'

/** IE ES3 need below polyfills:
 * Array.prototype.forEach
 * Array.prototype.indexOf
 * Array.prototype.map
 * Array.prototype.some
 * Array.prototype.reduce
 * Object.keys
 **/

import {
  defaults,
  isValidCSSValue,
  splitComma,
  getParents,
  strSugar,
  arrayKV,
  extendObj
} from '../../cssobj-helper/lib/cssobj-helper.js'

// using var as iteral to help optimize
var KEY_ID = '$id'
var KEY_ORDER = '$order'

var TYPE_GROUP = 'group'

// helper function
var keys = Object.keys

// type check helpers
var type = {}.toString
var ARRAY = type.call([])
var OBJECT = type.call({})

// only array, object now treated as iterable
function isIterable (v) {
  return type.call(v) == OBJECT || type.call(v) == ARRAY
}

// regexp constants
// @page rule: CSSOM:
//   IE returned: not implemented error
//   FF, Chrome actually is not groupRule(not cssRules), same as @font-face rule
//   https://developer.mozilla.org/en-US/docs/Web/API/CSSGroupingRule
//   CSSPageRule is listed as derived from CSSGroupingRule, but not implemented yet.
//   Here added @page as GroupRule, but plugin should take care of this.
var reGroupRule = /^@(media|document|supports|page|keyframes)/i
var reAtRule = /^\s*@/i

/**
 * convert simple Object into node data
 *
 input data format:
 {"a":{"b":{"c":{"":[{color:1}]}}}, "abc":123, '@import':[2,3,4], '@media (min-width:320px)':{ d:{ok:1} }}
 *        1. every key is folder node
 *        2. "":[{rule1}, {rule2}] will split into several rules
 *        3. & will replaced by parent, \\& will escape
 *        4. all prop should be in dom.style camelCase
 *
 * @param {object|array} d - simple object data, or array
 * @param {object} result - the reulst object to store options and root node
 * @param {object} [previousNode] - also act as parent for next node
 * @param {boolean} init whether it's the root call
 * @returns {object} node data object
 */
function parseObj (d, result, node, init) {
  if (init) {
    result.nodes = []
    result.ref = {}
    if (node) result.diff = {}
  }

  node = node || {}

  node.obj = d

  if (type.call(d) == ARRAY) {
    return d.map(function (v, i) {
      return parseObj(v, result, node[i] || {parent: node, src: d, index: i})
    })
  }
  if (type.call(d) == OBJECT) {
    var children = node.children = node.children || {}
    var prevVal = node.prevVal = node.lastVal
    node.lastVal = {}
    node.rawVal = {}
    node.prop = {}
    node.diff = {}
    if (d[KEY_ID]) result.ref[d[KEY_ID]] = node
    var order = d[KEY_ORDER] | 0
    var funcArr = []

    var processObj = function (obj, k, nodeObj) {
      var haveOldChild = k in children
      var newNode = extendObj(children, k, nodeObj)
      // don't overwrite selPart for previous node
      newNode.selPart = newNode.selPart || splitComma(k)
      var n = children[k] = parseObj(obj, result, newNode)
      // it's new added node
      if (prevVal && !haveOldChild) arrayKV(result.diff, 'added', n)
    }

    // only there's no selText, getSel
    if(!('selText' in node)) getSel(node, result)

    for (var k in d) {
      // here $key start with $ is special
      // k.charAt(0) == '$' ... but the core will calc it into node.
      // Plugins should take $ with care and mark as a special case. e.g. ignore it
      if (!d.hasOwnProperty(k)) continue
      if (!isIterable(d[k]) || type.call(d[k]) == ARRAY && !isIterable(d[k][0])) {

        // it's inline at-rule: @import etc.
        if (k.charAt(0)=='@') {
          processObj(
            // map @import: [a,b,c] into {a:1, b:1, c:1}
            [].concat(d[k]).reduce(function(prev, cur) {
              prev[cur] = ';'
              return prev
            }, {}), k, {parent: node, src: d, key: k, inline:true})
          continue
        }

        var r = function (_k) {
          parseProp(node, d, _k, result)
        }
        order
          ? funcArr.push([r, k])
          : r(k)
      } else {
        processObj(d[k], k, {parent: node, src: d, key: k})
      }
    }

    // when it's second time visit node
    if (prevVal) {
      // children removed
      for (k in children) {
        if (!(k in d)) {
          arrayKV(result.diff, 'removed', children[k])
          delete children[k]
        }
      }

      // prop changed
      var diffProp = function () {
        var newKeys = keys(node.lastVal)
        var removed = keys(prevVal).filter(function (x) { return newKeys.indexOf(x) < 0 })
        if (removed.length) node.diff.removed = removed
        if (keys(node.diff).length) arrayKV(result.diff, 'changed', node)
      }
      order
        ? funcArr.push([diffProp, null])
        : diffProp()
    }

    if (order) arrayKV(result, '_order', {order: order, func: funcArr})
    result.nodes.push(node)
    return node
  }

  return node
}

function getSel(node, result) {

  var opt = result.options

  // array index don't have key,
  // fetch parent key as ruleNode
  var ruleNode = getParents(node, function (v) {
    return v.key
  }).pop()

  node.parentRule = getParents(node.parent, function (n) {
    return n.type == TYPE_GROUP
  }).pop() || null

  if (ruleNode) {
    var isMedia, sel = ruleNode.key
    var groupRule = sel.match(reGroupRule)
    if (groupRule) {
      node.type = TYPE_GROUP
      node.at = groupRule.pop()
      isMedia = node.at == 'media'

      // only media allow nested and join, and have node.selPart
      if (isMedia) node.selPart = splitComma(sel.replace(reGroupRule, ''))

      // combinePath is array, '' + array instead of array.join(',')
      node.groupText = isMedia
        ? '@' + node.at + combinePath(getParents(ruleNode, function (v) {
          return v.type == TYPE_GROUP
        }, 'selPart', 'selChild', 'selParent'), '', ' and')
      : sel

      node.selText = getParents(node, function (v) {
        return v.selText && !v.at
      }, 'selText').pop() || ''
    } else if (reAtRule.test(sel)) {
      node.type = 'at'
      node.selText = sel
    } else {
      node.selText = '' + combinePath(getParents(ruleNode, function (v) {
        return v.selPart && !v.at
      }, 'selPart', 'selChild', 'selParent'), '', ' ', true), opt
    }

    node.selText = applyPlugins(opt, 'selector', node.selText, node, result)
    if (node.selText) node.selTextPart = splitComma(node.selText)

    if (node !== ruleNode) node.ruleNode = ruleNode
  }

}

function extendSel(result, sourceNode, target) {
  var isRegExp = type.call(target)=='[object RegExp]'
  result.nodes.forEach(function(node) {
    var selTextPart = node.selTextPart
    if(sourceNode.parentRule !== node.parentRule) return
    sourceNode.selTextPart.forEach(function(source) {
      ![].push.apply(selTextPart, selTextPart.filter(function(v) {
        return isRegExp
          ? v.match(target)
          : v==target
      }).map(function(v) {
        return isRegExp ? v.replace(target, source) : source
      }))
    })
  })
}

function parseProp (node, d, key, result) {
  var prevVal = node.prevVal
  var lastVal = node.lastVal

  var prev = prevVal && prevVal[key]

  ![].concat(d[key]).forEach(function (v) {
    // pass lastVal if it's function
    var val = typeof v == 'function'
        ? v.call(node.lastVal, prev, node, result)
        : v

    if(val && key=='$extend') extendSel(result, node, val)

    node.rawVal[key] = val
    val = applyPlugins(result.options, 'value', val, key, node, result)
    // only valid val can be lastVal
    if (isValidCSSValue(val)) {
      // push every val to prop
      arrayKV(
        node.prop,
        key,
        val,
        true
      )
      prev = lastVal[key] = val
    }
  })
  if (prevVal) {
    if (!(key in prevVal)) {
      arrayKV(node.diff, 'added', key)
    } else if (prevVal[key] != lastVal[key]) {
      arrayKV(node.diff, 'changed', key)
    }
  }
}

function combinePath (array, prev, sep, rep) {
  return !array.length ? prev : array[0].reduce(function (result, value) {
    var str = prev ? prev + sep : prev
    if (rep) {
      var isReplace = false
      var sugar = strSugar(value, '&', function (z) {
        isReplace = true
        return prev
      })
      str = isReplace ? sugar : str + sugar
    } else {
      str += value
    }
    return result.concat(combinePath(array.slice(1), str, sep, rep))
  }, [])
}

function applyPlugins (opt, type) {
  var args = [].slice.call(arguments, 2)
  var plugin = opt.plugins && opt.plugins[type]
  return !plugin ? args[0] : [].concat(plugin).reduce(
    function (pre, f) { return f.apply(null, [pre].concat(args)) },
    args.shift()
  )
}

function applyOrder (opt) {
  if (!opt._order) return
  opt._order
    .sort(function (a, b) {
      return a.order - b.order
    })
    .forEach(function (v) {
      v.func.forEach(function (f) {
        f[0](f[1])
      })
    })
  delete opt._order
}

function cssobj (options) {

  options = defaults(options, {
    plugins: {}
  })

  return function (obj, initData) {
    var updater = function (data) {
      if (arguments.length) result.data = data || {}

      result.root = parseObj(result.obj || {}, result, result.root, true)
      applyOrder(result)
      result = applyPlugins(options, 'post', result)
      typeof options.onUpdate=='function' && options.onUpdate(result)
      return result
    }

    var result = {
      obj: obj,
      update: updater,
      options: options
    }

    updater(initData)

    return result
  }
}

// no optins
// console.log(cssobj({p:{color:123}}).css)

// // save options
// window.a = cssobj(obj, window.a? window.a.options : {})
// console.log(a.css)

// module exports
export default cssobj
