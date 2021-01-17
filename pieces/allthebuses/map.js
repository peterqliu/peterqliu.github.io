mapboxgl.accessToken = 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImNqdHE0cXByZDAzaWY0NHBldG9yd3Jld28ifQ.8dISItctShjFnmnVeAgW2A';

var map = new mapboxgl.Map({
    container: 'map', // container id
    antialiased:true,
	style: 'mapbox://styles/peterqliu/cjnnukhkb08fu2so0ywo37ibj',
    center: s.center, // starting position
    // minZoom: 12,
    zoom: 13 // starting zoom
});

map.on('load', function(){
	
	setupMap()
	setInterval(function(){pollBuses()}, 5000)
	pollBuses()
})

function getDirection(str){
	var output = str.includes('_I_') ? 'IB' : 'OB'
	return output
}
function pollBuses(){
	d3.json('http://restbus.info/api/agencies/sf-muni/vehicles', function(err,resp){

		var geojson = resp
		.filter(item =>item.directionId)
		.map(function(item){
			var id = item.directionId;
			item.direction = getDirection(id)
			return turf.point([item.lon, item.lat], item)
		})


		geojson = turf.featureCollection(geojson)

		updateRouteData(geojson)

		updateBuses(geojson)
	})
}

function setupMap(){

	map.addSource('buses', {
		'type': 'geojson',
		'data': c.emptyGeojson
	})

	map
	.addLayer({
		'id':'buses',
		'type': 'circle',
		'source': 'buses',
		'paint':{
			'circle-radius':20,
			'circle-opacity':0.7,
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
			'circle-stroke-width': 5
		}
	})	

	.on('mousemove', function(e){

		var hoveredBus = map.queryRenderedFeatures(e.point, {layers:['buses']})[0];

		var value = hoveredBus ? hoveredBus.properties : false
		setState('activeRoute', value)
	})
	.on('clickss', function(e){

		var hoveredBus = map.queryRenderedFeatures(e.point, {layers:['buses']})[0];

		var value = hoveredBus ? hoveredBus.properties : false
		setState('activeRoute', value)

		focusRoute(e.lngLat)
	})
}


function updateBuses(geojson){

	map
		.setPaintProperty('bus_labels', 'text-opacity', {
			property: 'routeId', 
			type:'categorical',
			default:0,
			stops:[
				[s.activeRoute, 1]
			]
		})
	.getSource('buses')
		.setData(geojson)

}

function focusRoute(lnglat){

	var state = 'focus';

	c.style[state].forEach(function(style){
		map.setPaintProperty(style[0], style[1], style[2])
	})

	//map.panTo([lnglat.lng, lnglat.lat])
	map.easeTo({center: [lnglat.lng, lnglat.lat], zoom:18})
}

function updateRoute(){

	var state = s.activeRoute ? 'active' : 'inactive';
	c.style[state].forEach(function(style){
		map.setPaintProperty(style[0], style[1], style[2])
	})

	if (s.activeRoute)  {
		var routeObj = s.activeRoute.split('-')
		requestRoute(routeObj, function(resp){

			map.getSource('route')
				.setData(resp.path)

			map.getSource('stops')
				.setData(resp.stops)

			s.routeDrawStart = Date.now()
			drawRoute()
		})
	}
}

function drawRoute(){
	
	var now = Date.now();
	var elapsedTime = Math.max(Date.now() - s.routeDrawStart,1);
	var direction = s.activeRoute.split('-')[1]

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

	map.setPaintProperty('route', 'line-gradient', style)
}

function requestRoute(routeObj, cb){
	var entry = c.routeData[routeObj[0]].processed[routeObj[2]];
	cb(entry)

	return
	d3.json('http://restbus.info/api/agencies/sf-muni/routes/'+routeObj[0], function(err,resp){

        // route line
        // var line = [];

        // resp.paths
	       //  .forEach(function(chunk, chunkIndex){

	       //  	if (chunkIndex%2 === 1) return
	       //      var chunk = chunk.points
	       //          .forEach(function(pt){
	       //              line.push([pt.lon, pt.lat])
	       //          })

	       //  })

        // console.log(line)

        // var lineString = turf.lineString(line, {direction:routeObj[1]})
        //stops

        var whitelist = resp.directions.filter(function(list){
            return list.id === routeObj[2] 
        })[0]

        var stops = resp.stops
        .filter(function(stop){
            return  whitelist.stops.includes(stop.id)
        })

        console.log(stops)

        stops = stops
        .map(function(stop){
            return turf.point(
                [stop.lon, stop.lat], 
                {name: stop.title, direction: routeObj[1]}
            )
        })

        var lineString = stops.map(function(stop){
        	return stop.geometry.coordinates
        })

        cb(err, 
        	turf.lineString(lineString, {direction:routeObj[1]}),
        	turf.featureCollection(stops)
        )

	})
}


function updateRouteData(geojson){

	geojson.features.forEach(function(bus){
		var route = bus.properties.routeId;
		if (!c.routeData[route]) {
			c.routeData[route] = 'pending'

			d3.json('http://restbus.info/api/agencies/sf-muni/routes/'+route, function(err, resp){
				
				resp.processed = {}

				resp.directions.forEach(function(route){

			        var whitelist = route.stops;
			        //console.log(whitelist)
			        var stops = resp.stops
			        .filter(function(stop){
			            return  whitelist.includes(stop.id)
			        })
			        .map(function(stop){
			            return turf.point(
			                [stop.lon, stop.lat], 
			                {name: stop.title, direction: getDirection(route.id)}
			            )
			        })

			        var path = stops.map(function(stop){
			        	return stop.geometry.coordinates
			        })

					resp.processed[route.id] = {
						path: turf.lineString(path, {direction:getDirection(route.id)}),
						stops: turf.featureCollection(stops)
					}
				})

		        // var whitelist = resp.directions.filter(function(list){
		        //     return list.id === routeObj[2] 
		        // })[0]

		        // var stops = resp.stops
		        // .filter(function(stop){
		        //     return  whitelist.stops.includes(stop.id)
		        // })

		        // console.log(stops)

		        // stops = stops
		        // .map(function(stop){
		        //     return turf.point(
		        //         [stop.lon, stop.lat], 
		        //         {name: stop.title, direction: routeObj[1]}
		        //     )
		        // })

		        // var lineString = stops.map(function(stop){
		        // 	return stop.geometry.coordinates
		        // })

				// resp.processed = {
				// 	route: turf.lineString(lineString, {direction:routeObj[1]}),
				// 	stops: turf.featureCollection(stops)
				// }


				c.routeData[route] = resp;

			})
		}
	})
}
