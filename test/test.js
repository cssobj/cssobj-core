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

  describe('test selector without class', function() {

    it('css from underline properties', function() {
      var ret = cssobj({p:{color:'red', font_size:'12px', background_color:'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p
{
	color: red;
	font-size: 12px;
	background-color: #fff;
}`
      )
    })

    it('css from css hack', function() {
      var ret = cssobj({p:{'\\_font_size':'12px', background_color:'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p
{
	_font-size: 12px;
	background-color: #fff;
}`
      )
    })

    it('css from camel case', function() {
      var ret = cssobj({p:{'\\_fontSize':'12px', 'background\\Color':'#fff'}})
      expect(ret.css.trim()).deep.equal(
`p
{
	_font-size: 12px;
	backgroundColor: #fff;
}`
      )
    })

    it('css with propSugar off', function() {
      var ret = cssobj({p:{'_fontSize':'12px', 'background\\Color':'#fff'}}, {propSugar:0})
      expect(ret.css.trim()).deep.equal(
`p
{
	_fontSize: 12px;
	background\\Color: #fff;
}`
      )
    })

    it('css with common.css', function() {
      var ret = cssobj({p:{'_fontSize':'12px', 'background\\Color':'#fff'}}, {propSugar:0})
      expect(ret.css.trim()).deep.equal(
`p
{
	_fontSize: 12px;
	background\\Color: #fff;
}`
      )
    })


  })
})
