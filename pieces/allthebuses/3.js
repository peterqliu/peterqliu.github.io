
var THREE = window.THREE;


map.on('style.load', function() {
    map.addLayer({
	    id: 'custom_layer',
	    type: 'custom',
	    onAdd: function(map, gl){onAdd(map, gl)},
	    render: function(gl, matrix){render(gl, matrix)}
	});
});


function onAdd(map, gl) {

    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();

    //light
    var directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(0, -70, 100).normalize();
    this.scene.add(directionalLight);
    var directionalLight2 = new THREE.DirectionalLight(0xffffff);
    directionalLight2.position.set(0, 70, 100).normalize();
    this.scene.add(directionalLight2);
    

    var loader = new THREE.GLTFLoader();
    loader.load('34M_17.gltf', (function (gltf) {
        this.scene.add(gltf.scene);
    }).bind(this));


    this.map = map;
    this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl
    });
    this.renderer.autoClear = false;
}

function render(gl, matrix) {

	var transform = three.project([-122.437, 37.78])
    var rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), transform.rotateX);
    var rotationY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), transform.rotateY);
    var rotationZ = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), transform.rotateZ);
    
    var m = new THREE.Matrix4().fromArray(matrix);
    var l = new THREE.Matrix4().makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
        .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

    this.camera.projectionMatrix.elements = matrix;
    this.camera.projectionMatrix = m.multiply(l);
    this.renderer.state.reset();
    this.renderer.render(this.scene, this.camera);
    this.map.triggerRepaint();
}

// converts from WGS84 Longitude, Latitude into a unit vector anchor at the top left as needed for GL JS custom layers

var three = {

	project: function (lnglat){

		var translate = this.fromLL(lnglat);

		var transform = {
		    translateX: translate[0],
		    translateY: translate[1],
		    translateZ: 0,
		    rotateX: Math.PI / 2,
		    rotateY: 0,
		    rotateZ: 0,
		    scale: 5.41843220338983e-7
		}

		return transform
	},

	fromLL: function ([lon,lat]) {
	    // derived from https://gist.github.com/springmeyer/871897
	    var extent = 20037508.34;
	    var x = lon * extent / 180;
	    var y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
	    y = y * extent / 180;
	    return [(x + extent) / (2 * extent), 1 - ((y + extent) / (2 * extent))];
	}
}
