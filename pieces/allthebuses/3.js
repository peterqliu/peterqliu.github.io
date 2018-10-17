
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

    three.camera = new THREE.Camera();
    three.scene = new THREE.Scene();

    // initialize geometry and material of our cube object
    var geometry = new THREE.BoxGeometry(20, 20, 20);

    var redMaterial = new THREE.MeshPhongMaterial( {color: 0xffaaaa, side: THREE.DoubleSide});

    cube = new THREE.Mesh(geometry, redMaterial);
    cube.userData.name = "Red cube";

    three.scene.add(cube);



    //this.map = map;
    this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl
    });

    this.renderer.autoClear = false;
}

// update camera
function render(gl, matrix) {

	var transform = three.project(s.center)
    var rotationX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), transform.rotateX);
    var rotationY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), transform.rotateY);
    var rotationZ = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), transform.rotateZ);
    
    var m = new THREE.Matrix4()
    	.fromArray(matrix);

    var l = new THREE.Matrix4()
    	.makeTranslation(transform.translateX, transform.translateY, transform.translateZ)
        .scale(new THREE.Vector3(transform.scale, -transform.scale, transform.scale))
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

    three.camera.projectionMatrix.elements = matrix;
    three.camera.projectionMatrix = m.multiply(l);
    this.renderer.state.reset();
    this.renderer.render(three.scene, three.camera);
    this.map.triggerRepaint();
}

// converts from WGS84 Longitude, Latitude into a unit vector anchor at the top left as needed for GL JS custom layers

var three = {

	// takes lnglat and provides transform object
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
	},

	lnglatToScene: function(lnglat){

	}
}

var marker = {

    // make label mesh
    label: function(text, randomZIndex){

        var textSize, labelMesh;

        switch (text.length) {
            case 3 :
                textSize = 1.2;
                break;
            case 4 :
                textSize = 0.8;
                break;
            case 5 :
                textSize = 0.6;
                break;
            case 6 :
                textSize = 0.4;
                break;
            default:
                textSize = 1.6;
                break;
        }

        var markerLabel = new THREE.TextGeometry(text, {
            font: this.font,
            size: textSize,
            height: 0,
            style:'normal'
        })

        // markerLabel.center();

        var labelMaterial = new THREE.MeshBasicMaterial({color:'#FfFef9'})
        labelMesh = new THREE.Mesh(markerLabel, labelMaterial)
        labelMesh.scale.x = setMarkerState().labelScale
        labelMesh.position.z = randomZIndex+1

        
        return labelMesh

    },

    shape: function(data, randomZIndex){

        var radius = 25

        var shape = new THREE.Shape();
        shape.moveTo(0, radius)
        shape.arc(
            0,
            radius, 
            radius, 
            0, 
            1.5*Math.PI, 
            false
        )
        shape.lineTo(radius, radius)
        shape.lineTo(0, radius)

        markerGeometry = new THREE.ShapeGeometry(shape);

        var markerMesh = new THREE.Mesh(markerGeometry, 
            new THREE.MeshBasicMaterial({
                color: '#'+getColor(data.directionId),
                wireframe: false,
                transparent: true,
                opacity: 0.7
            })
        )

        markerMesh.position.z= randomZIndex
        markerMesh.rotation.z= toRadians(data.heading)

        return markerMesh        
    },

    build: function(data){

        //convert latlng to pixel coordinates
        var pixelCoords= projectMarkers([data.lon, data.lat])
        var randomZIndex = 0//Math.round(Math.random()*10000)


        var group = new THREE.Group()
        group.add(this.label(data.routeId, randomZIndex));
        group.add(this.shape(data, randomZIndex));

        group.position.set(pixelCoords[0],-pixelCoords[1],0)
        group.busData = data

        group.scale.x=setMarkerState().groupScale;
        group.scale.y=setMarkerState().groupScale;
        buses.push(group);

        threebox.addAtCoordinate(group, [data.lon, data.lat])
        //scene.add(group);
    }
}