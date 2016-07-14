define('cssobj', function () { 'use strict';

  /** IE ES3 need below polyfills:
   * Array.prototype.forEach
   * Array.prototype.indexOf
   * Array.prototype.map
   * Array.prototype.some
   * Array.prototype.reduce
   * Object.keys
   **/


  // using var as iteral to help optimize
  var KEY_ID = '$id'
  var KEY_ORDER = '$order'

  var TYPE_KEYFRAMES = 'keyframes'
  var TYPE_GROUP = 'group'

  // type check
  var type = {}.toString
  var ARRAY = type.call([])
  var OBJECT = type.call({})

  // helper function
  var trim = function (str) { return str.replace(/(^\s+|\s+$)/g, '') }
  var keys = Object.keys

  function isIterable (v) {
    return type.call(v)==OBJECT || type.call(v)==ARRAY
  }

  var reGroupRule = /^@(?:media|document|supports) /
    var reKeyFrame = /^@keyframes /
    var reAtRule = /^\s*@/
    var reClass = /:global\s*\(\s*((?:\.[A-Za-z0-9_-]+\s*)+)\s*\)|(\.)([!A-Za-z0-9_-]+)/g

  // default local prefix implement
  var random = (function () {
    var count = 0
    return function () {
      count++
      return '_' + Math.floor(Math.random() * Math.pow(2, 32)).toString(36) + count + '_'
    }
  })()

  // var _util = {
  //   is: is,
  //   own: own,
  //   random: random,
  //   getSelector: getSelector,
  //   getParent: getParent,
  //   findObj: findObj,
  //   arrayKV: arrayKV,
  //   strSugar: strSugar,
  //   strRepeat: strRepeat,
  //   splitComma: splitComma
  // }

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
  function parseObj (d, opt, result, node, init) {
    node = node || {}
    if(init) {
      result.obj = d
      result.nodes = []
      result.ref = {}
      if(node) result.diff = {}
    }
    if (type.call(d)==ARRAY) {
      return d.map(function (v, i) {
        return parseObj(v, opt, result, node[i] || {parent: node, src: d, index: i, obj: d[i]})
      })
    }
    if (type.call(d)==OBJECT) {
      var children = node.children = node.children||{}
      var oldVal = node.oldVal = node.lastVal
      node.lastVal = {}
      node.prop = {}
      node.diff = {}
      if(d[KEY_ID]) result.ref[d[KEY_ID]] = node
      var order = d[KEY_ORDER]|0
      var funcArr = []

      // array index don't have key,
      // fetch parent key as ruleNode
      var ruleNode = getParents(node, function(v) {
        return v.key
      }).pop()

      var parentRule = node.parentRule = getParents(node.parent, function(n) {
        return n.type==TYPE_KEYFRAMES||n.type==TYPE_GROUP
      }).pop() || null

      if(ruleNode) {
        var sel = ruleNode.key
        var groupRule = sel.match(reGroupRule)
        var keyFramesRule = sel.match(reKeyFrame)
        if(groupRule){
          node.type = TYPE_GROUP
          node.at = groupRule.pop()
          node.sel = splitComma(sel.replace(reGroupRule, '')).map(function(v) {
            return strSugar(v, [
              ['[><]', function (z) {
                return z == '>'
                  ? 'min-width:'
                  : 'max-width:'
              }]
            ])
          })

          var pPath = getParents(ruleNode, function(v) {
            return v.type==TYPE_GROUP
          }, 'sel')

          node.groupText = localizeName(node.at + combinePath(pPath, '', ' and '), opt)

          node.selText = getParents(node, function(v) {
            return v.selText && !v.at
          }, 'selText').pop()

        } else if (keyFramesRule) {
          node.type = TYPE_KEYFRAMES
          node.at = keyFramesRule.pop()
          node.groupText = sel
        } else if (reAtRule.test(sel)) {
          node.type = 'at'
          node.selText = sel
        } else {
          node.selText = parentRule && parentRule.type==TYPE_KEYFRAMES
            ? sel
            : localizeName(''+combinePath(getParents(ruleNode, function(v) {
              return v.sel && !v.at
            }, 'sel'), '', ' ', true), opt)
        }

        if(node!==ruleNode) node.ruleNode = ruleNode

      }

      for (var k in d) {
        if ( !d.hasOwnProperty(k) ) continue
        if (!isIterable(d[k]) || type.call(d[k])==ARRAY && !isIterable(d[k][0])) {
          if(k.charAt(0)=='$') continue
          var r = function(_k) {
            parseProp(node, d, _k, result)
          }
          order
            ? funcArr.push([r, k])
            : r(k)
        } else {
          var haveOldChild = k in children
          var n = children[k] = parseObj(d[k], opt, result, extendObj(children, k, {parent: node, src: d, key: k, sel:splitComma(k), obj: d[k]}))
          // it's new added node
          if(oldVal && !haveOldChild) arrayKV(result.diff, 'added', n)
        }
      }

      // when it's second time visit node
      if(oldVal) {

        // children removed
        for(k in children) {
          if(!(k in d)) {
            arrayKV(result.diff, 'removed', children[k])
            delete children[k]
          }
        }

        // prop changed
        var diffProp = function() {
          var newKeys = keys(node.lastVal)
          var removed = keys(oldVal).filter(function(x) { return newKeys.indexOf(x) < 0 }).map(function(k) {
            return dashify(k)
          })
          if(removed.length) node.diff.removed = removed
          if(keys(node.diff).length) arrayKV(result.diff, 'changed', node)
        }
        order
          ? funcArr.push([diffProp, null])
          : diffProp()
      }

      if(order) arrayKV(result, '_order', {order:order, func:funcArr})
      result.nodes.push(node)
      return node
    }
    return node
  }

  function extendObj(obj, key, source) {
    obj[key] = obj[key]||{}
    for(var k in source) obj[key][k] = source[k]
    return obj[key]
  }

  function parseProp(node, d, key, result) {
    var oldVal = node.oldVal
    var lastVal = node.lastVal

    var prev = oldVal && oldVal[key]

    ![].concat(d[key]).forEach(function (v) {
      // pass lastVal if it's function
      var val = typeof v=='function'
          ? v(prev, node, result)
        : v

      // only valid val can be lastVal
      if (isValidCSSValue(val)) {
        // push every val to prop
        arrayKV(
          node.prop,
          dashify(key),
          applyPlugins(result.options, 'value', val, key, node, result),
          true
        )
        prev = lastVal[key] = val
      }
    })
    if(oldVal) {
      if(!(key in oldVal)) {
        arrayKV(node.diff, 'added', dashify(key))
      } else if (oldVal[key]!=lastVal[key]){
        arrayKV(node.diff, 'changed', dashify(key))
      }
    }
  }

  function getParents (node, test, key, onlyOne) {
    var p = node, path=[]
    while(p) {
      if(test(p)) path.unshift(key?p[key]:p)
      p = p.parent
    }
    return path
  }

  function arrayKV (obj, k, v, reverse) {
    obj[k] = obj[k] || []
    reverse ? obj[k].unshift(v) : obj[k].push(v)
  }

  function dashify(str) {
    return trim(strSugar(str, [ ['[A-Z]', function (z) { return '-' + z.toLowerCase() }] ]))
  }

  function strSugar (str, sugar) {
    return sugar.reduce(
      function (pre, cur) {
        return pre.replace(
          new RegExp('\\\\?('+ cur[0] +')', 'g'),
          function (m, z) {
            return m==z ? cur[1](z) : z
          }
        )
      },
      str
    )
  }

  function combinePath(array, prev, sep, rep) {
    return !array.length ? prev : array[0].reduce(function (result, value) {
      var str = prev ? prev + sep : prev
      if(rep){
        var isReplace = false
        var sugar = strSugar(value, [['&', function(z){
          isReplace=true
          return prev
        }]])
        str = isReplace ? sugar : str + sugar
      } else {
        str += value
      }
      return result.concat(combinePath( array.slice(1), str, sep, rep ))
    }, [])
  }

  function splitComma (str) {
    for (var c, i = 0, n = 0, prev = 0, d = []; c = str[i]; i++) {
      if (c=='('||c=='[') n++
      if (c==')'||c==']') n--
      if (!n && c == ',') d.push(str.substring(prev, i)), prev = i + 1
    }
    return d.concat(str.substring(prev))
  }

  function localizeName (str, opt) {
    var NS = opt.localNames
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

    return str.replace(reClass, replacer)
  }

  function isValidCSSValue (val) {
    return val || val === 0
  }

  function applyPlugins (opt, type) {
    var args = [].slice.call(arguments, 2)
    var plugin = opt.plugins[type]
    return !plugin ? args[0] : [].concat(plugin).reduce(
      function (pre, f) { return f.apply(null, [pre].concat(args)) },
      args.shift()
    )
  }

  function applyOrder(opt) {
    if(!opt._order) return
    opt._order
      .sort(function(a,b) {
        return a.order-b.order
      })
      .forEach(function(v) {
        v.func.forEach(function(f) {
          f[0](f[1])
        })
      })
    delete opt._order
  }

  function cssobj (options) {
    options = options || {}

    var defaultOption = {
      local: true,
      prefix: random(),
      localNames: {},
      plugins: {}
    }

    // set default options
    for (var i in defaultOption) {
      if(!(i in options)) options[i] = defaultOption[i]
    }

    return function(obj) {

      var updater = function (newObj, data) {

        newObj = newObj||obj

        result.data = data||{}

        result.root = parseObj(obj, options, result, result.root, true)
        applyOrder(result)
        applyPlugins(options, 'post', result)

      }

      var result = {
        map: options.localNames,
        update: updater,
        options: options
      }

      updater()

      return result
    }
  }

  return cssobj;

});