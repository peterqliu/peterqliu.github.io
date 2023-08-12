function pollBuses(initial){

	app.utils.load('http://restbus.info/api/agencies/sfmuni-sandbox/vehicles', (resp) => {

		if (resp.length === 0) return
		console.log('poll')
		s.lastPollTime = Date.now();


		resp
			.filter(item =>item.directionId)
			.forEach(line=>{
				if (!c.routeData[line.routeId]) {
					c.routeData[line.routeId] = 'pending'
					fetchRouteData(line.routeId)
				}
			})


		s.buses = resp
			.filter(item => item.directionId)
			.map(item => {
				var id = item.directionId;
				item.direction = app.utils.getDirection(id)
				return item
			});

		app.updateModalBar();

		if (initial) {
			if (app.map.loaded()) setupMap()
			else app.map.on('load', () => setupMap())
		}

		else {
			s.animatingBuses = true;
			// s.customLayer.updateBuses();
		}

        s.customLayer.updateBuses();

	})
}

function setupMap(){

	app.map.addSource('buses', {
		'type': 'geojson',
		'data': c.emptyGeojson
	})

	app.map
	.addLayer({
		'id':'buses',
		'type': 'circle',
		'source': 'buses',
		'paint':{
			'circle-radius':20,
			'circle-opacity':0,
			'circle-color':{
				'property': 'direction',
				'type':'categorical',
				'stops':[['IB', c.color.IB], ['OB', c.color.OB]]
			}
		}
	})
	.addLayer({
		'id':'bus_labels',
		'type': 'symbol',
		'source': 'buses',
		'paint':{
			'text-color':'white',
			// 'text-opacity':0
		},
		'layout':{
			'text-field':'{routeId}',
			// 'text-rotate': {
			// 	'type':'identity',
			// 	'property': 'heading'
			// },

			'text-allow-overlap': true
		}
	})
	.addLayer({
		'id': 'route',
		'type':'line',
		'source':{
			'type': 'geojson',
			'data': c.emptyGeojson,
			'lineMetrics': true
		},
		'paint':{
			'line-width': 5
		}
	})
	.addLayer({
		'id': 'stops',
		'type':'circle',
		'source':{
			'type': 'geojson',
			'data': c.emptyGeojson
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
	.addLayer(c.customLayer)

	// console.log('map setup complete')

}


function updateRoute(){

	if (s.activeRoute)  {

		const route = requestRoute(s.activeRoute);

		if (route) {
			
			app.map.getSource('route')
				.setData(route.path)

			app.map.getSource('stops')
				.setData(route.stops)

			s.routeDrawStart = Date.now()
			drawRoute()

		}
	}
}

function drawRoute(){
	
	var now = Date.now();
	var elapsedTime = Math.max(Date.now() - s.routeDrawStart,1);
	var direction = s.activeRoute[1]

	var color = c.color[direction];
	var transparentColor = color.replace(', 1)', ', 0)')

	var style;

	if (elapsedTime <= c.animationDuration){

		style = [
	        'interpolate',
	        ['linear'],
	        ['line-progress'],
	        0, color,
	        elapsedTime/c.animationDuration, color,
	        elapsedTime/(c.animationDuration-1), transparentColor
	    ]

	    requestAnimationFrame(()=>drawRoute(direction))
	}

	else {
		style = [
	        'interpolate',
	        ['linear'],
	        ['line-progress'],
	        0, color,
	        1, color
	    ]
	}

	app.map.setPaintProperty('route', 'line-gradient', style)
}

// retrieves route from constants (can be abstracted away)
function requestRoute(routeObj, cb){

	// routeObj is [line, generic direction, specific direction]
	const route = c.routeData[routeObj[0]]
	const direction = routeObj[1];

	if (!route) {
		console.log('not yet downloaded')
		return false
	}

	else {

		// fall back to generic IB/OB if specific direction not found
		var routeDirection = route[routeObj[2]] || route[direction];
		return routeDirection
	}


}

//API call to populate route data
const fetchRouteData = (routeId, cb) => {


	app.utils.load('http://restbus.info/api/agencies/sfmuni-sandbox/routes/'+routeId, (resp) => {
		
		var output = {title: resp.title}
		// per direction, reconstruct route from stops
		resp.directions.forEach(routeDirection => {

	        var whitelist = {}
	        resp.stops.forEach(stop=>{
	        	whitelist[stop.id] = stop
	        })
	        // .map(stop=>stop.id);

	        var stops = routeDirection.stops
				.filter(stop => whitelist[stop]) // keep only stops that are in the general list
				.map(stop => {
					return {
						"type": "Feature",
						"properties": {
							name: whitelist[stop].title, 
							id: whitelist[stop].id,
							routeId: routeId,
							direction: app.utils.getDirection(routeDirection.id)
						},
						"geometry": {
							"type": "Point",
							"coordinates": [whitelist[stop].lon, whitelist[stop].lat]
						}
					}
				})

	        var path = stops.map(stop =>stop.geometry.coordinates);
	        const bounds = resp.bounds;

			output[routeDirection.id] = {
				title: routeDirection.title,
				bounds: [
					[bounds.sw.lon, bounds.sw.lat],
					[bounds.ne.lon, bounds.ne.lat]
				],
				path: {
					"type": "Feature",
					"properties": {direction:app.utils.getDirection(routeDirection.id)},
					"geometry": {
					"type": "LineString",
					"coordinates": path
					}
				},
				stops: {
					"type": "FeatureCollection",
					"features":stops
				}
			}

			// add fallbacks
			if (routeDirection.id.includes('I_')) output.IB = output[routeDirection.id]
			else output.OB = output[routeDirection.id]
		})

		c.routeData[routeId] = output;

	})
	
}
