var pagecss = {
  'html,body': { height: '100%', margin:0, padding:0 },
  'table,textarea': { width: '100%', height: '100%', 'table-layout': 'fixed' },
  textarea: {
    $id: 'textarea',
    display: 'block'
  },
  'h3[title="a,b"]': {
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
      $id:'h3',
      color:'grey'
    }
  }
}
