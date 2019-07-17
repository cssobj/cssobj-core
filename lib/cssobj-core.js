'use strict'

import {
  own,
  defaults,
  isNumeric,
  isValidCSSValue,
  splitSelector,
  getParents,
  arrayKV,
  extendObj
} from '../../cssobj-helper/lib/cssobj-helper.js'

// using var as iteral to help optimize
var KEY_ID = '$id'
var KEY_ORDER = '$order'
var KEY_TEST = '$test'

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

// check if it's function
function isFunction (v) {
  return typeof v == 'function'
}

// regexp constants
// @page rule: CSSOM:
//   IE returned: not implemented error
//   FF, Chrome actually is not groupRule(not cssRules), same as @font-face rule
//   https://developer.mozilla.org/en-US/docs/Web/API/CSSGroupingRule
//   CSSPageRule is listed as derived from CSSGroupingRule, but not implemented yet.
//   Here added @page as GroupRule, but plugin should take care of this.
var reGroupRule = /^@(media|document|supports|page|[\w-]*keyframes)/i
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
 * @param {object} result - the reulst object to store config and root node
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
    var nodes = []
    /* for array type, each children have a parent that not on the virtual tree,
       see test case of @media-array for example, the array node obj=Array, but have node.selPart(no selText)
       So have to set the right node.at/node.type from the node.key, to get right selText for children */
    node.at = reAtRule.exec(node.key)
    for(var i = 0; i < d.length; i++) {
      var prev = node[i]
      var n = parseObj(d[i], result, node[i] || {parent: node, src: d, parentNode: nodes, index: i})
      if(result.diff && prev!=n) arrayKV(result.diff, n ? 'added' : 'removed', n||prev)
      nodes.push(n)
    }
    return nodes
  } else {
    if (d[KEY_ID]) result.ref[d[KEY_ID]] = node
    // it's no need to check (type.call(d) == OBJECT)
    // isIterable will filter only ARRAY/OBJECT
    // other types will goto parseProp function
    var prevVal = node.prevVal = node.lastVal
    // at first stage check $test
    if (KEY_TEST in d) {
      var test = isFunction(d[KEY_TEST]) ? d[KEY_TEST](!node.disabled, node, result) : d[KEY_TEST]
      // if test false, remove node completely
      // if it's return function, going to stage 2 where all prop rendered
      if(!test) {
        return
      }
      node.test = test
    }
    var children = node.children = node.children || {}
    node.lastRaw = node.rawVal || {}
    node.lastVal = {}
    node.rawVal = {}
    node.prop = {}
    node.diff = {}
    var order = d[KEY_ORDER] | 0
    var funcArr = []

    var processObj = function (obj, k, nodeObj) {
      var haveOldChild = k in children
      var newNode = extendObj(children, k, nodeObj)
      // don't overwrite selPart for previous node
      newNode.selPart = newNode.selPart || splitSelector(k, ',')
      var n = parseObj(obj, result, newNode)
      if(n) children[k] = n
      // it's new added node
      if (prevVal) !haveOldChild
        ? n && arrayKV(result.diff, 'added', n)
        : !n && arrayKV(result.diff, 'removed', children[k])
      // for first time check, remove from parent (no diff)
      if(!n) delete nodeObj.parent.children[k]
    }

    // only there's no selText, getSel
    if(!('selText' in node)) getSel(node, result)

    for (var k in d) {
      // here $key start with $ is special
      // k[0] == '$' ... but the core will calc it into node.
      // Plugins should take $ with care and mark as a special case. e.g. ignore it
      if (!own(d, k)) continue
      if (!isIterable(d[k]) || type.call(d[k]) == ARRAY && !isIterable(d[k][0])) {

        // it's inline at-rule: @import etc.
        if (k[0]=='@') {
          processObj(
            // map @import: [a,b,c] into {a:1, b:1, c:1}
            [].concat(d[k]).reduce(function(prev, cur) {
              prev[cur] = ';'
              return prev
            }, {}), k, {parent: node, src: d, key: k, inline:true})
          continue
        }

        var r = function (_k) {
          // skip $test key
          if(_k != KEY_TEST) parseProp(node, d, _k, result)
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

}

function getSel(node, result) {

  var opt = result.config

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
      if (isMedia) node.selPart = splitSelector(sel.replace(reGroupRule, ''), ',')

      // combinePath is array, 'str' + array instead of array.join(',')
      node.groupText = isMedia
        ? '@' + node.at + combinePath(getParents(node, function (v) {
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
    if (node.selText) node.selTextPart = splitSelector(node.selText, ',')

    if (node !== ruleNode) node.ruleNode = ruleNode
  }

}

/**
 * Parse property of object d's key, with propKey as a candidate key name
 * @param {} node: v-node of cssobj
 * @param {} d: source object
 * @param {} key: any numeric will be ignored, then converted to string
 * @param {} result: cssobj result object
 * @param {} propKey: candidate prop key name

 Accept only key as string, numeric will be ignored

 color: function(){return ['red', 'blue']} will expand
 color: function(){return {fontSize: '12px', float:'right'}} will be replaced

 */
function parseProp (node, d, key, result, propKey) {
  var prevVal = node.prevVal
  var lastVal = node.lastVal

  // the prop name get from object key or candidate key
  var propName = isNumeric(key) ? propKey : key

  // NEXT: propName can be changed by user
  // now it's not used, since propName ensure exists
  // corner case: propKey==='' ?? below line will do wrong!!
  // if(!propName) return

  var raw = node.lastRaw[propName],
      prev = prevVal && prevVal[propName],
      argObj = {node:node, result:result}

  if (raw) argObj.raw = raw[0]

  ![].concat(d[key]).forEach(function (v) {
    // prepare value function args
    argObj.cooked = prev

    // pass lastVal if it's function
    argObj.raw = raw = isFunction(v)
        ? v(argObj)
        : v

    var val = applyPlugins(result.config, 'value', raw, propName, node, result, propKey)

    // check and merge only format as Object || Array of Object, other format not accepted!
    if (isIterable(val)) {
      for (var k in val) {
        if (own(val, k)) parseProp(node, val, k, result, propName)
      }
    } else {
      arrayKV (
        node.rawVal,
        propName,
        raw,
        true
      )
      if (propName.charAt(0)=='$' || isValidCSSValue(val)) {
        // only valid val can enter node.prop and lastVal
        // push every val to prop
        arrayKV(
          node.prop,
          propName,
          val,
          true
        )
        prev = lastVal[propName] = val
      }
    }
  })
  if (prevVal) {
    if (!(propName in prevVal)) {
      arrayKV(node.diff, 'added', propName)
    } else if (prevVal[propName] != lastVal[propName]) {
      arrayKV(node.diff, 'changed', propName)
    }
  }
}

function combinePath (array, parentSel, seperator, replaceAmpersand) {
  return !array.length ? parentSel : array[0].reduce(function (result, value) {
    var part, str = parentSel ? parentSel + seperator : parentSel
    if (replaceAmpersand) {
      part = splitSelector( value, '&' )
      str = part.length > 1 ? part.join(parentSel) : str + value
    } else {
      str += value
    }
    return result.concat(combinePath(array.slice(1), str, seperator, replaceAmpersand))
  }, [])
}

function applyPlugins (opt, type) {
  var args = [].slice.call(arguments, 2)
  var plugin = opt.plugins
  // plugin is always Array, so here we don't check it
  return [].concat(plugin).reduce(
    function (pre, plugin) { return plugin[type] ? plugin[type].apply(null, [pre].concat(args)) : pre },
    args.shift()
  )
}

function applyOrder (opt) {
  if (opt._order==null) return
  opt._order
    .sort(function (a, b) {
      return a.order - b.order
    })
    .forEach(function (v) {
      v.func.forEach(function (f) {
        f[0](f[1])
      })
    })
  opt._order = []
}

function cssobj (config) {

  config = defaults(config, {
    plugins: [],
    intros: []
  })

  return function (initObj, initState) {
    var updater = function (obj, state) {
      if (arguments.length>1) result.state = state || {}
      if (obj) result.obj = isFunction(obj) ? obj() : obj
      result.root = parseObj(extendObj({}, '', result.intro, result.obj), result, result.root, true)
      applyOrder(result)
      result = applyPlugins(config, 'post', result)
      isFunction(config.onUpdate) && config.onUpdate(result)
      return result
    }

    var result = {
      intro: {},
      update: updater,
      config: config
    }

    ![].concat(config.intros).forEach(
      function(v) {
        extendObj(result, 'intro', isFunction(v) ? v(result) : v)
      }
    )

    updater(initObj, initState || config.state)

    return result
  }
}

export default cssobj
