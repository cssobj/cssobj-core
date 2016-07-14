function cssobj_plugin_post_gencss (result) {
  var keys = Object.keys
  var str = []
  var walk = function(node) {
    if (!node) return ''
    if (node.constructor === Array) return node.map(function (v) {walk(v)})

    var postArr = []
    var children = node.children
    var isGroup = node.type=='group'||node.type=='keyframes'

    if(isGroup) {
      str.push(node.groupText+' {\n')
    }

    var prop = node.prop
    var selText = node.selText

    var cssText = keys(prop).map(function(k) {
      for(var v, str='', i=prop[k].length; i--; ) {
        v = prop[k][i]
        str += k.charAt(0)=='@'
          ? k+' '+v+';\n'
          : k+': '+v+';\n'
      }
      return str
    }).join('')

    if(keys(prop).length) str.push( selText ? selText + ' {\n'+ cssText +'}\n' : cssText )

    for(var c in children){
      if(c==='' || children[c].type=='group') postArr.push(c)
      else walk(children[c])
    }

    if(isGroup) {
      str.push('}\n')
    }

    postArr.map(function(v) {
      walk(children[v])
    })

  }
  walk(result.root)
  result.css = str.join('')
  return result
}
