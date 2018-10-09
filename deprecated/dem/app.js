var VectorTile = require('vector-tile').VectorTile;
var Pbf = require('pbf');
var xhr = require('xhr');
var zlib = require('zlib');
var cover = require('tile-cover');
var uniq = require('uniq');
var gh= require('greiner-hormann');

L.mapbox.accessToken = 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImpvZmV0UEEifQ._D4bRmVcGfJvo1wjuOpA1g';

var origin =[36.2058,-112.4413];
var radius = 5;
var maxArea= radius*radius*2*1000000;

window.map = L.mapbox.map('map', 'mapbox.outdoors')
    .setView(origin, 14);
var hash = L.hash(map);
window.marker= L.marker(origin, {draggable:true})
	.addTo(map);
window.firstLoad=true;

function drawHistogram(areas){
	d3.selectAll('.histogram .bar')
		.remove();

	d3.select('.histogram')
		.selectAll('.bar')
		.data(areas.reverse())
		.enter()
		.append('div')
			.attr('class', 'bar')
			.attr('actualArea', function(d){return d})
			.style('width', function(d,i){return 250*d/maxArea+'px'})
			.style('height', 250/areas.length+'px')
}
function drawRain(position){
	var queryURL = 'http://api.tiles.mapbox.com/v4/surface/dnomadb.climate-1.json?access_token='+L.mapbox.accessToken
		+'&fields=f0%2Cf1%2Cf2%2Cf3%2Cf4%2Cf5%2Cf6%2Cf7%2Cf8%2Cf9%2Cf10%2Cf11%2Cf12%2Cf13%2Cf14%2Cf15%2Cf16%2Cf17%2Cf18%2Cf19%2Cf20%2Cf21%2Cf22%2Cf23%2Cf24%2Cf25%2Cf26%2Cf27%2Cf28%2Cf29%2Cf30%2Cf31%2Cf32%2Cf33%2Cf34%2Cf35%2Cf36%2Cf37%2Cf38%2Cf39%2Cf40%2Cf41%2Cf42%2Cf43%2Cf44%2Cf45%2Cf46%2Cf47&layer=climate1&points='+position[1]+'%2C'+ position[0]

	d3.json(queryURL, function(err, data){
		var precipData=[];
		var tempData=[];
		for (var i=3; i<48; i+=4){
			var precipVar='f'+i
			precipData.push(data.results[0][precipVar])
		}


		var rainPath = d3.svg.line()
		    .x(function(d,i) { return i*300/12 })
		    .y(function(d,i) { return precipData[i] })
		    .interpolate('basis');

		d3.select('.precipitation')
			.append('path')
			.datum(precipData)
			.attr('d', rainPath)


	})
}
function getBbox(origin, radius){
	window.northWest= turf.destination(turf.point(reverseCoords(origin)), radius, -45, 'kilometers').geometry.coordinates
	window.southEast= turf.destination(turf.point(reverseCoords(origin)), radius, 135, 'kilometers').geometry.coordinates

	window.testPolygon=
	{
	  "type": "FeatureCollection",
	  "features": [
	    {
	      "type": "Feature",
	      "properties": {},
	      "geometry": {
	        "type": "Polygon",
	        "coordinates": [
	          [
	          ]
	        ]
	      }
	    }
	  ]
	}

	testPolygon.features[0].geometry.coordinates[0]=[northWest, [southEast[0],northWest[1]], southEast, [northWest[0], southEast[1]], northWest]
	return testPolygon.features[0]
}

window.prevMilestone=Date.now()

window.contours=[];

