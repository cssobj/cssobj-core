define('cssobj_core', function () { 'use strict';

  // helper functions for cssobj

  // check n is numeric, or string of numeric
  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n)
  }

  // set default option (not deeply)
  function defaults(options, defaultOption) {
    options = options || {}
    for (var i in defaultOption) {
      if (!(i in options)) options[i] = defaultOption[i]
    }
    return options
  }

  // extend obj from source, if it's no key in obj, create one
  function extendObj (obj, key, source) {
    obj[key] = obj[key] || {}
    for (var k in source) obj[key][k] = source[k]
    return obj[key]
  }

  // ensure obj[k] as array, then push v into it
  function arrayKV (obj, k, v, reverse, unique) {
    obj[k] = k in obj ? [].concat(obj[k]) : []
    if(unique && obj[k].indexOf(v)>-1) return
    reverse ? obj[k].unshift(v) : obj[k].push(v)
  }

  // replace find in str, with rep function result
  function strSugar (str, find, rep) {
    return str.replace(
      new RegExp('\\\\?(' + find + ')', 'g'),
      function (m, z) {
        return m == z ? rep(z) : z
      }
    )
  }

  // get parents array from node (when it's passed the test)
  function getParents (node, test, key, childrenKey, parentKey) {
    var p = node, path = []
    while(p) {
      if (test(p)) {
        if(childrenKey) path.forEach(function(v) {
          arrayKV(p, childrenKey, v, false, true)
        })
        if(path[0] && parentKey){
          path[0][parentKey] = p
        }
        path.unshift(p)
      }
      p = p.parent
    }
    return path.map(function(p){return key?p[key]:p })
  }

  // split selector etc. aware of css attributes
  function splitComma (str) {
    for (var c, i = 0, n = 0, prev = 0, d = []; c = str.charAt(i); i++) {
      if (c == '(' || c == '[') n++
      if (c == ')' || c == ']') n--
      if (!n && c == ',') d.push(str.substring(prev, i)), prev = i + 1
    }
    return d.concat(str.substring(prev))
  }

  // checking for valid css value
  function isValidCSSValue (val) {
    // falsy: '', NaN, Infinity, [], {}
    return typeof val=='string' && val || typeof val=='number' && isFinite(val)
  }

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
      var nodes = []
      for(var i = 0; i < d.length; i++) {
        var prev = node[i]
        var n = parseObj(d[i], result, node[i] || {parent: node, src: d, parentNode: nodes, index: i})
        if(result.diff && prev!=n) arrayKV(result.diff, n ? 'added' : 'removed', n||prev)
        nodes.push(n)
      }
      return nodes
    }
    if (type.call(d) == OBJECT) {
      var prevVal = node.prevVal = node.lastVal
      // at first stage check $test
      if (KEY_TEST in d) {
        var test = typeof d[KEY_TEST] == 'function' ? d[KEY_TEST](!node.disabled, node, result) : d[KEY_TEST]
        // if test false, remove node completely
        // if it's return function, going to stage 2 where all prop rendered
        if(!test) {
          return
        }
        node.test = test
      }
      var children = node.children = node.children || {}
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
    if(!propName) return

    var prev = prevVal && prevVal[propName]

    ![].concat(d[key]).forEach(function (v) {
      // pass lastVal if it's function
      var rawVal = typeof v == 'function'
        ? v(prev, node, result)
        : v

      var val = applyPlugins(result.options, 'value', rawVal, propName, node, result, propKey)

      // check and merge only format as Object || Array of Object, other format not accepted!
      if (isIterable(val)) {
        for (var k in val) {
          if (val.hasOwnProperty(k)) parseProp(node, val, k, result, propName)
        }
      } else {
        arrayKV(
          node.rawVal,
          propName,
          rawVal,
          true
        )
        if (isValidCSSValue(val)) {
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
    var plugin = opt.plugins
    return !plugin ? args[0] : [].concat(plugin).reduce(
      function (pre, plugin) { return plugin[type] ? plugin[type].apply(null, [pre].concat(args)) : pre },
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
      plugins: []
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

  return cssobj;

});