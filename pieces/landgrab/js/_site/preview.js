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
  light.shadow.camera.left = -sLight;
  light.shadow.camera.right = sLight;
  light.shadow.camera.top = sLight;
  light.shadow.camera.bottom = -sLight;
  light.shadow.camera.near = dLight / 30;
  light.shadow.camera.far = dLight;
  light.shadow.mapSize.x = 1024 * 2;
  light.shadow.mapSize.y = 1024 * 2;

  state.light = light
  scene.add(state.light);

  state.world = new THREE.Group();
  state.world.rotation.x =- Math.PI/2;

  scene.add(state.world)

  //labels

  var loader = new THREE.FontLoader();

  loader.load( '../helvetiker_regular.typeface.json', function ( font ) {

    var geometry = new THREE.TextGeometry( '234 km', {
      font: font,
      size: 8,
      height: 0,
      bevelEnabled: false,
    } );

    state.text = new THREE.Mesh(geometry, state.textures['solid']);
    state.world.add(state.text)


  //     var origin = new THREE.Vector3(50,100,50);
  // var terminus  = new THREE.Vector3(75,75,75);
  // var direction = new THREE.Vector3().subVectors(terminus, origin).normalize();
  // var arrow = new THREE.ArrowHelper(direction, origin, 500, 0xffffff);
  // state.world.add(arrow);
  } );

  //set up renderer
  var renderer = new THREE.WebGLRenderer({alpha:true, antialias:false});
  renderer.setSize(width, height)

  document.getElementById('three')
    .appendChild(renderer.domElement);

  //set up camera
  var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
  camera.position.y = 600;
  camera.position.z = 600;

  var controls = new THREE.OrbitControls(camera); 

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

function makeMesh(){

  var d = state.output;
  var bottom = d.min-(d.max-d.min)/10

  var geometry = new THREE.PlaneGeometry(d.columns, d.rows, d.columns-1, d.rows-1);

  // deform mesh in Z direction

  for (var i = 0; i < geometry.vertices.length; i++) {
    geometry.vertices[i].z = meterToPx(d.elevations[i]);
  }

  geometry.computeVertexNormals();
  state.geometry = geometry;

  state.mesh = new THREE.Mesh(geometry, state.textures[state.preview.texture]);
  state.world.add(state.mesh);

  setState('preview','loading', false);
  updateDownloadPayload();

  function mPerPixel(latitude) {
      return Math.abs(
        40075000 * Math.cos(latitude*Math.PI/180) / (Math.pow(2, state.zoom) * state.tileSize )
      );
  }

  function meterToPx(m){
    var avgLat = (state.bbox[0][1]+state.bbox[1][1])/2;
    return (m-d.min) / mPerPixel(avgLat);
  }

  controls.reset();

  var indices = [];

  //north
  for (var q = 0; q<d.columns-1; q++){
    indices.push(q);
  }

  // //east
  for (var q = 1; q<d.rows; q++){
    indices.push(q*(d.columns)-1)
  }

  //south
  for (var q = 0; q<d.columns-1; q++){
    indices.push(d.rows*d.columns-q-1)
  }

  //west
  for (var q = 1; q<d.rows; q++){
    indices.push(d.rows*d.columns - q*d.columns)
  }

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
    wallGeom.vertices[p+wallLength].z = wallBottom
  }

  state.wall = new THREE.Mesh(wallGeom, state.textures['solid']);
  state.world.add(state.wall)

  var padding = 30;
  state.text.geometry.computeBoundingSphere();
  state.text.position.x = -state.text.geometry.boundingSphere.radius
  state.text.position.y = -state.output.rows/2-padding;

};