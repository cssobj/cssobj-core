var expect = require('chai').expect
var util = require('util')

var cssobj

describe('test cssobj', function(){
  before(function() {

    cssobj = require('../dist/cssobj.cjs.js')

  })

  //
  // option test
  describe('test cssobj options', function() {

    it('css with 2 space indent', function() {

      var ret = cssobj(
        {p:{color:'red'}},
        {indent:'  '}
      )
      expect(ret.css.trim()).deep.equal(
`p {
color: red;
}`
      )

    })

  })

  //
  // function test
  describe('test selector without class', function() {

    it('css with css hacks', function() {

      var ret = cssobj({p:{'_font_size\\0/':'12px', '*background-color':'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p {
_font_size\\0/: 12px;
*background-color: #fff;
}`
      )

    })

    it('css from camel case', function() {

      var ret = cssobj({p:{'_fontSize':'12px', 'background\\With\\S\\BColor':'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p {
_font-size: 12px;
backgroundWithSB-color: #fff;
}`
      )

    })


    it('single child selector', function() {

      var ret = cssobj({div:{
        'fontSize':'12px',
        'p':{
          color:'red'
        }
      }}, {indent:'  '})
      expect(ret.css.trim()).deep.equal(
`div {
font-size: 12px;
}
div p {
color: red;
}`
      )

    })

    it('comma in child selector', function() {

      var ret = cssobj({'div,table':{
        'fontSize':'12px',
        'p,span':{
          color:'red'
        }
      }}, {indent:'  '})
      expect(ret.css.trim()).deep.equal(
`div,table {
font-size: 12px;
}
div p,div span,table p,table span {
color: red;
}`
      )

    })

    it('using & inside child selector', function() {

      var ret = cssobj({div:{
        'fontSize':'12px',
        '&:before, &:after':{
          'content':'"---"'
        }
      }}, {indent:'  '})
      expect(ret.css.trim()).deep.equal(
`div {
font-size: 12px;
}
div:before, div:after {
content: "---";
}`
      )

    })

    it('selector with attribute []', function() {

      var ret = cssobj({'p[title="abc"]':{color:'red'}})
      expect(ret.css.trim()).deep.equal(
`p[title="abc"] {
color: red;
}`
      )

    })

    it('selector with comma inside attribute []', function() {

      var ret = cssobj({'p[title="a,bc"],div':{
        span:{
          color:'red'
        }
      }}, {indent:'  '})
      expect(ret.css.trim()).deep.equal(
`p[title="a,bc"] span,div span {
color: red;
}`
      )

    })

    it('selector with comma inside psuedo ()', function() {

      var ret = cssobj(
        {':-moz-any(ol, ul, menu[title="a,b"], dir) dd, :-moz-any(ol, ul, menu, dir) ul':{  span: {color:'red'} }}
        , {indent:'  '}
      )
      expect(ret.css.trim()).deep.equal(
`:-moz-any(ol, ul, menu[title="a,b"], dir) dd span, :-moz-any(ol, ul, menu, dir) ul span {
color: red;
}`
      )

    })

    xit('css with reset.css', function() {

      var ret = cssobj({p:{'_fontSize':'12px', 'background\\Color':'#fff'}}, {propSugar:0})
      expect(ret.css.trim()).deep.equal(
`p {
_fontSize: 12px;
background\\Color: #fff;
}`
      )

    })


  })

  //
  // test with local class name
  describe('test with local class name', function() {

    it('local class name with random string', function() {

      // random string cannot test right,
      // so using regexp to test format
      var ret = cssobj({'.red':{
        'color':'red',
      }})
          .css
          .trim()
          .split(/\n/)
      expect(ret.shift()).match(/^._\w{6,7}\d+_red {/)
      expect(ret.join('\n')).equal(
`color: red;
}`
      )

    })

    // below will using _prefix_ as prefix
    it('local class name with custom prefix', function() {

      var ret = cssobj({'.red':{
        'color':'red',
      }}, {prefix: '_prefix_'}).css.trim()
      expect(ret).equal(
`._prefix_red {
color: red;
}`
      )

    })

    it('local class name with :global escape 1', function() {

      var ret = cssobj({':global(.red).bold':{
        'color':'red',
      }}, {prefix: '_prefix_'}).css.trim()
      expect(ret).equal(
`.red._prefix_bold {
color: red;
}`
      )

    })

    it('local class name with :global escape 2', function() {

      var ret = cssobj({':global(.red.green .blue).bold':{
        'color':'red',
      }}, {prefix: '_prefix_'}).css.trim()
      expect(ret).equal(
`.red.green .blue._prefix_bold {
color: red;
}`
      )

    })

    it('local class name with ! escape 1', function() {

      var ret = cssobj({'.!red.bold':{
        'color':'red',
      }}, {prefix: '_prefix_'}).css.trim()
      expect(ret).equal(
`.red._prefix_bold {
color: red;
}`
      )

    })

    it('local class name with ! escape 2', function() {

      var ret = cssobj({'.!red .!green .bold':{
        'color':'red',
      }}, {prefix: '_prefix_'}).css.trim()
      expect(ret).equal(
`.red .green ._prefix_bold {
color: red;
}`
      )

    })

    it('local class name with pre-defined local name', function() {

      var ret = cssobj({'.red .green .!bold':{
        'color':'red',
      }}, {prefix: '_prefix_'}, {red:'_custom_sel'}).css.trim()
      expect(ret).equal(
`._custom_sel ._prefix_green .bold {
color: red;
}`
      )

    })

    it('disable local class name', function() {

      var ret = cssobj({'.red .!bold :global(.test)':{
        'color':'red',
      }}, {local:false}, {red:'_custom_sel'})
      expect(ret.css.trim()).equal(
`.red .bold .test {
color: red;
}`
      )

      expect(ret.map).deep.equal({
        red:'red'
      })

    })

  })

  //
  //test array support

  describe('test array support', function() {

    it('object inside array', function() {

      var ret = cssobj({
        d:[{color:123}, {font:'"Arial"', color:'blue'}]
      }, {indent:'  '})

      expect(ret.css).equal(
        `d {
color: 123;
}
d {
font: "Arial";
color: blue;
}
`
      )

    })

    it('properties inside array', function() {

      var ret = cssobj({
        p:[{font:[function(){return 'Helvetica'}, '"Arial"'], color:'blue'}]
      }, {indent:'  '})

      expect(ret.css).equal(
        `p {
font: Helvetica;
font: "Arial";
color: blue;
}
`
      )

    })

    it('empty string property as array', function() {

      var ret = cssobj({
        p:{'': [{font:[function(){return 'Helvetica'}, '"Arial"'], color:'blue'}]}
      }, {indent:'  '})

      expect(ret.css).equal(
        `p {
font: Helvetica;
font: "Arial";
color: blue;
}
`
      )

    })

  })

  //
  //test atRules
  describe('test @rules top level', function() {


    it('@import rule single', function() {

      var ret = cssobj({
        "@import": "url(\"fineprint.css\") print",
        d:{color:123}
      }, {indent:'  '})

      expect(ret.css.trim()).equal(
`@import url("fineprint.css") print;
d {
color: 123;
}`
      )

    })


    it('@import rule with multiple', function() {

      var ret = cssobj({
        '': [
          {"@import": "url(\"fineprint1.css\") print"},
          {"@import": "url(\"fineprint2.css\") print"},
          {"@import": "url(\"fineprint3.css\") print"},
        ],
        d:{color:123}
      }, {indent:'  '})

      expect(ret.css).equal(

        // child always come first
        `d {
color: 123;
}
@import url("fineprint1.css") print;
@import url("fineprint2.css") print;
@import url("fineprint3.css") print;
`
        // version 0.1 result
//         `@import url("fineprint1.css") print;
// @import url("fineprint2.css") print;
// @import url("fineprint3.css") print;
// d {
// color: 123;
// }`
      )

    })


    it('@import rule with multiple inside @supports', function() {

      var ret = cssobj({
        '@supports (import: true)':{
          "@import": "url(\"fineprint.css\") print",
          '': [
            {"@import": "url(\"fineprint1.css\") print"},
            {"@import": "url(\"fineprint2.css\") print"},
            {"@import": "url(\"fineprint3.css\") print"},
          ],
          d:{color:123}
        }
      }, {indent:'  '})

      expect(ret.css).equal(
        `@supports (import: true) {
@import url("fineprint.css") print;
d {
color: 123;
}
}
@supports (import: true) {
@import url("fineprint1.css") print;
}
@supports (import: true) {
@import url("fineprint2.css") print;
}
@supports (import: true) {
@import url("fineprint3.css") print;
}
`
        // version 0.1 result
//         `@supports (import: true) {
// @import url("fineprint.css") print;
// @import url("fineprint1.css") print;
// @import url("fineprint2.css") print;
// @import url("fineprint3.css") print;
// d {
// color: 123;
// }
// }`
      )

    })


    it('@font-face rule top level', function() {

      var ret = cssobj({
        "@font-face": {
          "font-family": '"Bitstream Vera Serif Bold"',
          "src": 'url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf")'
        }
      }, {indent:'  '})

      expect(ret.css.trim()).equal(
        `@font-face {
font-family: "Bitstream Vera Serif Bold";
src: url("https://mdn.mozillademos.org/files/2468/VeraSeBd.ttf");
}`
      )

    })

    it('@keyframes top level', function() {

      var ret = cssobj({
        "@keyframes identifier1": {
          "0%": {
            "top": 0,
            "left": 0
          },
          "10%": {
            "top": 20,
            "left": 20
          }
        }
      }, {indent:'  '})

      expect(ret.css.trim()).equal(
`@keyframes identifier1 {
0% {
top: 0;
left: 0;
}
10% {
top: 20;
left: 20;
}
}`
      )

    })

    it('@supports top level with @import, @keyframes', function() {

      var ret = cssobj({
        "@supports (animation-name: test)": {
          "@import": "url(\"fineprint.css\") print",
          "d": {
            "color": 123
          },
          "@keyframes identifier": {
            "0%": {
              "top": 0,
              "left": 0
            },
            "10%": {
              "top": 20,
              "left": 20
            }
          }
        }
      }, {indent:'  '})

      expect(ret.css.trim()).equal(
`@supports (animation-name: test) {
@import url("fineprint.css") print;
d {
color: 123;
}
@keyframes identifier {
0% {
top: 0;
left: 0;
}
10% {
top: 20;
left: 20;
}
}
}`
      )

    })

    it('@media at top level', function() {

      var ret = cssobj(
        {
          "@media only screen and (min-device-width : 320px) and (max-device-width : 480px)": {p:{color:'red'}},
          "@media only screen and (min-width : 321px)": {p:{color:'blue'}}
        }
        , {indent:'  ', prefix:'_prefix_'})

      expect(ret.css.trim()).equal(
        `@media only screen and (min-device-width : 320px) and (max-device-width : 480px) {
p {
color: red;
}
}
@media only screen and (min-width : 321px) {
p {
color: blue;
}
}`
      )

    })

    it('@media supports with multi-level', function() {

      var ret = cssobj(
        {
          ".p": {
            "color": "red",
            "back": "23ret",
            "@media (min-width:320px)": {
              "color": "red2",
              "@media c2&c": {
                "_color": "blue",
                "@media (max-width:768px)": {
                  "color": 234
                }
              },
              "@font-face": {
                "style": 1
              },
              "&.d": {
                "x": 1
              }
            }
          }
        }
        , {indent:'  ', prefix:'_prefix_'})

      expect(ret.css.trim()).equal(
        `._prefix_p {
color: red;
back: 23ret;
}
@media (min-width:320px) {
._prefix_p {
color: red2;
}
@font-face {
style: 1;
}
._prefix_p._prefix_d {
x: 1;
}
}
@media (min-width:320px) and c2&c {
._prefix_p {
_color: blue;
}
}
@media (min-width:320px) and c2&c and (max-width:768px) {
._prefix_p {
color: 234;
}
}`
      )

    })



        it('@media supports with multi-level comma split', function() {

      var ret = cssobj(
        {
          ".p": {
            "color": "red",
            "back": "23ret",
            "@media & (cond,ition)": {
              "color": "red2",
              "@media c2,c3": {
                "_color": "blue",
                "@media (max:324px),(min:111px)": {
                  "color": 234
                }
              },
              "@font-face": {
                "style": 1
              }
            }
          }
        }
        , {indent:'  ', prefix:'_prefix_'})

      expect(ret.css.trim()).equal(
        `._prefix_p {
color: red;
back: 23ret;
}
@media & (cond,ition) {
._prefix_p {
color: red2;
}
@font-face {
style: 1;
}
}
@media & (cond,ition) and c2,& (cond,ition) and c3 {
._prefix_p {
_color: blue;
}
}
@media & (cond,ition) and c2 and (max:324px),& (cond,ition) and c2 and (min:111px),& (cond,ition) and c3 and (max:324px),& (cond,ition) and c3 and (min:111px) {
._prefix_p {
color: 234;
}
}`
      )

    })




  })



  //
  // test with update

  describe('test with update', function() {

    it('should diff right in result', function() {

      var ret = cssobj({
        dd:{font:123},
        p:{
          $id: 'abc',
          color: 'red',
          textAlign: 'right',
          p1:{font:1234}
        },
        p2:{
          $id: 'xyz',
          color: 'blue'
        }
      }, {indent:'  '})

      expect(ret.css).equal(
        `dd {
font: 123;
}
p {
color: red;
text-align: right;
}
p p1 {
font: 1234;
}
p2 {
color: blue;
}
`)

      expect(Object.keys(ret.ref)).deep.equal(['abc', 'xyz'])

      var abc = ret.ref.abc
      abc.color = function(last, n, opt){
        // version 0.1 it's n.selector
        return n.selText
      }
      abc.left = '10px'
      delete abc.textAlign

      delete ret.obj.dd

      ret.obj.div = {
        float: 'left'
      }

      ret.update()

      expect(ret.css).equal(
        `p {
color: p;
left: 10px;
}
p p1 {
font: 1234;
}
p2 {
color: blue;
}
div {
float: left;
}
`)

      expect(ret.diff.added.length).equal(1)
      expect(ret.diff.added[0].key).equal('div')

      expect(ret.diff.removed.length).equal(1)
      expect(ret.diff.removed[0].key).equal('dd')

      expect(ret.diff.changed.length).equal(1)
      expect(ret.diff.changed[0].key).equal('p')

      expect(ret.diff.changed[0].diff).deep.equal({
        changed:['color'],
        removed:['textAlign'],
        added:['left']
      })

      ret.update({p:{color:'blue'}})

      expect(ret.css).equal(
        `p {
color: blue;
}
`
      )

      expect('added' in ret.diff).equal(false)
      expect(ret.diff.changed.length).equal(1)
      expect(ret.diff.removed.map(function(v){return v.key})).deep.equal(['p1', 'p2', 'div'])

    })

    it('set diffOnly option', function() {

      var ret = cssobj({p:{color:'red'}}, {diffOnly: true, indent:'  '})

      ret.obj.p.left = 10

      var css = ret.update()

      expect(css).equal('')

      // ret.css will not changed due to: diffOnly=true
      expect(ret.css).equal(
        `p {
color: red;
}
`
      )

    })

    // test for update order
    it('should update accroding to $order', function() {

      var obj = {
        p2:{
          $id: 2,
          $order:2,
          color: 'red'
        },
        p1:{
          $id: 1,
          $order:-1,
          color: 'blue'
        },
        p:{
          $id: 0,
          color: 'green'
        }
      }
      var opt = {indent:'  '}
      var ret = cssobj(obj, opt)

      obj.p.color = 10
      obj.p1.color = function(){
        var pNode = cssobj.findNode(obj.p, ret.root)
        return pNode.lastVal.color * 2
      }
      obj.p2.color = function(){
        var pNode = cssobj.findNode(obj.p1, ret.root)
        return pNode.lastVal.color * 2
      }

      expect(ret.update()).equal(
        `p2 {
color: 40;
}
p1 {
color: 20;
}
p {
color: 10;
}
`
      )


    })


    it('should invoke callback event when update, then remove', function() {

      var ret = cssobj({
        dd:{font:123},
        p:{
          $id: 'abc',
          color: 'red'
        }
      }, {indent:'  '})

      var callCount = 0

      var onUpdate = function(css, opt) {

        callCount++

        if(callCount==3){
          expect(opt._data).deep.equal({resize:true})
        } else {
          expect(opt._data).deep.equal({})
        }

        expect(css).equal(
          `dd {
font: 123;
}
p {
color: red;
}
`)

      }

      // setup update
      ret.on('update', onUpdate)

      // normal update
      ret.update()
      ret.update()
      expect(callCount).equal(2)

      // update with custom data
      ret.update(null, {resize:true})
      expect(callCount).equal(3)

      // remove event
      ret.off('update', onUpdate)

      // remove non-exists event
      // should not throw
      ret.off('event_non_exists', onUpdate)

      // should not trigger event
      ret.update()
      expect(callCount).equal(3)


    })

    it('value update function to set node.lastVal', function() {

      var t = {
        color: 0
      }
      var obj = {
        p:t,
        d:{font:'Arial'}
      }
      var ret = cssobj(obj, {indent:'  '})

      var node = ret.options._root.children.p
      expect(node.lastVal['color']).equal(0)

      // test for normal update based on lastVal
      t.color = function(last) {
        return last+1
      }

      expect(ret.update()).equal(
        `p {
color: 1;
}
d {
font: Arial;
}
`)
      // test for non value update
      t.color = function(n) {
        return null
      }

      // css will be empty due to null
      expect(ret.update()).equal(
        // version 0.1 will have empty prop
        `d {
font: Arial;
}
`)

      // test for 0 value update
      t.color = function(n) {
        return 0
      }

      expect(ret.update()).equal(
        `p {
color: 0;
}
d {
font: Arial;
}
`)
      // test for add new rule
      // add object and register to ref
      ret.ref.xyz = t.xyz = {
        fontSize: '12px'
      }
      // update node with recursive to take the node
      ret.update()

      // check css
      expect(ret.css).equal(
        `p {
color: 0;
}
p xyz {
font-size: 12px;
}
d {
font: Arial;
}
`
      )

    })

  })


  //
  // plugin test
  describe('plugin test', function() {


    it('post plugin', function() {

      var post1 = function(option){
        return function(result){

          expect(option.abc).equal(true)

          expect(result.css).equal(
            `p {
color: red;
}
`
          )

          result.abc = option.abc

          // should return first args to pass to next plugin
          return result

        }
      }

      var post2 = function(result){

        expect(result.abc).equal(true)

      }

      // only one plugin
      cssobj({p:{color:'red'}}, {
        indent:'  ',

        plugins: {
          post: post1({abc:true})
        }

      })

      // pass value to next plugin
      cssobj({p:{color:'red'}}, {
        indent:'  ',
        plugins: {
          post: [post1({abc:true}), post2]
        }
      })

    })


    it('value plugin', function() {

      var node

      function plug1(value) {
        expect(value).equal(2)

        // pass to next plugin
        return value*2
      }

      function plug2(value, key, n){
        node = n
        expect(value).equal(4)
      }

      cssobj({p:{size:2}}, {
        indent:'  ',
        plugins:{
          value: [plug1, plug2]
        }
      })

      // plugin should not effect lastVal
      expect(node.lastVal['size']).equal(2)

    })



    it('update with value plugin', function() {

      function plug(value){
        return value+'px'
      }

      var size = {size:2}
      var ret = cssobj({p:size}, {
        indent:'  ',
        plugins:{
          value: [plug]
        }
      })

      size.size = 10

      var css = ret.update({p:size})

      expect(css).equal(
        `p {
size: 10px;
}
`
      )

    })

  })

  //
  // sub function test
  describe('sub function test', function() {

    it('makeRule test', function() {

      var opt = {indent:'  '}
      var ret = cssobj(
        {
          p:{
            $id:'abc',
            color:'red',
            font:123
          }
        },
        opt
      )

      var node = cssobj.findNode(ret.ref.abc, ret.root)
      expect(node.key).equal('p')

      var rule = cssobj.makeRule( node, opt )
      expect(rule).equal(
        `p {
color: red;
font: 123;
}
`
      )

      rule = cssobj.makeRule( node, opt, -1 )
      expect(rule).equal(
        `color: red;
font: 123;
`
      )

      // after version 0.1, use selText instead
      // var selector = cssobj.getSelector( node, opt)

      expect(node.selText).equal('p')

    })


  })

})
