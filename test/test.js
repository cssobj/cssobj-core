var sinon = require('sinon')
var expect = require('chai').expect
var cssobj

var obj01 = {
  'ul.menu': {
    background_color: 'red',
    borderRadius: '2px',
    'li.item, li.cc': {
      '&:before, .link':{
        '.foo[title*=\'\\&\'], :global(.xy)':{color:'blue'},
        color:'red'
      },
      'html:global(.ie8) &':{color:'purple'},
      font_size: '12px'
    }
  }
}

var css01 = `ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_item:before ._18k9m2k_18k9m2k1_foo[title*='&'], ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_cc:before ._18k9m2k_18k9m2k1_foo[title*='&'], ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_item ._18k9m2k_18k9m2k1_link ._18k9m2k_18k9m2k1_foo[title*='&'], ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_cc ._18k9m2k_18k9m2k1_link ._18k9m2k_18k9m2k1_foo[title*='&'], ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_item:before .xy, ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_cc:before .xy, ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_item ._18k9m2k_18k9m2k1_link .xy, ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_cc ._18k9m2k_18k9m2k1_link .xy {
	color:blue
}
ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_item:before, ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_cc:before, ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_item ._18k9m2k_18k9m2k1_link, ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_cc ._18k9m2k_18k9m2k1_link {
	color:red
}
html.ie8 ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_item, html.ie8 ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_cc {
	color:purple
}
ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_item, ul._18k9m2k_18k9m2k1_menu li._18k9m2k_18k9m2k1_cc {
	font-size:12px
}
ul._18k9m2k_18k9m2k1_menu {
	background-color:red;
	border-radius:2px
}`


describe('test cssobj', function(){
  before(function() {

    cssobj = require('../lib/cssobj.js')

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

    it('css from underline properties', function() {

      var ret = cssobj({p:{color:'red', _font_sizeValue:'12px', background_color:'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p {
	color: red;
	-font-size-value: 12px;
	background-color: #fff;
}`
      )

    })

    it('css from css hack', function() {

      var ret = cssobj({p:{'\\_font_size':'12px', background_color:'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p {
	_font-size: 12px;
	background-color: #fff;
}`
      )

    })

    it('css from camel case', function() {

      var ret = cssobj({p:{'\\_fontSize':'12px', 'background\\Color':'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p {
	_font-size: 12px;
	backgroundColor: #fff;
}`
      )

    })

    it('css with propSugar off', function() {

      var ret = cssobj({p:{'_fontSize':'12px', 'background\\Color':'#fff'}}, {propSugar:0})
      expect(ret.css.trim()).deep.equal(
`p {
	_fontSize: 12px;
	background\\Color: #fff;
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
div p,table p,div span,table span {
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
`	color: red;
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

      expect(ret.css.trim()).equal(
`@import url("fineprint1.css") print;
@import url("fineprint2.css") print;
@import url("fineprint3.css") print;
d {
  color: 123;
}`
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

      expect(ret.css.trim()).equal(
        `@supports (import: true) {
  @import url("fineprint.css") print;
  @import url("fineprint1.css") print;
  @import url("fineprint2.css") print;
  @import url("fineprint3.css") print;
  d {
    color: 123;
  }
}`
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
                "\\_color": "blue",
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
                "\\_color": "blue",
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
@media & (cond,ition) and c2,
& (cond,ition) and c3 {
  ._prefix_p {
    _color: blue;
  }
}
@media & (cond,ition) and c2 and (max:324px),
& (cond,ition) and c3 and (max:324px),
& (cond,ition) and c2 and (min:111px),
& (cond,ition) and c3 and (min:111px) {
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

    it('should return vars in result', function() {

      var ret = cssobj({
        dd:{font:123},
        p:{
          $id: 'abc',
          color: 'red'
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
}
p2 {
  color: blue;
}
`)

      expect(Object.keys(ret.vars)).deep.equal(['abc', 'xyz'])

      ret.vars.abc.prop.color = function(node, selector){ return selector }

      expect(ret.update()).equal(
        `p {
  color: p;
}
p2 {
  color: blue;
}
`)

      expect(ret.update('xyz')).equal(
        `p2 {
  color: blue;
}
`)

      expect(ret.update('xyz', 'abc')).equal(
        `p2 {
  color: blue;
}
p {
  color: p;
}
`)

      // test with non-exist key
      expect(ret.update('non-exists-key')).equal('')

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

      var onUpdate = function(css, args){

        callCount++

        expect(css).equal(
          `p {
  color: red;
}
`)
        expect(args).deep.equal(['abc'])

      }

      // setup update
      ret.on('update', onUpdate)

      // normal update
      ret.update()
      ret.update('abc')
      expect(callCount).equal(2)

      // non-exists key will not trigger event
      ret.update('non-exists-key')
      expect(callCount).equal(2)

      // remove event
      ret.remove('update', onUpdate)

      // should not trigger event
      ret.update('abc')
      expect(callCount).equal(2)


    })

  })

})
