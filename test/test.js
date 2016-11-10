var expect = require('chai').expect
var util = require('util')
var cssobj_plugin_gencss = require(process.env.CSSOBJ_GENCSS || '../../cssobj-plugin-gencss/dist/cssobj-plugin-gencss.cjs.js')

var _cssobj = require('../dist/cssobj-core.cjs.js')
var cssobj

describe('test options', function(){

  it('should work with empty options', function() {
    var ret = _cssobj()({})
    expect(ret.options).deep.equal({
      plugins:[],
      intros: []
    })
  })

  it('should work with custom options', function() {
    var plugin = function(){}
    var ret = _cssobj({
      plugins:[ plugin ]
    })(
      {a:1},
      {b:2}
    )
    expect(ret.options).deep.equal({
      plugins:[ plugin ],
      intros: []
    })
    expect(ret.obj).deep.equal({a:1})
    expect(ret.state).deep.equal({b:2})
  })

  it('should work with intro', function() {
    var ret = _cssobj({
      plugins: [
        cssobj_plugin_gencss({indent:''})
      ],
      intros: [
        // basic object as intro
        {
          '.clearfix':{
            clear: 'both'
          }
        },

        // accept function as intro
        function(){
          return {'.flex-item': {flex:1, flexBasis: '200px'}}
        }
      ]
    })(
      {p: {color: 'red'}}
    )
    expect(ret.intro).deep.equal({
      '.clearfix':{
        clear:'both'
      },
      '.flex-item':{
        flex:1,
        flexBasis: '200px'
      }
    })
    expect(ret.css).equal(`.clearfix {
clear: both;
}
.flex-item {
flex: 1;
flex-basis: 200px;
}
p {
color: red;
}
`)
  })

  it('option.onUpdate test', function() {
    var prop = {
      color: ['red']
    }
    var ret = _cssobj({
      onUpdate: function(result) {
        expect(result.root.children.p.prop).deep.equal(prop)
      }
    })({p: {color: 'red'}})

    ret.obj.p.color = 'blue'
    prop = {
      color: ['blue']
    }
    ret.update()
  })

})

