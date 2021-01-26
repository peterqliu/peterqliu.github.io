

app.map.on('load', function(){
	
	setupMap()

	setInterval(function(){pollBuses()}, 5000)
	pollBuses(true)
})


function pollBuses(initial){

	d3.json('http://restbus.info/api/agencies/sf-muni/vehicles', (err,resp) => {

		if (resp.length === 0) return
		console.log('poll')
		s.lastPollTime = Date.now();
		if (!initial) s.animatingBuses = true;
		else document.querySelector('#loader').style.display = 'none'
		resp
			.filter(item =>item.directionId)
			.forEach(line=>{
				if (!c.routeData[line.routeId]) fetchRouteData(line.routeId)
			})


		s.buses = resp
			.filter(item => item.directionId)
			.map(item => {
				var id = item.directionId;
				item.direction = app.utils.getDirection(id)
				return item
			});

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
	.addLayer(customLayer)

}


function updateRoute(){

	if (s.activeRoute)  {
		var routeObj = s.activeRoute
		requestRoute(routeObj, function(resp){

			app.map.getSource('route')
				.setData(resp.path)

			app.map.getSource('stops')
				.setData(resp.stops)

			s.routeDrawStart = Date.now()
			drawRoute()
		})
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

	    requestAnimationFrame(function(){drawRoute(direction)})
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

function requestRoute(routeObj, cb){
	
	console.log('requesting', routeObj)
	const route = c.routeData[routeObj[0]]
	if (!route) console.log('not yet downloaded')

	else {
		var entry = route.processed[routeObj[2]];

		if (!entry) entry = c.routeData[routeObj[0]].processed[routeObj[1]]
		cb(entry)
	}


}


const fetchRouteData = (routeId, cb) => {


	d3.json('http://restbus.info/api/agencies/sf-muni/routes/'+routeId, (err, resp) => {
		
		resp.processed = {}
		// per direction, reconstruct route from stops
		resp.directions.forEach(function(route){

	        var whitelist = route.stops;

	        var stops = resp.stops
				.filter(stop =>whitelist.includes(stop.id)) // keep only stops that are in the general list
				.map(stop => turf.point(
				        [stop.lon, stop.lat], 
				        {
				        	name: stop.title, 
				        	id: stop.id,
				        	routeId: routeId,
				        	direction: app.utils.getDirection(route.id)
				        }
				    )
				)

	        var path = stops.map(stop =>stop.geometry.coordinates)

			resp.processed[route.id] = {
				title: route.title,
				path: turf.linestring(
					path, {direction:app.utils.getDirection(route.id)}
				),
				stops: turf.featurecollection(stops)
			}

			// add fallbacks
			if (route.id.includes('I_')) resp.processed.IB = resp.processed[route.id]
			else resp.processed.OB = resp.processed[route.id]
		})

		c.routeData[routeId] = resp;

	})
	
}
