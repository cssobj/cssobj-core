var pagecss = {
  'html,body': {
    height: '100%',
    margin:0,
    padding:0
  },
  table: {
    width: '100%',
    height: '100%',
    'table-layout': 'fixed'
  },
  textarea: {
    $id: 'textarea',
    display: 'block',
    margin:0,
    padding:0
  },
  'h3': {
    $id: 'h3',
    fontSize: 16,
    lineHeight:1.2,
    margin_top: 10,
    margin_bottom: 10,
    color: 'green'
  },
  '@media (>800px)':{
    h3:{
      color:'red'
    },
    '@media (<1000px)':{
      h3:{
        color:'blue'
      }
    }
  },
  '@media (>1000px)':{
    h3:{
      color:'grey'
    }
  }
}
