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
      var child = convertSimpleData(d[k], prop, path.concat('' + k))
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

function propFormatter (propArray) {
  return propArray.map(function (v) {return '\t' + v}).join(';\n')
}

function getSelector (path) {
  return path.join(' ')
}

function outPut () {
  Object.keys(buf).forEach(
    function (k) {
      console.log(k,
                  propStart +
                  propFormatter(buf[k]) +
                  propEnd)
    })
}

function decamelize (match) {
  return '-' + match.toLowerCase()
}

function objKV (obj, k, v) {
  return obj[k] = v
}

var buf = {}
var obj = {
  'ul.menu': {
    background_color: 'red',
    borderRadius: '2px',
    'li.item': {
      font_size: '12px'
    }
  }
}
console.log(convertSimpleData(obj))

console.log(buf)

outPut()