// given the isochrone polygon, identify the relevant tiles (via tile-cover), request those tile pbfs, translate into geoJSONs
function getBlocks(polygon){

	var limits = {
	    min_zoom: 14,
	    max_zoom: 14
	  }

	// identify tiles
	var tilesCovered = cover.tiles(polygon.geometry, limits)
	console.log('about to download '+tilesCovered.length+' tiles')

	var geojson={"type":"FeatureCollection","features":[]};
	var queryCount = 0;
	var bottomTiles=[];
	console.log()
	//for each tile triplet (identified as z-x-y), download corresponding PBF and convert to geoJSON
	tilesCovered.forEach(function(zoompos){
		console.log('DOWNLOADING TILE')
		var queryURL='https://a.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v2/'+zoompos[2]+'/'+zoompos[0]+'/'+zoompos[1]+'.vector.pbf?access_token='+L.mapbox.accessToken;
		xhr({uri:queryURL,responseType:'arraybuffer'}, function (error, response, buffer) {

			queryCount++
			if (error) {
				alert(error)
				return
			};

		    var tile = new VectorTile(new Pbf(buffer));
			//populate geoJSON
			for (var i=0; i<tile.layers.contour.length; i++){
				//convert each feature (within #population) into a geoJSON polygon, and push it into our variable
				var feature = tile.layers.contour.feature(i).toGeoJSON(zoompos[0], zoompos[1], zoompos[2]);
				if (i===0) bottomTiles.push(feature)

				//break multigons into multiple polygons
				if (feature.geometry.type==='MultiPolygon'){
					feature.geometry.coordinates.forEach(function(polygon){
						var feat={
							'type':'Feature',
							'properties': {'ele': feature.properties.ele},
							'geometry': {'type':'Polygon','coordinates': polygon}
						}
						geojson.features.push(feat)
					})
				}

				//single polygons can be pushed in as-is
				else {geojson.features.push(feature)}
			}

			//ONCE all tiles have been downloaded, get a list of all elevations used

			if(queryCount===tilesCovered.length) {

				console.log('finished downloading in '+(Date.now()-prevMilestone)+'ms')

				prevMilestone=Date.now();

				var eleList = uniq(
					geojson.features.map(
						function(feature){
							return feature.properties.ele
						})
					)
					.sort(function(a,b){return a-b});


				bottomTiles.forEach(function(bottom){
					var tileBottomEle=bottom.properties.ele;

					for (var k=eleList[0]; k<tileBottomEle; k+=10){
						var toInsert={type:"Feature", geometry: bottom.geometry, properties:{ele: k}};
						geojson.features.push(toInsert)
					}
				})

				//iterate through elevations, and merge polys of the same elevation
				for (var x=0; x<eleList.length; x++){

					var currentElevation=eleList[x]
					var elevationPolys = 
						geojson.features.filter(function(feature){return feature.properties.ele === currentElevation})

					if (currentElevation===1220) console.log(elevationPolys)

					//merge between tiles
					try {



						//var mergedElevationPoly = tbuffer(turf.featurecollection(elevationPolys),0, 'miles').features[0]
						var mergedElevationPoly = turf.merge(turf.featurecollection(elevationPolys))
						// trim to desired search area
						mergedElevationPoly = turf.intersect(testPolygon.features[0], mergedElevationPoly)

						if (mergedElevationPoly) {
							var contourArea = turf.area(mergedElevationPoly.geometry);
							L.mapbox.featureLayer().setGeoJSON(mergedElevationPoly).addTo(map)

							contours.push({
								'geometry':mergedElevationPoly,
								'ele':currentElevation,
								'area': contourArea
							})
						}
					}

					//on merge fail, insert the previous contour again and skip
					catch(error) {
						console.log('merge failed at elevation '+currentElevation)
						console.log(error.message)
					}

					//ONCE merging finished, draw the DEM
					if (x === eleList.length-1) {

						console.log('merge operation took '+(Date.now()-prevMilestone)+'ms')
						prevMilestone=Date.now()

						//remove contour undercuts
						for (var m=contours.length-2; m>=0; m--){
							var currContour= contours[m]
							var prevContour= contours[m+1]
							if (currContour.area>= maxArea && prevContour.area>=maxArea){
								console.log('max area reached!')
								contours=contours.slice(m+1)
								break
							}
						}

						drawHistogram(contours.map(function(contour){return contour.area}))
						drawRain(origin)
						drawDEM(contours, northWest,southEast,radius)
					}
				}
			}
		})
	})
}


function drawDEM(data, northWest, southEast, radius){
	console.log(data.map(function(entry){
		return entry.geometry.geometry.type
	}))
	window.scene;
	window.camera;
	window.controls;
	window.renderer;

	if (firstLoad) {
		firstLoad=false;
		var container;

		var mesh;
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
	var shadedSet = [];
	var wireframeSet = [];
	var mergedShaded = THREE.Geometry();
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

		wireframeContour.forEach(function(loop,index){
	    	var material = new THREE.LineBasicMaterial({
				color: 0xcccccc
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
	    var extrudeGeom = new THREE.ExtrudeGeometry(
    		shadedContour, shadedExtrudeSettings);

	    var extrudeShade = new THREE.Mesh(
    		extrudeGeom, 
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
    
    for (var h=0; h<data.length; h++) {
    	var currentLevel=data[h].geometry.geometry;

    	if (currentLevel.type==='Polygon'){
			buildSliceGeometry(currentLevel.coordinates, h)
    	}

    	if (currentLevel.type==='MultiPolygon'){
	    	//iterate through shapes per elevation
		    for (var i=0; i<currentLevel.coordinates.length; i++) {
			    buildSliceGeometry(currentLevel.coordinates[i], h)
			}
    	}

    	if (h==data.length-1){
    		console.log('drawing complete in '+(Date.now()-prevMilestone)+'ms')
    	}
	}

	console.log('rendering scene')

	// define viewport toggle functionality
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
		origin = [marker.getLatLng().lat, marker.getLatLng().lng]
		console.log(origin)

		wireframeSet.forEach(function(wireframe){
			scene.remove(wireframe)
		})
		shadedSet.forEach(function(shaded){
			scene.remove(shaded)
		})
		render();
		console.log(scene)
		console.log('gward')
		getBlocks(getBbox(origin, radius))
	});
	render()
}




//HELPER FUNCTIONS
function numberWithCommas(x) {
    x = x.toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x))
        x = x.replace(pattern, "$1,$2");
    return x;
}

function reverseCoords(coords) {return [coords[1],coords[0]]}

function getMin(array){
	return Math.min.apply(null,Object.keys(array))
}

function getMax(array){
	return Math.max.apply(null,Object.keys(array))
}




getBlocks(getBbox(origin,radius))
console.log(gh)