

map.on('click', function(e){
	var coords = map.unproject(e.point)
	var zoom = Math.floor(map.getZoom())


	var mapId = 'springmeyer.ciqxe645'
	var ret = cover.tiles(	{
	    "type": "Point",
	    "coordinates": [coords.lng, coords.lat]
	}, {
	    min_zoom: 12,
	    max_zoom: 12
	  })[0]
	window.geojson = turf.featurecollection([]);
	window.nodeList = [];

	//keep count of tiles requested
	var tileQueue = 0

	//danpat.osrmdbg-edges

	function getIsochrone(threshold){

		var startingPoint = [originNode]
		travelTimes[originNode] = 0;

		//define extent of the currently available vector data
        var corners = turf.envelope(geojson).geometry.coordinates[0];
        window.currentEnvelope = {
        	minLng:corners[0][0],
        	maxLng:corners[2][0],
        	minLat:corners[0][1],
        	maxLat:corners[2][1]
        }

        //begin unidirectional Dijkstra:
		//given a list of origin nodes, identify subsequent nodes connected to them
		function stepper(origins){

			var nextOrigins = [];

			//iterate through origins
			var toFetch=[];

			//filter out dead ends
			origins = origins.filter(
				function(origin){
					return nodeList[origin]
				}
			)

			// check whether origins are hitting the tile bounds...
			origins.forEach(function(origin){
				var coord = nodeList[origin][0].geometry.coordinates[0];
				var currentTileCoords = cover.tiles({
				    "type": "Point",
				    "coordinates": coord
				}, {min_zoom: 12, max_zoom: 12})[0]
				function addToQueue(deltas){
					if (toFetch.indexOf(coord)===-1) toFetch.push(currentTileCoords)
				}
				if (coord[0]>=currentEnvelope.maxLng) addToQueue([1,0,0])
				if (coord[0]<=currentEnvelope.minLng) addToQueue([-1,0,0])
				if (coord[1]>=currentEnvelope.maxLat) addToQueue([0,-1,0])
				if (coord[1]<=currentEnvelope.minLat) addToQueue([0,1,0])
			})

			// ...if not, go ahead and extend
			if (toFetch.length===0) {
				extendGraph(origins)
			}

			// ...if yes, fetch the adjacent tile(s) before identifying extensions
			else (
				toFetch.forEach(function(trio){
					getTiles(trio, origins)
				})
			)

			function extendGraph(origins){

				origins.forEach(function(origin){

					// time it took to reach the current origin
					var travelTimeSoFar = travelTimes[origin]

					//identify edges radiating from this origin
					var newSteps = nodeList[origin]

					//for each origin, examine all the new nodes it can reach
					newSteps.forEach(function(step){
						var nodeId = step.properties.to_node;
						var proposedTravelTime = step.properties.weight+travelTimeSoFar;

						if (proposedTravelTime<threshold) {

							// add travel time only if
							// 1) threshold not yet reached, and
							// 2) there isn't already a time that's faster than proposed

							if (!travelTimes[nodeId] || proposedTravelTime<travelTimes[nodeId]) {
								travelTimes[nodeId] = proposedTravelTime;
								step.properties.weight = proposedTravelTime
								nextOrigins.push(nodeId)
							}

							// ignore this edge if it's simply the reverse direction of one we've already traversed
							var overlappedWays = traversed.features.filter(function(way){
								return way.properties.from_node === step.properties.to_node &&
									way.properties.to_node === step.properties.from_node
							})

							if (overlappedWays.length===0){
								traversed.features.push(step)
							}
						}
					})

				})

				if (nextOrigins.length>0) {
					window.setTimeout(function(){
				        map.getSource('reachable')
							.setData(traversed)
						stepper(nextOrigins)
					},5)
				}
			}

			function getTiles(coords, origins){
				tileQueue++
				var queryURL='https://a.tiles.mapbox.com/v4/'+mapId+'/'+coords[2]+'/'+coords[0]+'/'+coords[1]+'.vector.pbf?access_token='+mapboxgl.accessToken;
				console.log(coords)
				vt({uri:queryURL,responseType:'arraybuffer'}, function (error, response, buffer) {

					if (buffer){
					    var tile = new VectorTile(new Pbf(buffer));
					    console.log('tile downloaded')

					  	//iterate through items per layer
						for (var i=0; i<tile.layers['upload'].length; i++){
							//push to geojson
							var feature = tile.layers['upload'].feature(i).toGeoJSON(coords[0], coords[1], coords[2]);
							geojson.features.push(feature);

							var featureIndex = feature.properties.from_node;
							if (!nodeList[featureIndex]) {
								nodeList[featureIndex]=[]
							}
							nodeList[featureIndex].push(feature)
						}
					}

					tileQueue--
					//map.style.sources.buffercontent.setData(geojson)
					console.log('tile queue is '+tileQueue)
					if (tileQueue===0){

						//define extent of the currently available vector data
				        var corners = turf.envelope(geojson).geometry.coordinates[0];
				        window.currentEnvelope = {
				        	minLng:corners[0][0],
				        	maxLng:corners[2][0],
				        	minLat:corners[0][1],
				        	maxLat:corners[2][1]
				        }
				        extendGraph(origins)
					}
				})
			}
		}

		stepper(startingPoint)
		console.log('isochrone calculated')
        map.getSource('reachable')
			.setData(traversed)
	}
	var queryURL='https://a.tiles.mapbox.com/v4/'+mapId+'/'+ret[2]+'/'+ret[0]+'/'+ret[1]+'.vector.pbf?access_token='+mapboxgl.accessToken;
	console.log(queryURL)

	vt({uri:queryURL}, function (error, response, buffer) {

		if (error) {
			alert(error)
			return
		};

	    var tile = response;
	    console.log('tile downloaded')
		var pointCloud = turf.featurecollection([]);

	  	//iterate through items per layer
		for (var i=0; i<tile.features.length; i++){
			//push to geojson
			var feature = tile.features[i];
			geojson.features.push(feature);

			var featureIndex = feature.properties.from_node;
			if (!nodeList[featureIndex]) {
				nodeList[featureIndex]=[]

				//add to pointCloud to identify closest node
				var pt = turf.point(feature.geometry.coordinates[0],{from_node:featureIndex})
				pointCloud.features.push(pt)
			}
			nodeList[featureIndex].push(feature)
		}

		console.log('tile decoded: '+tile.features.length+' features')

		//output and render geojson
		//document.querySelector(".geojsonoutput").value = JSON.stringify(geojson)
        //map.style.sources.buffercontent.setData(geojson)


        //draw isochrone

		// find nearest node to requested position
		window.nearestnode = turf.nearest(turf.point([coords.lng, coords.lat]), pointCloud)
		window.originNode = nearestnode.properties.from_node;

		console.log('nearest node identified')

        map.getSource('nearestnode')
        	.setData(nearestnode)

		//featurecollection of traversable road segments within given time
		window.traversed = turf.featurecollection([])

		window.travelTimes = [];

		var cutoff = document.querySelector('.threshold').value*60;

		getIsochrone(cutoff)

	})
})


