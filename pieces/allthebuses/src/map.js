
function setupMap(){

	const {emptyGeojson, customLayer} = c;

	app.map
		.addLayer({
			'id': 'route',
			'type':'line',
			'source':{
				'type': 'geojson',
				'data': emptyGeojson,
				'lineMetrics': true
			},
			'paint':{
				'line-width': 5,
				'line-color': 'rgba(255,255,255,0)'
			}
		})
		.addLayer({
			'id': 'stops',
			'type':'circle',
			'source':{
				'type': 'geojson',
				'data': emptyGeojson
			},
			'paint':{
				'circle-stroke-color': {
					'property': 'direction',
					'type':'categorical',
					'stops':[['IB', '#aa3345'], ['OB', '#41a6b2']]
				},
				'circle-color':'#fff',
				'circle-radius':0,
				'circle-stroke-width': 0
			}
		})	
		.addLayer(customLayer)

	console.log('map setup complete')

}


function updateRoute(){

	if (s.activeRoute)  {

		const {path, stops} = s.activeRouteGeometry;
		// console.log(turf.bezierSpline(path))
		app.map.getSource('route')
			.setData(path)

		app.map.getSource('stops')
			.setData(stops)

		s.routeDrawStart = Date.now()
		drawRoute()

		
	}
}

function drawRoute(){
	
	const {routeDrawStart, activeRoute:[first, direction]} = s;
	var now = Date.now();
	var elapsedTime = now - routeDrawStart;

	const {animationDuration} = c;
	var color = c.color[direction];
	var style;

	if (elapsedTime <= animationDuration){

		const progress = elapsedTime/animationDuration;
		style = [
	        'interpolate',
	        ['linear'],
	        ['line-progress'],
	        progress, color,
	        Math.min(1, progress+0.00001), `rgba(255,255,255,0)`
	    ]
	    requestAnimationFrame(()=>drawRoute())
	}

	else style = color

	app.map.setPaintProperty('route', 'line-gradient', style)
}


// API call to populate route data
const fetchRouteData = (routeId, cb) => {

	app.utils.load('routes/'+routeId, (resp) => {
		// console.log(resp)
		const {title, description, directions, stops} = resp;
		var output = {title, description};

		// per direction, reconstruct route from stops
		directions.forEach(routeDirection => {

			const {id, name} = routeDirection;
	        var whitelist = {};

	        resp.stops.forEach(stop=>{
	        	whitelist[stop.id] = stop
	        })
			

	        var stops = routeDirection.stops
				// .filter(stop => whitelist[stop]) // keep only stops that are in the general list
				.map(stop => {
					const {name, id, lon, lat} = whitelist[stop];
					return {
						"type": "Feature",
						"properties": {
							name, 
							id,
							routeId,
							direction: app.utils.getDirection(routeDirection.id)
						},
						"geometry": {
							"type": "Point",
							"coordinates": [lon, lat]
						}
					}
				})

			app.format.sameStreetSecond(
				stops, 
				s=>s.properties.name, 
				(s, formatted) => {s.properties.name = formatted; return s}
			);

	        var path = stops.map(stop =>stop.geometry.coordinates);
	        const {boundingBox:{latMin, latMax, lonMin, lonMax}, paths} = resp;

			paths.forEach(({id, points})=>c.pathData[id]=points.map(({lat, lon})=>([lon, lat])));

			let temporaryDistanceTracker = 0;
				
			output[id] = {
				title: name,
				bounds: [
					[lonMin, latMin],
					[lonMax, latMax]
				],
				path: {
					"type": "Feature",
					"properties": {direction:app.utils.getDirection(id)},
					"geometry": {
					"type": "LineString",
					"coordinates": path
					}
				},
				stops: {
					"type": "FeatureCollection",
					"features":stops
				},

				stopDistances: path
					.map((stop, index)=>{
						const segmentLength = app.ruler.distance(path[index-1] || path[0], path[index]);
						temporaryDistanceTracker+=segmentLength;
						return temporaryDistanceTracker
					})
					.map(d=>d/temporaryDistanceTracker)
			}

		})

		c.routeData[routeId] = output;

	})
	
}
