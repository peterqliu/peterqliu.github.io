  mapboxgl.accessToken = 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImpvZmV0UEEifQ._D4bRmVcGfJvo1wjuOpA1g';
  var map = new mapboxgl.Map({
      hash: false,
      zoom: 12,
      maxZoom: 18,
      container: 'map',
      style: 'mapbox://styles/mapbox/outdoors-v9',
      center: [-112.5152,36.3682]
  });

  var emptyGeojson = {type:'FeatureCollection', features:[]};

  map.on('load', function () {


    map
    .addSource('drawn', {
      type: 'geojson',
      data: emptyGeojson
    });

    map
    .addLayer({
      'id':'whiteout',
      'type':'background',
      'layout':{
        'visibility': 'none'
      },
      'paint':{
        'background-color': 'white',
        'background-opacity':0
      }
    })
    .addLayer({
      'id':'drawn_polygon', 
      'type':'fill',
      'source':'drawn',
      'paint':{
        'fill-color':'#448ee4',
        'fill-opacity':0.5
      },
    })
    .addLayer({
      'id':'corners', 
      'type':'circle',
      'source':'drawn',
      'layout':{
        'visibility': 'none'
      },
      'paint':{
        'circle-color':'#448ee4',
        'circle-radius':3,
        'circle-stroke-color': 'white',
        'circle-stroke-width':2
      },
    })

    if (window.location.hash){

      var array = window.location.hash
        .replace('#', '')
        .split(',')
        .map(function(str){
          return parseFloat(str)
        })

      state.corners = [
        [array[0], array[3]], 
        [array[1], array[2]]
      ];

      updateRect();
      
      makeQuery();
      //identifyTiles();
      fitBounds();
      toggleInteractivity(false)
    }

    else setState('map', 'expanded', true)

  })


  // mbx map draw logic
  function draw(bool){

    d3.select('.mapboxgl-canvas')
      .classed('drawing', bool);

    if (bool === true) applyDrawListeners()


    else {
      map
        .setLayoutProperty('corners', 'visibility', 'none')
        .setLayoutProperty('whiteout', 'visibility', 'none')

      map.off('mousemove', updateCorners);

      d3.select('#sidebar')
        .classed('expanded', false);
    }


    function applyDrawListeners(){

      map
        .setLayoutProperty('corners', 'visibility', 'visible')
        .setLayoutProperty('whiteout', 'visibility', 'visible')
        .getSource('drawn')
          .setData(emptyGeojson);

      map.once('mousedown', function(e){
        state.mousedown = lngLatArray(e.lngLat);

        map.on('mousemove', updateCorners)

        map.once('mouseup', function(){

          // check if requested area is big enough
          if (state.validQuery){
            setState('map','expanded', false)
            makeQuery();
            //setState('preview', 'smoothen', false);
          }

          // if not, try again
          else {
            map.off('mousemove', updateCorners);
            applyDrawListeners()
          }
        })
      })  
    }   
      
  }


  function fitBounds(){
    map.fitBounds(
      [
        state.bbox[3],
        state.bbox[1]
      ],
      {
        padding:window.innerWidth/10,
        duration:100
      }
    )
  }

  function toggleInteractivity(bool){
    if(bool){
      map.dragPan.enable();
      map.dragRotate.enable();
      map.scrollZoom.enable();      
    }

    else {
      map.dragPan.disable();
      map.dragRotate.disable();
      map.scrollZoom.disable();      
    }
  }

  function updateRect(pt){

    //make sure bbox pts are clockwise, starting in NW corner
    state.bbox = 
    [state.corners[1],
      [state.corners[0][0], state.corners[1][1]],
      state.corners[0],
      [state.corners[1][0], state.corners[0][1]],
      state.corners[1]
    ]

    state.dimensions = [
      turf.distance(turf.point(state.bbox[0]),turf.point(state.bbox[1]),{'units': 'kilometers'}),
      turf.distance(turf.point(state.bbox[1]),turf.point(state.bbox[2]),{'units': 'kilometers'})      
    ]

    var valid = state.dimensions.filter(function(edge){return edge>0.5}).length === 2
        
    map.getSource('drawn')
      .setData(
        {type: 'Polygon',
          coordinates:[
            state.bbox
          ]
        }
      )

    if (valid !== state.validQuery){
      var color = {true: '#448ee4', false:'red'}
      map
        .setPaintProperty('drawn_polygon', 'fill-color', color[valid])
      state.validQuery = valid
    }

  }