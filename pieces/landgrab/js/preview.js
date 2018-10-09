// THREE.JS PIECE: Setting up the renderer, scene, camera

  //set up scene
  var width  = document.getElementById('three').getBoundingClientRect().width,
      height = document.getElementById('three').getBoundingClientRect().height;

  var scene = new THREE.Scene();

  //add light
  var light = new THREE.DirectionalLight( 0xffffff, 0.75 );
  light.position.set(300,1600,0);
  light.castShadow = true;
  var dLight = 200;
  var sLight = dLight * 0.25;
  light.shadow.camera.right = sLight;
  light.shadow.camera.top = sLight;
  light.shadow.camera.near = dLight / 30;
  light.shadow.camera.far = dLight;
  light.shadow.mapSize.x = 1024 * 2;
  light.shadow.mapSize.y = 1024 * 2;

  state.light = light
  scene.add(state.light);

  state.world = new THREE.Group();
  state.world.rotation.x =- Math.PI/2;

  scene.add(state.world)

  //axes

  var loader = new THREE.FontLoader();
  state.axes = [];
  loader.load( './helvetiker_regular.typeface.json', function ( font ) {

    state.preview.font = font;
    var geometry = new THREE.TextGeometry( '', {
      font: font,
      size: 8,
      height: 0,
      bevelEnabled: false,
    } );

    for (var i = 0; i < 2; i++){
      var mesh = new THREE.Mesh(geometry, state.textures['solid']);
      mesh.rotation.z = -i* Math.PI/2;
      state.axes.push(mesh);
      state.world.add(mesh);
    }



  // var origin = new THREE.Vector3(50,100,50);
  // var terminus  = new THREE.Vector3(75,75,75);
  // var direction = new THREE.Vector3().subVectors(terminus, origin).normalize();
  // var arrow = new THREE.ArrowHelper(direction, origin, 500, 0xffffff);
  // state.world.add(arrow);
  } );

  //set up renderer
  var renderer = new THREE.WebGLRenderer({alpha:true, antialias:false});
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.getElementById('three')
    .appendChild(renderer.domElement);

  //set up camera
  var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
  camera.position.y = 600;
  camera.position.z = 600;

  var controls = new THREE.OrbitControls(camera, renderer.domElement); 

  render();

  function render() {
    controls.update();
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }


  window.addEventListener( 'resize', onWindowResize, false );

  function onWindowResize() {
      var threeWidth = document.querySelector('#three').offsetWidth;
      camera.aspect = threeWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize( threeWidth, window.innerHeight );
  }

controls.enabled = false;

d3.selectAll('#three canvas')
  .on('mousemove', function(){
    controls.enabled = true
  })
  .on('mouseout', function(){
    controls.enabled = false
  })



// build the actual mesh object with the elevations

function makeMesh(options, cb){

  state.world.remove(state.mesh);
  state.world.remove(state.wall);

  var d = state.output;
  var bottom = d.min - (d.max-d.min)/10

  var geometry = new THREE.PlaneGeometry(d.columns, d.rows, d.columns-1, d.rows-1);

  // deform mesh in Z direction
  var elevs = state.preview.smoothen ? state.smoothened : d.elevations

  for (var i = 0; i < geometry.vertices.length; i++) geometry.vertices[i].z = meterToPx(elevs[i]);

  geometry.computeVertexNormals();
  state.geometry = geometry;

  state.mesh = new THREE.Mesh(geometry, state.textures[state.preview.texture]);
  state.world.add(state.mesh);

  updateDownloadPayload();

  if (options.reset) controls.reset();

  buildWall();
  buildAxes();
  if (cb) cb;

  function mPerPixel(latitude) {
      return Math.abs(
        40075000 * Math.cos(latitude*Math.PI/180) / (Math.pow(2, state.zoom) * state.tileSize )
      );
  }

  function meterToPx(m){
    var avgLat = (state.bbox[0][1]+state.bbox[1][1])/2;
    return (m-d.min) / mPerPixel(avgLat);
  }

  function buildWall(){

    var indices = [];

    //north
    for (var q = 0; q < d.columns-1; q++) indices.push(q);

    // //east
    for (var q = 1; q < d.rows; q++) indices.push(q*(d.columns)-1)

    //south
    for (var q = 0; q < d.columns-1; q++) indices.push(d.rows*d.columns-q-1)

    //west
    for (var q = 1; q < d.rows; q++) indices.push(d.rows*d.columns - q*d.columns)

    indices.push(0)
    indices.reverse();

    //wall

    var wallLength = indices.length;
    var wallGeom = new THREE.PlaneGeometry(wallLength, 2, wallLength-1, 1);
    var wallBottom = meterToPx(bottom);

    for (var p = 0; p<indices.length; p++){

      var q = indices[p]

      wallGeom.vertices[p].x = wallGeom.vertices[p+wallLength].x = state.mesh.geometry.vertices[q].x;
      wallGeom.vertices[p].y = wallGeom.vertices[p+wallLength].y = state.mesh.geometry.vertices[q].y;
      
      wallGeom.vertices[p].z = state.mesh.geometry.vertices[q].z;
      wallGeom.vertices[p + wallLength].z = wallBottom;

    }

    state.wall = new THREE.Mesh(wallGeom, state.textures['solid']);
    state.world.add(state.wall)
  }

  //axes
  function buildAxes(){

    var padding = 60;

    for (var i = 0 ; i < 2; i++){
      var currentMesh = state.axes[i];
      var axis  = [['x', 'y'], ['y', 'x']];
      var side = ['rows', 'columns'];

      var geometry = new THREE.TextGeometry( formatNumber(state.dimensions[i]), {
        font: state.preview.font,
        size: 8,
        height: 0,
        bevelEnabled: false,
      } );

      currentMesh.geometry = geometry;
      currentMesh.geometry.computeBoundingSphere();

      currentMesh.position[axis[i][0]] = currentMesh.geometry.boundingSphere.radius * (2 * i - 1);
      currentMesh.position[axis[i][1]] = - state.output[side[i]]/2 - padding;
    }

  }

};

function formatNumber(num){
  if (num < 1) return (num * 1000).toFixed(0) + ' m'
  else return num.toFixed(2)+ ' km'
}