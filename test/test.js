var sinon = require('sinon')
var expect = require('chai').expect
var mockery = require('mockery')
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
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false
    })
    var mockRandom = sinon.stub(Math, 'random').returns(0.6273744097697385)
    mockery.registerMock('../lib/cssobj.js', mockRandom)
    cssobj = require('../lib/cssobj.js')
  })
  describe('test with sample 01', function() {
    it('should return right css from object', function() {
      console.log(Math.random()) // here failed to mock Math.random()
      var ret = cssobj(obj01)
      expect(ret.css).equal(css01)
    })
  })
})
