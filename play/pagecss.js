var pagecss = {
  'html,body': {
    height: ['100%'],
    margin:0,
    padding:0,
    MsOverflowStyle: 'none',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    height: '100%',
    'table-layout': 'fixed'
  },
  '.left':{
    $id:'left',
    float:'left'
  },
  '.right':{
    $id:'right',
    float:'left'
  },
  textarea: {
    $id: 'textarea',
    $order:2,
    width:'100%',
    display: 'block',
    color: 'red',
    margin:0,
    padding:0
  },
  'h3': {
    $id: 'h3',
    $order:1,
    fontSize: 16,
    lineHeight:1.2,
    marginTop: 10,
    marginBottom: 10,
    color: 'green'
  },
  '@media (>800px)':{
    '@keyframes abc':{
      '10%':{
        color: 'blue',
        opacity: .5
      },
      '20%':{
        color: 'red'
      }
    },
    h3:{
      color:'red'
    },
    p:{
      fontSize:16,
      color: ['red','#fcc']
    },
    '@media (<1000px), (>900px)':{
      h3:{
        color:'blue'
      }
    }
  },
  '@media (>1000px)':{
    $id: 'ff',
    h3:{
      color:'grey'
    }
  }
}
