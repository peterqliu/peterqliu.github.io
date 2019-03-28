  var state = {
    map: {
      expanded: false,
      drawing: false
    },
    mousedown: null,
    bbox: null,
    sm: new sm({
      size: 512
    }),
    toLoad:null,
    mesh: null,
    zoom: null,
    tileSize: 512,
    preview:{
      texture: 'solid',
      revolve: false,
      scale: 1,
      loading: false,
      smoothen: false
    },
    textures:{
      solid: new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          side: 0
      }),
      wireframe: new THREE.MeshBasicMaterial({
          color: 0xcccccc
      }),
      satellite: null,
      hypsometric: new THREE.MeshBasicMaterial({
          color: 0x0000cc,
          side: 0
      })
    },
    token: mapboxgl.accessToken,
    smoother:new Worker('smoothen.js')
  };

  state.smoother.addEventListener('message', function(e) {
    state.smoothened = e.data;
    console.log('smoothing complete');
    setState('preview', 'smoothenUI', !state.mostCommonStride == 0)
    // d3.select('#smoothen')
    //   .classed('hide-visually', function(){
    //     return state.mostCommonStride == 0
    //   })
  })

  function updateCorners(e){
    var pt = lngLatArray(e.lngLat);

    state.corners = state.mousedown[0] > pt[0] ? [state.mousedown, pt] : [pt, state.mousedown];
    updateRect();
  }

  function makeQuery(){

    setState('preview', 'loading', true);
    setState('preview', 'smoothenUI', false);
    setState('preview', 'smoothen', false);
    identifyTiles(function(d){
      getElevations(d, function(e){
        makeMesh({reset: true}, setState('preview', 'loading', false))
      })
    });

  }

  function identifyTiles(cb){

    //updateRect();

      var polygon =
      {
        type: 'Polygon',
        coordinates:[state.bbox]
      };


      // calculate optimal zoom level to download (so that longer edge is between 1 and 2 tiles across)

      document.location.hash = [
        state.corners[0][0], 
        state.corners[1][0],
        state.corners[1][1], 
        state.corners[0][1]
      ]


      var cornerTiles = state.corners.map(function(corner){
        return cover.tiles({
            type: 'Point',
            coordinates:corner
          },
          {
            min_zoom: 22,
            max_zoom: 22
          }
        )[0]
      })

      var tileExtent = cornerTiles[0].map(function(d,i){
        return d-cornerTiles[1][i]
      })

      state.zoom = Math.floor(22- getBaseLog(2,Math.max.apply(Math, tileExtent))+0.5)
      console.log('zoom is ', state.zoom)


      // identify the tiles needed at the actual desired zoom
      tiles = cover.tiles(
        polygon,
        {
          min_zoom: state.zoom,
          max_zoom: state.zoom
        }
      )

      var bbox = [state.bbox[0][0],state.bbox[2][1], state.bbox[2][0],state.bbox[0][1]];
      var ul = state.sm.px([bbox[0], bbox[3]], state.zoom);
      var lr = state.sm.px([bbox[2], bbox[1]], state.zoom);
      var ultBox = state.sm.bbox(Math.floor(ul[0] / state.tileSize), Math.floor(ul[1] / state.tileSize), state.zoom);
      var urPX = state.sm.px([ultBox[0], ultBox[3]], state.zoom);
      var offsets = [
          ul[0] - urPX[0],
          ul[1] - urPX[1]
      ];

      var ulTile = ul.map(function(px){return Math.floor(px/state.tileSize)});

      // prep canvas and position tiles appropriately for draw
      var canvas = document.getElementById('myCanvas')
      canvas.height = Math.abs(lr[1] - ul[1]);
      canvas.width = Math.abs(lr[0] - ul[0]);
      state.context = canvas.getContext('2d');

      var toLoad = tiles
        .map(function(tile){
          return {
            tile: tile,
            px: (tile[0]-ulTile[0])*state.tileSize - offsets[0],
            py: (tile[1]-ulTile[1])*state.tileSize - offsets[1]
          }
        })

      console.log(toLoad.length, ' tiles to load');
      state.toLoad = toLoad.length;

      //actually download and draw tiles to canvas

      const loadTile = (tile) => {
          var serverIndex = 2*(tile.tile[1]%2)+tile.tile[2]%2;
          var server = ['a','b','c','d'][serverIndex];
          const url = `https://` + server + `.tiles.mapbox.com/v4/mapbox.terrain-rgb/${tile.tile[2]}/${tile.tile[0]}/${tile.tile[1]}@2x.pngraw?access_token=`+state.token
          return fetch(url)
            .then(function(response) {
              return response.blob()
            })
            .then(function(blob) {
              tile.img = URL.createObjectURL(blob);
              return tile
            });
      }

      function drawTile(context, img, px, py) {

        var imageObj = new Image();

        imageObj.onload = () => {
            state.context.drawImage(imageObj, px, py);
            state.toLoad--;
            if (state.toLoad === 0) cb(state.context.getImageData(0, 0, canvas.width, canvas.height));
        }

        imageObj.src = img;
      }

      Promise.all(toLoad.map((t) => {
        return loadTile(t);
      }))
        .then((data) => {
          return Promise.all(data.map((d) => {
              return drawTile(state.context, d.img, d.px, d.py);
          }))
        })
        .catch((err) => {
            console.log(err)
        });
  }




  function lngLatArray(obj){
    return [obj.lng, obj.lat].map(function(num){
      return Math.round(num*1000000)/1000000
    });
  }



  function getSatelliteImage(){

    state.textures.satellite = state.textures.solid
    corners = state.corners;
    state.center = turf.midpoint(
      turf.point(corners[0]), 
      turf.point(corners[1])
    ).geometry.coordinates;
    
    var canBeDoubled = state.output.columns<1280/2 && state.output.rows<1280/2;
    var imgDimensions = canBeDoubled ? [state.output.columns*2, state.output.rows*2] :[state.output.columns, state.output.rows];
    var bumpZoom = canBeDoubled ? 2 : 1

    var url = ('https://api.mapbox.com/v4/mapbox.satellite/'+state.center+','+(state.zoom+bumpZoom)+'/'+imgDimensions.join('x')+'@2x.png?access_token='+state.token)

    var texture = new THREE.TextureLoader()
      .load(
          url,
          function(err, resp){
            state.textures.satellite = new THREE.MeshBasicMaterial({map: texture})
            if (state.preview.texture === 'satellite') {
              setState('preview', 'texture', 'satellite')
            }
          }
      );
  }

  function getHypsometricImage(){

    state.textures.hypsometric = state.textures.solid
    //dimensions and pixel count
    var size = state.output.elevations.length;
    
    var elevGamut = [];

    var elevRange = state.output.max - state.output.min;

    var color = d3.scaleLinear()
      .domain([0, elevRange])
      .interpolate(function() { return d3.interpolateYlGnBu; });


    var imgData=state.context.createImageData(state.output.columns,state.output.rows);
    
    for (var i=0;i<imgData.data.length;i+=4) {
      var rgb = d3.rgb(color(state.output.max-state.output.elevations[i/4]))

      imgData.data[i+0]=rgb.r;
      imgData.data[i+1]=rgb.g;
      imgData.data[i+2]=rgb.b;
      imgData.data[i+3]=255;
    }
    
    state.context.putImageData(imgData,0,0);

    var texture = new THREE.Texture(document.getElementById('myCanvas'));
    texture.needsUpdate = true;

    state.textures.hypsometric = new THREE.MeshBasicMaterial({map: texture})
    if (state.preview.texture === 'hypsometric') setState('preview', 'texture', 'hypsometric')




  }

  //convert ndarray of RGB values into an elevation number
  function getElevations(pixels, cb){

    var cols = pixels.width;
    var rows = pixels.height;
    var channels = 4;

    var min = Infinity;
    var max = -Infinity
    var output = [];

    var upsampledResolution = {};

    for (var r = 0; r < rows; r++){

      var lastElev = null;
      var consecutiveCount = 0;

      for (var c = 0; c < cols; c++){
        var currentPixelIndex = (r*cols+c) * channels;
        var R = pixels.data[currentPixelIndex];
        var G = pixels.data[currentPixelIndex+1];
        var B = pixels.data[currentPixelIndex+2];

        var elev = (R * 256 * 256 + G * 256 + B)/10-10000;
        if (elev<min) min = elev
        if (elev>max) max = elev

        if (elev === lastElev) consecutiveCount++

        else {
          if (upsampledResolution[consecutiveCount]) upsampledResolution[consecutiveCount]++
          else upsampledResolution[consecutiveCount] = 1
          consecutiveCount = 0
        }

        lastElev = elev
        output.push(elev)
      }

    }


    // compute amount to stride by

    // var strideFrequencies = 
    // Object.keys(upsampledResolution)
    //   .map(function(key){
    //     return upsampledResolution[key]
    //   })

    // var highestFrequencyIndex = 
    // strideFrequencies.indexOf(
    //   strideFrequencies
    //     .reduce(
    //       function(highest, num){
    //         return num>highest ? num : highest 
    //       }, 0
    //   )
    // )

    //state.mostCommonStride = parseFloat(Object.keys(upsampledResolution)[highestFrequencyIndex]);    

    state.output = {
      comments: 'Elevation data is presented as a one-dimensional, row-major array. Consecutive points are in the same row west to east, with rows arranged north to south.',
      elevations: output,
      columns: cols,
      rows: rows,
      min: min,
      max: max,
      zoom: state.zoom
    }


    getSatelliteImage();
    getHypsometricImage();
    //if (state.mostCommonStride>0) state.smoother.postMessage({output: state.output, radius: state.mostCommonStride})
    cb();
  }


  function getBaseLog(base, result) {
    return Math.log(result) / Math.log(base);
  }


  function setTexture(texture){

    state.mesh.material = state.textures[texture]

    if (texture === 'wireframe'){
      state.mesh.material.wireframe = true;
    }

  }

  function setState(module, key, value){

    console.log(module, key, value)
    state[module][key] = value;

    switch (key) {

      case 'texture':
        state.mesh.material = state.textures[value]
        state.mesh.material.wireframe = state.wall.material.wireframe = value === 'wireframe'
        break;

      case 'scale':

        state.world.scale.z = value 
        break;

      case 'loading':

        d3.select('.loading')
          .classed('hide-visually', !value);
        break;

      case 'expanded':  

        var currentState = d3.select('#sidebar')
          .classed('expanded');

        setState('map', 'drawing', false);
        toggleInteractivity(!currentState);

        // transition
        d3.select('#sidebar')
          .classed('expanded', function(){
            return !currentState
          });

        if (currentState) fitBounds();   
        break;

      case 'drawing':
        toggleInteractivity(false)
        draw(value)
        break;

      case 'smoothenUI':

        d3.select('#smoothen')
          .classed('hide-visually', function(){
            return !value
          })

        break;          

      case 'smoothen':

        if (value == true) state.output.smoothenedElevations = state.smoothened
        if (!state.preview.loading) {
          setState('preview', 'loading', true)

          window.setTimeout(function(){
            makeMesh({}, setState('preview', 'loading', false))
          }, 10)
        };

        d3.select('#smoothen')
          .selectAll('input')
        .property('checked',function(d,i){
          if (i == value) return true
          else return null
        })
    }

  }
