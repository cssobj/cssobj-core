var pagecss = {
  'html, body': {
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
    overflow: 'hidden',
    float:'left'
  },
  '.right':{
    $id:'right',
    overflow: 'hidden',
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
  '@media (min-width: 800px)':{
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
    '@media (max-width: 1000px), (max-width: 900px)':{
      h3:{
        color:'blue'
      },
      hr:{color:'red'}
    }
  },
  '@media (max-width: 800px)':{
    $id: 'ff',
    'body h3':{
      color:'purple'
    }
  }
}