describe('test cssobj', function(){

  beforeEach(function() {

    cssobj = _cssobj({
      plugins:[cssobj_plugin_gencss({indent:''})]
    })

  })

  //
  // option test
  describe('test cssobj options', function() {

    it('basic css', function() {

      var ret = cssobj(
        {'.p':{
          color:'red'
        }}
      )

      expect(ret.css.trim()).deep.equal(
`.p {
color: red;
}`
      )

    })

  })

  //
  // corner case like: function as value, inherit
  describe('special object test', function() {
    it('should work right with object inherit', function() {
      var a = {
        color: 'white',
        p: {color: 'red'}
      }

      var color = Object.create({color: 'blue'}, {
        font: {value: 123, enumerable: true}
      })

      var b = Object.create(a, {
        dd: { value: {color: 'black'}, enumerable: false }
      })

      b.div = {}
      b.div = color

      var ret = cssobj(b)
      expect(ret.css).equal(`div {
font: 123;
}
`)
    })

    it('should work right with special type', function() {
      var obj = {
        p: /regexp type/,  // will be ignored
        div: false,
        dd: {color: NaN},
        dt: null,
        td: undefined,
        tr: new Date(),
        table: new String('some string type'),
        b: {font: 123}
      }
      var ret = cssobj(obj)
      expect(ret.css).equal(`b {
font: 123;
}
`)
    })
  })

  it('test with object contain inherited properties', function() {
    var proto = {color: 'red'}
    var obj = Object.create(proto, {
      font: {value: 123, enumerable: true}
    })
    var ret = cssobj({
      p: {
        color: function() {
          return obj
        }
      }
    })
    expect(ret.css).equal(`p {
font: 123;
}
`)
  })


  //
  // $test key
  describe('$test key', function() {

    it('should $test with simple true/false', function() {
      var ret = cssobj({
        p:[
          {
            $test: false,
            color: 'red'
          },
          {
            $test: true,
            color: 'blue'
          }
        ]
      })
      expect(ret.css).equal(`p {
color: blue;
}
`)
    })

    it('should $test right with array', function() {
      var i = 0
      var ret = cssobj(
        {
          'p':[
            {
              $test: function(){
                return i++%2
              },
              color:'red'
            },
            {
              $test: function(){
                return i++%2
              },
              color:'blue'
            }
          ]
        }
      )

      expect(ret.css).equal(`p {
color: blue;
}
`)
      expect(i).equal(2)
      i++
      ret.update()
      expect(ret.css).equal(`p {
color: red;
}
`)

    })

    it('should $test right at stage 1(prev node)', function() {
      var i = 0
      var ret = cssobj(
        {'p':{
          $test: function(){
            return i++%2
          },
          color:'red'
        }}
      )

      expect(i).equal(1)
      expect(ret.root.children).deep.equal({})

      ret.update()
      expect(i).equal(2)
      expect(ret.root.children.p.prop).deep.equal({color: ['red']})
      expect(ret.diff.added[0]).equal(ret.root.children.p)

      var prev_p = ret.root.children.p
      ret.update()
      expect(i).equal(3)
      expect(ret.root.children).deep.equal({})
      expect(ret.diff.removed[0]).equal(prev_p)

    })

    // this feature has been removed
    xit('should $test right at stage 2(post node)', function() {

      var i = 0
      var ret = _cssobj() (
        {'p':{
          $test: function(){
            return function(node) {
              // if(i%2==1) expect(node.prop).deep.equal({color: ['red']})
              return i++%2
            }
          },
          color:'red'
        }}
      )

      expect(i).equal(1)
      expect(ret.root.children).deep.equal({})

      ret.update()
      expect(i).equal(2)
      expect(ret.root.children.p.prop).deep.equal({color: ['red']})
      expect(ret.diff.added[0]).equal(ret.root.children.p)

      var prev_p = ret.root.children.p
      ret.update()
      expect(i).equal(3)
      expect(ret.root.children).deep.equal({})
      expect(ret.diff.removed[0]).equal(prev_p)

    })

    // this feature has been removed
    xit('should $test right with stage 2 and $order', function() {

      var i = 0
      var ret = _cssobj() (
        {
          'p':{
            $order:2,
            $test: function(){
              return function(node) {
                // if(i%2==1) expect(node.prop).deep.equal({color: ['red']})
                return i++%2
              }
            },
            color:'red'
          },
         'dd':{
           color:'blue'
         }
        }
      )

      expect(i).equal(1)
      expect(Object.keys(ret.root.children)).deep.equal(['dd'])

      ret.update()
      expect(i).equal(2)
      expect(ret.root.children.p.prop).deep.equal({'$order':[2], color: ['red']})
      expect(ret.diff.added[0]).equal(ret.root.children.p)

      var prev_p = ret.root.children.p
      ret.update()
      expect(i).equal(3)
      expect(Object.keys(ret.root.children)).deep.equal(['dd'])
      expect(ret.diff.removed[0]).equal(prev_p)

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

      var ret = cssobj({p:{'_fontSize':'12px', 'background-color':'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p {
_font-size: 12px;
background-color: #fff;
}`
      )

    })

    it('selector start with $ should not parse', function() {

      var ret = cssobj({
        $p:{color: 123},
        $d:[1,2,3],
        $id: 'abc'
      })
      expect(ret.css).equal('')

    })

    it('single child selector', function() {

      var ret = cssobj({div:{
        'fontSize':'12px',
        'p':{
          color:'red'
        }
      }})
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
      }})
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
      }})
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
      }})
      expect(ret.css.trim()).deep.equal(
`p[title="a,bc"] span,div span {
color: red;
}`
      )

    })

    it('selector with comma inside psuedo ()', function() {

      var ret = cssobj(
        {':-moz-any(ol, ul, menu[title="a,b"], dir) dd, :-moz-any(ol, ul, menu, dir) ul':{  span: {color:'red'} }}
      )
      expect(ret.css.trim()).deep.equal(
`:-moz-any(ol, ul, menu[title="a,b"], dir) dd span, :-moz-any(ol, ul, menu, dir) ul span {
color: red;
}`
      )

    })

  })

  //
  // test prop && lastVal

  describe('test prop && lastVal', function() {


    it('prop should invert order as obj', function() {

      var obj = {

        p:{
          fontSize: [123, 456],
          _msZIndex: 999
        }

      }

      var ret = cssobj(obj)

      expect(ret.root.children.p.prop).deep.equal({
        fontSize: [456, 123],
        _msZIndex: [999]
      })

      expect(ret.root.children.p.lastVal).deep.equal({
        fontSize: 456,
        _msZIndex: 999
      })

    })

  })

  //
  //test array support

  describe('test array support', function() {

    it('object inside array', function() {

      var ret = cssobj({
        d:[{color:123}, {font:'"Arial"', color:'blue'}]
      })
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
      })
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
      })
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
      })
      expect(ret.css.trim()).equal(
`@import url("fineprint.css") print;
d {
color: 123;
}`
      )

    })

    it('test @keyframes with vendor prefix', function() {
      var obj = {
        '@-webkit-keyframes progress-bar-stripes': {
          from: {
            backgroundPosition: '40px 0'
          },
          to: {
            backgroundPosition: '0 0'
          }
        },
        '@keyframes progress-bar-stripes': {
          from: {
            backgroundPosition: '40px 0'
          },
          to: {
            backgroundPosition: '0 0'
          }
        }
      }
      var ret = cssobj(obj)
      expect(ret.css).equal(`@-webkit-keyframes progress-bar-stripes {
from {
background-position: 40px 0;
}
to {
background-position: 0 0;
}
}
@keyframes progress-bar-stripes {
from {
background-position: 40px 0;
}
to {
background-position: 0 0;
}
}
`)

    })


    it('@import rule with multiple', function() {

      var ret = cssobj({
        '': [
          {"@import": "url(\"fineprint1.css\") print"},
          {"@import": "url(\"fineprint2.css\") print"},
          {"@import": "url(\"fineprint3.css\") print"},
        ],
        '@import': ['url1', 'url2'],
        d:{color:123}
      })
      expect(ret.css).equal(

        // child always come first
`@import url1;
@import url2;
d {
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
      })
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
      })
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
      })
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
      })
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

    it('@media with no space after', function() {
      var ret = cssobj({
        '@media(min-width:800px)':{
          h3:{color:'red'}
        }
      })
      expect(ret.css).equal(
`@media(min-width:800px) {
h3 {
color: red;
}
}
`)
    })

    it('@media with array value', function() {
      var ret = cssobj({
        '@media(min-width:800px)':[{
          h3:{color:'red'}
        }, {
          h3:{color:'blue'}
        }]
      })
      expect(ret.css).equal(
`@media(min-width:800px) {
h3 {
color: red;
}
}
@media(min-width:800px) {
h3 {
color: blue;
}
}
`)
    })


    it('@media at top level', function() {

      var ret = cssobj(
        {
          "@media only screen and (min-device-width : 320px) and (max-device-width : 480px)": {p:{color:'red'}},
          "@media only screen and (min-width : 321px)": {p:{color:'blue'}}
        })

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
        })

      expect(ret.css.trim()).equal(
        `.p {
color: red;
back: 23ret;
}
@media (min-width:320px) {
.p {
color: red2;
}
@font-face {
style: 1;
}
.p.d {
x: 1;
}
}
@media (min-width:320px) and c2&c {
.p {
_color: blue;
}
}
@media (min-width:320px) and c2&c and (max-width:768px) {
.p {
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
              "@media c2, c3": {
                "_color": "blue",
                "@media (max:324px), (min:111px)": {
                  "color": 234
                }
              },
              "@font-face": {
                "style": 1
              }
            }
          }
        })

      expect(ret.css.trim()).equal(
        `.p {
color: red;
back: 23ret;
}
@media & (cond,ition) {
.p {
color: red2;
}
@font-face {
style: 1;
}
}
@media & (cond,ition) and c2, & (cond,ition) and c3 {
.p {
_color: blue;
}
}
@media & (cond,ition) and c2 and (max:324px), & (cond,ition) and c2 and (min:111px), & (cond,ition) and c3 and (max:324px), & (cond,ition) and c3 and (min:111px) {
.p {
color: 234;
}
}`
      )

    })


    it('should right format deeply nested @media rule', function() {

      cssobj().options.local = false

      var ret = cssobj({
        "div": {
          "fontSize": "12px",
          "color": "blue"
        },
        "@media (max-width: 800px)": {
          ".active": {
            "color": "purple",
            "div &": {
              "color": "red",
              "@media (min-width: 100px)": {
                "color": "red"
              },
              "fontSize": "12px"
            }
          }
        }
      })

      expect(ret.css).equal(`div {
font-size: 12px;
color: blue;
}
@media (max-width: 800px) {
.active {
color: purple;
}
div .active {
color: red;
font-size: 12px;
}
}
@media (max-width: 800px) and (min-width: 100px) {
div .active {
color: red;
}
}
`)

    })


  })



  //
  // test with update

  describe('test with update', function() {

    it('should pass state right', function() {
      var ret = cssobj({p: {color: 123}}, {abc:1})
      expect(ret.state).deep.equal({abc:1})
      ret.update(null, {def:2})
      expect(ret.state).deep.equal({def:2})

      ret.obj.p.font = 345
      console.log(ret.obj)
      ret.update()
      expect(ret.css).equal(`p {
color: 123;
font: 345;
}
`)
      // will retain state if not passed
      ret.update({div: {font:234}})
      expect(ret.state).deep.equal({def:2})
      expect(ret.css).equal(`div {
font: 234;
}
`)
    })

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
      })
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

      var abc = ret.ref.abc.obj
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

      // all the diff key is dashify-ed
      expect(ret.diff.changed[0].diff).deep.equal({
        changed:['color'],
        removed:['textAlign'],
        added:['left']
      })

      ret.obj = {p:{color:'blue'}}

      ret.update()

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
        var pNode = ret.nodes.filter(function(v) {
          return obj.p == v.obj
        }).pop()
        return pNode.lastVal.color * 2
      }
      obj.p2.color = function(){
        var pNode = ret.nodes.filter(function(v) {
          return obj.p1 == v.obj
        }).pop()
        return pNode.lastVal.color * 2
      }

      ret.update()

      expect(ret.css).equal(
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


    it('value update function to set node.lastVal', function() {

      var t = {
        color: 0
      }
      var obj = {
        p:t,
        d:{font:'Arial'}
      }
      var ret = cssobj(obj)
      var node = ret.root.children.p
      expect(node.lastVal['color']).equal(0)

      // test for normal update based on lastVal
      t.color = function(last) {
        return last+1
      }

      expect(ret.update().css).equal(
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
      expect(ret.update().css).equal(
        // version 0.1 will have empty prop
        `d {
font: Arial;
}
`)

      // test for 0 value update
      t.color = function(n) {
        return 0
      }

      expect(ret.update().css).equal(
        `p {
color: 0;
}
d {
font: Arial;
}
`)
      // test for add new rule
      // add object and register to ref
      t.xyz = {
        $id: 'xyz',
        fontSize: '12px'
      }
      // update node with recursive to take the node
      ret.update()

      // check new ref
      expect(ret.ref.xyz.key).equal('xyz')

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

    it('value function returned array of value', function() {
      var obj = {
        p:{
          display: function() {
            return [
              0,
              1,
              // also expand nested arrays
              [2,3],
              [[4]]
            ]
          }
        }
      }

      var ret = cssobj(obj)
      expect(ret.css).equal(`p {
display: 0;
display: 1;
display: 2;
display: 3;
display: 4;
}
`)

      // array of object and number mixed
      var obj = {
        p:{
          display: [0,1, {color: 'red'}]
        }
      }

      var ret = cssobj(obj)
      expect(ret.css).equal(`p {
display: 0;
display: 1;
color: red;
}
`)

      // array of object and array mixed
      var obj = {
        p:{
          display: [0,1, {color: [['red', 'blue']]}]
        }
      }

      var ret = cssobj(obj)
      expect(ret.css).equal(`p {
display: 0;
display: 1;
color: red;
color: blue;
}
`)

    })

    it('value function returned and merge Object/Array', function() {

      var target = `p {
display: -webkit-box;
display: -moz-box;
display: -ms-flexbox;
display: -webkit-flex;
display: flex;
-ms-flex-preferred-size: initial;
line-height: 24px;
}
`

      // value function return single Object
      var obj = {
        p:{
          // below can only as value function, for it's return Object
          display: function() {
            return {display: ['-webkit-box', '-moz-box', '-ms-flexbox', '-webkit-flex', 'flex'], '-ms-flex-preferred-size': 'initial'}
          },
          lineHeight: '24px'
        }
      }

      var ret = cssobj(obj)
      expect(ret.css).equal(target)


      // value function return Array of Object
      var obj = {
        p:{
          display: function() {
            return [{display: ['-webkit-box', '-moz-box', '-ms-flexbox', '-webkit-flex', 'flex']}, {'-ms-flex-preferred-size': 'initial' }]
          },
          lineHeight: '24px'
        }
      }

      var ret = cssobj(obj)
      expect(ret.css).equal(target)

    })


    it('update ref when remove named obj', function() {

      var obj = {
        p:{
          $id:'xy',
          color:1
        },
        b:{
          $id:'ab',
          color:2
        }
      }

      var ret = cssobj(obj)

      expect(Object.keys(ret.ref)).deep.equal(['xy', 'ab'])

      delete obj.p
      ret.update()

      expect(Object.keys(ret.ref)).deep.equal(['ab'])

    })

    it('should work with !important value', function() {
      var obj = {
        p: {
          color: 'red'
        }
      }
      var ret = cssobj(obj)
      expect(ret.css).equal(`p {
color: red;
}
`)
      obj.p.color = 'blue !important'
      ret.update()
      expect(ret.css).equal(`p {
color: blue !important;
}
`)
    })


  })


  //
  // v-node test

  describe('v-node test', function() {

    it('normal @-rule v-node', function() {

      var ret = cssobj({
        '@import  ': 'url1',
        '@import': 'url1',
      })

      expect(Object.keys(ret.root.children['@import  '])).deep.equal(["parent", "src", "key", "inline", "selPart", "obj", "prevVal", "children", "lastVal", "rawVal", "prop", "diff", "parentRule", "type", "selText", "selTextPart"])

      expect(Object.keys(ret.root.children['@import'])).deep.equal(["parent", "src", "key", "inline", "selPart", "obj", "prevVal", "children", "lastVal", "rawVal", "prop", "diff", "parentRule", "type", "selText", "selTextPart"])

    })

    it('@media group rule v-node', function() {
      var ret = cssobj({
        '@media(min-width:800px)  ': {
          p:{color:123}
        },
        '@media (min-width:300px)': {
          p:{color:123}
        }
      })

      var media1 = ret.root.children["@media(min-width:800px)  "]
      var media2 = ret.root.children["@media (min-width:300px)"]

      expect(media1.at).equal('media')

      expect(Object.keys(media1)).deep.equal(["parent", "src", "key", "selPart", "obj", "prevVal", "children", "lastVal", "rawVal", "prop", "diff", "parentRule", "type", "at", "groupText", "selText"])


      expect(media2.at).equal('media')

      expect(Object.keys(media2)).deep.equal(["parent", "src", "key", "selPart", "obj", "prevVal", "children", "lastVal", "rawVal", "prop", "diff", "parentRule", "type", "at", "groupText", "selText"])

    })

    it('normal nested rule', function() {

      var ret = _cssobj({
        plugins: {value: function(val, key) {
          return key==='width'? val*2 : val
        }}
      })({
        h3:{
          p:{color:123}
        },
        'h3,h4':{
          width: function(){return 10},
          'p,span':{color:234}
        }
      })

      var h3 = ret.root.children.h3
      var h4 = ret.root.children['h3,h4']

      expect(h3.selText).equal('h3')
      expect(h3.children.p.selText).equal('h3 p')
      expect(h3.children.p.rawVal).deep.equal({"color":[123]})
      expect(h3.children.p.prop).deep.equal({"color":[123]})
      expect(Object.keys(h3)).deep.equal(["parent", "src", "key", "selPart", "obj", "prevVal", "children", "lastVal", "rawVal", "prop", "diff", "parentRule", "selText", "selTextPart", "selChild"])

      expect(h4.selText).equal('h3,h4')
      // rawVal is value array before any plugins
      expect(h4.rawVal).deep.equal({width: [10]})
      // prop is value array after plugins
      expect(h4.prop).deep.equal({width: [20]})
      expect(h4.children['p,span'].selText).equal('h3 p,h3 span,h4 p,h4 span')
      expect(h4.children['p,span'].prop).deep.equal({"color":[234]})
      expect(Object.keys(h4)).deep.equal(["parent", "src", "key", "selPart", "obj", "prevVal", "children", "lastVal", "rawVal", "prop", "diff", "parentRule", "selText", "selTextPart", "selChild"])

    })

    it('should work with .clearfix', function() {
      var ret = cssobj({
        // clearfix hack
        '.clearfix': {
          '&:before, &:after': {
            content: '" "',
            display: 'table'
          },
          '&:after': {
            clear: 'both'
          },
          '&': {
            '*zoom': 1
          }
        }
      })

      expect(ret.css).equal(
`.clearfix:before, .clearfix:after {
content: " ";
display: table;
}
.clearfix:after {
clear: both;
}
.clearfix {
*zoom: 1;
}
`)
    })

    it('@media nested rule', function() {
      var ret = cssobj({
        h3:{
          p:{
            '@media(width:800px)':{
              $id: 'abc',
              color: 123
            }
          }
        }
      })

      // $id should also appear in prop
      expect(ret.ref.abc.prop).deep.equal({$id: ['abc'], "color":[123]})
      expect(ret.ref.abc.selText).equal('h3 p')
      expect(ret.ref.abc.groupText).equal('@media(width:800px)')

    })

  })

  //
  // str sugar test
  describe('string sugar replace', function() {
    it('should work right with escape', function() {
      var obj = {
        div: {
          '&.item[title="a\\&b"]': {
            color: 'red'
          }
        }
      }
      var ret = cssobj(obj)
      expect(ret.css).equal(`div.item[title="a&b"] {
color: red;
}
`)
      obj = {
        '.选择器1': {
          '&.item[title="a\\&b"]': {
            color: 'red'
          }
        }
      }
      var ret = cssobj(obj)
      expect(ret.css).equal(`.选择器1.item[title="a&b"] {
color: red;
}
`)
      obj = {
        'div': {
          'abc&选择器2[title="a\\&b"]': {
            color: 'red'
          }
        }
      }
      var ret = cssobj(obj)
      expect(ret.css).equal(`abcdiv选择器2[title="a&b"] {
color: red;
}
`)
    })
  })

  //
  // plugin test
  describe('plugin test', function() {


    it('selector plugin', function() {

      var plug = {
        value: function(val, key, node, result) {
          return val*2
        },
        selector:  function(sel, node, result) {
          return sel.replace(/\.(\w+)/gi, '._prefix_$1')
        }
      }

      var ret = _cssobj({plugins: plug})({
        '.nav, .item':{color:123}
      })

      expect(ret.root.children['.nav, .item'].prop).deep.equal({color: [246]})
      expect(ret.root.children['.nav, .item'].selPart).deep.equal(['.nav', ' .item'])
      expect(ret.root.children['.nav, .item'].selText).equal('._prefix_nav, ._prefix_item')
      expect(ret.root.children['.nav, .item'].selTextPart).deep.equal(['._prefix_nav', ' ._prefix_item'])

      ret.update()

      expect(ret.root.children['.nav, .item'].prop).deep.equal({color: [246]})
      expect(ret.root.children['.nav, .item'].selText).equal('._prefix_nav, ._prefix_item')

    })


    it('post plugin', function() {

      var post1 = function(option){
        return {
          post: function(result) {

            expect(option.abc).equal(true)

            result.abc = option.abc

            // should return first args to pass to next plugin
            return result

          }
        }
      }

      var post2 = {
        post: function(result){

          expect(result.abc).equal(true)

        }
      }

      // only one plugin
      _cssobj({
        plugins: post1({abc:true})
      })({p:{color:'red'}})

      // pass value to next plugin
      _cssobj({
        plugins: [post1({abc:true}), post2]
      })({p:{color:'red'}})

    })


    it('value plugin', function() {

      var node

      var plug1 = {value: function (value, key) {
        expect(key).equal('size')
        expect(value).equal(2)

        // pass to next plugin
        return value*2
      }}

      var plug2 = {value: function (value, key, n){
        node = n
        expect(key).equal('size')
        expect(value).equal(4)
        return 100
      }}

      _cssobj({
        plugins: [plug1, plug2]
      })({p:{size:2}})

      // before v0.3.2 :
      // plugin should not effect lastVal
      // expect(node.lastVal['size']).equal(2)

      // from v0.3.3 :
      // plugin also affect lastVal to get DIFF work right
      expect(node.lastVal['size']).equal(100)

      // test return Object from value plugin
      var checkArray = []
      var expectArray = [
        ["size",1,undefined],
        ["size",{"color":[[2]]},undefined],
        ["color",[2],"size"],
        ["color",2,"color"]
      ]

      _cssobj({
        plugins: [{
          value: function(value, key, node, result, prop){
            checkArray.push([key, value, prop])
            return value
          }
        }]
      })({p:{
        size:[
          1,
          {
            color:[[2]]
          }
        ]
      }})

      expect(checkArray).deep.equal(expectArray)

    })



    it('update with value plugin', function() {

      var plug = {value: function (value) {
        return value*2+'px'
      }}

      cssobj().options.plugins.push(plug)

      var size = {size:2}
      var ret = cssobj({p:size})

      expect(ret.css).equal(
        `p {
size: 4px;
}
`
      )


      size.size = 10

      ret.obj = {p:size}

      var css = ret.update().css

      expect(css).equal(
        `p {
size: 20px;
}
`
      )

    })

  })


})
