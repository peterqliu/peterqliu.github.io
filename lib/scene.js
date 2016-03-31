
function drawDEM(data, northWest, southEast, radius){
	console.log(data)

	if (firstLoad) {
		firstLoad=false;
		var container;

		var camera, controls, scene, renderer, mesh;
		var shadedSet = [];
		var wireframeSet = [];
		var width = 150;



		camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 10, 1000 );
		camera.position.x = 0;
		camera.position.y = 200;
		camera.position.z = -75;

		controls = new THREE.OrbitControls( camera );

		controls.addEventListener( 'change', render );

		scene = new THREE.Scene();
		// lights

		light = new THREE.DirectionalLight( 0xffffff,2.5 );
		light.position.set(1,1,1);
		scene.add(light);

	    light = new THREE.DirectionalLight( 0xffffff );
	    light.position.set( -1, 0, 0 );
	    scene.add(light);

		// renderer

		renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
		renderer.setSize( window.innerWidth, window.innerHeight );


		container = document.getElementById( 'container' );
		container.appendChild( renderer.domElement );
		render();
	}


	var pixelPerMeter = 150/(radius*Math.pow(2,0.5)*1000)


    //draw shaded DEM from raw coordinates
    function buildSliceGeometry(coords, index) {

		var shadedContour = new THREE.Shape();
		var wireframeContour = [new THREE.Geometry()];

	    //iterate through vertices per shape
	    for (var x=0; x<coords[0].length; x++) {
	        var coord = coords[0][x];
	        var projected=[];

	        //convert latlngs into pixel coordinates
	        projected[0]= 150-(coord[0]-northWest[0])/(southEast[0]-northWest[0])*150
	        projected[1]= ((coord[1]-southEast[1]))/(northWest[1]-southEast[1])*150

	        wireframeContour[0].vertices.push(new THREE.Vector3( projected[0], projected[1], -(data[h].ele-data[0].ele)*pixelPerMeter ))

	        if (x===0) shadedContour.moveTo(projected[0],projected[1])
	        else shadedContour.lineTo(projected[0],projected[1])
	    }


		//carve out holes (if none, would automatically skip this)
		for (var k=1; k<coords.length; k++){

			var holePath = new THREE.Path();
			wireframeContour.push(new THREE.Geometry());

			//iterate through hole path vertices
			for (var j=0; j<coords[k].length; j++) {
				coord=coords[k][j]
		        var projected=[];
		        projected[0]= 150-(coord[0]-northWest[0])/(southEast[0]-northWest[0])*150
		        projected[1]= ((coord[1]-southEast[1]))/(northWest[1]-southEast[1])*150

		        wireframeContour[k].vertices.push(new THREE.Vector3( projected[0], projected[1], -(data[h].ele-data[0].ele)*pixelPerMeter ))

		        if (j===0) holePath.moveTo(projected[0],projected[1])
	        	else holePath.lineTo(projected[0],projected[1])
			}
			shadedContour.holes.push( holePath );
		}

		wireframeContour.forEach(function(loop){

	    	var material = new THREE.LineBasicMaterial({
				color: 0xffffff
			});

			var line = new THREE.Line(wireframeContour[0], material);
			line.position.x = -75;
			line.position.z = -75;
	    	line.rotation.x = Math.PI/2;
	    	line.visible = false;
			wireframeSet.push(line)

			scene.add( line );
		})

	    // set extrude settings
	    var shadedExtrudeSettings = {
	        amount: data[h+1] ? pixelPerMeter*(data[h+1].ele-data[h].ele) : pixelPerMeter*(data[h].ele-data[h-1].ele),
	        bevelEnabled: false
	    };

	    var extrudeShade = new THREE.Mesh(
    		new THREE.ExtrudeGeometry(
    			shadedContour, shadedExtrudeSettings), 
    		new THREE.MeshBasicMaterial({ color: colorRange(index),wireframe:false})
    	);

	    extrudeShade.rotation.x = Math.PI/2;

	    extrudeShade.position.x = -75;
	    extrudeShade.position.y = (-data[0].ele+data[h].ele)*pixelPerMeter;
		extrudeShade.position.z = -75;
		extrudeShade.name=data[index].ele;
		shadedSet.push(extrudeShade)
	    scene.add(extrudeShade);
    }

	var colorRange = d3.scale.linear()
	  .domain([0,data.length])
	  .interpolate(d3.interpolateRgb)
	  .range(["#231918", "#ed6356"])

    //iterate through elevations
    for (var h=0; h<contours.length; h++) {
    	//console.log('iterating contours')
    	var currentLevel=contours[h].geometry.geometry;

    	if (currentLevel.type==='Polygon'){
			buildSliceGeometry(currentLevel.coordinates, h)
    	}

    	if (currentLevel.type==='MultiPolygon'){
	    	//iterate through shapes per elevation
		    for (var i=0; i<currentLevel.coordinates.length; i++) {
			    //console.log('iterating per polygon in multigon')
			    buildSliceGeometry(currentLevel.coordinates[i], h)
			}
    	}

    	if (h==contours.length-1){console.log('drawing complete in '+(Date.now()-prevMilestone)+'ms')}
	}


	d3.select('.toggle')
		.on('click', function(){
			wireframeSet.forEach(function(wireframe){
				wireframe.visible=!wireframe.visible
			})
			shadedSet.forEach(function(shaded){
				shaded.visible=!shaded.visible
			})
			render()
		})

	window.addEventListener( 'resize', onWindowResize, false );


	function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

        render();

	}

	function render() {
	    renderer.render(scene, camera);
	}

	var prevHoveredElement={};

	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();
	document.addEventListener( 'mousemove', onDocumentMouseDown, false );

	//mouseover functionality
	function onDocumentMouseDown( event ) {
		event.preventDefault();

		mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
		raycaster.setFromCamera(mouse,camera);

		var intersects = raycaster.intersectObjects(shadedSet)[0];
		if (!prevHoveredElement.color) prevHoveredElement.color=intersects.object.material.color.getHex()

		//store the color for the previous element, to be restored later
		if (prevHoveredElement.elem) {
			//restore previous element to its original color
			prevHoveredElement.elem.object.material.color
				.setHex(prevHoveredElement.color)

		}

		if (intersects) {

			//store the currently hovered color
			prevHoveredElement.color=
				intersects.object.material.color.getHex()
			intersects.object.material.color.setHex('0xffffff')
			d3.select('.tooltip')
				.classed('hidden', false)
				.attr('style','transform: translateX('+(event.clientX-10)+'px) translateY('+(event.clientY+10)+'px)')
				.select('.elevation')
				.text(intersects.object.name)
		}

		else {
			prevHoveredElement.elem.object.material.color
				.setHex(prevHoveredElement.color)
			d3.select('.tooltip')
				.classed('hidden', true)
		}
		render()
		prevHoveredElement.elem=intersects;

	}

	marker.on('dragend',function(){
		var origin = [marker.getLatLng().lat, marker.getLatLng().lng]
		console.log(origin)

		wireframeSet.forEach(function(wireframe){
			scene.remove(wireframe)
		})
		shadedSet.forEach(function(shaded){
			scene.remove(shaded)
		})
		getBlocks(getBbox(origin, radius))
	});
}
