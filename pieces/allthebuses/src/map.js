
function setupMap(){

	const {
		emptyGeojson, 
		customLayer, 
		style:{systemRoutes, focus:[lineWidthStyle], ddsColor}, color:{background}
	} = c;

	app._map
		.addLayer({
			'id': 'systemViewRoutes',
			// 'filter':['==', 'direction', 'IB'],
			'type':'line',
			'source':{
				'type': 'geojson',
				'data': emptyGeojson,
				'lineMetrics': true
			},
			'layout': {
				'visibility': 'none',
				'line-cap': 'round', 
				'line-join': 'round'
			},
			'paint':{
				'line-width': systemRoutes,
				'line-opacity':0.75,
				'line-color': ddsColor,
				// 'line-offset':10
			}
		})	
		.addLayer({
			'id': 'systemViewRoutesAnimation',
			// 'filter':['==', 'direction', 'OB'],
			'type':'line',
			'source':'systemViewRoutes',
			'layout': {
				'visibility': 'none',
				'line-cap': 'round', 
				'line-join': 'round'
			},
			'paint':{
				'line-width': systemRoutes,
				// 'line-opacity':0.5,
				// 'line-offset':style.focus[0][2],
				'line-color': 'rgba(0,0,0,0)'
			}
		})
		.addLayer({
			'id': 'systemViewRoutes-labels',
			'type':'symbol',
			'source':'systemViewRoutes',
			'layout': {
				'visibility': 'none',
				'text-padding': 1,
				'text-field': '{line}',
				'symbol-placement': 'line',
				// 'symbol-spacing':400,
				'text-size':{stops:[[12,10], [22,42]]},
				'text-max-angle': 1,
				// 'text-ignore-placement': true,
				// 'text-keep-upright': false,
				'text-font':[
					"Kievit Offc Pro Bold",
					"Arial Unicode MS Regular"
				  ]
			},
			'paint':{
				'text-color':background,
				// 'text-opacity':0.9,
				'text-halo-color': ddsColor,
				'text-halo-width':10,
				// 'text-halo-blur':6
			}
		})		
		.addLayer({
			id: 'ext',
			type: 'fill-extrusion',
			'source':{
				'type': 'geojson',
				'data': emptyGeojson
			},

			paint: {
				'fill-extrusion-base': ['*', ['get', 'stack'], 6],
				'fill-extrusion-height': ['+', ['*', ['get', 'stack'], 6], 3],
				'fill-extrusion-color': ddsColor,
				'fill-extrusion-opacity':0.75
			}
		})
		// .addLayer({
		// 	'id': 'systemViewRoutes-vertices',
		// 	'type':'circle',
		// 	'source':'systemViewRoutes'
		// })			
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
			'id': 'focusRouteAnimation',
			'type':'line',
			'source':'route',
			'paint':{
				'line-width': 5,
				'line-opacity':0.5,
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
				'circle-stroke-color': ddsColor,
				'circle-color':'#fff',
				'circle-radius':0,
				'circle-stroke-width': 0
			}
		})	
		.addLayer(customLayer)
		animateDash();

	console.log('map setup complete')

}


function updateRoute(){

	if (s.activeRoute)  {

		const {activeRouteGeometry:{stopIds}, activeRoute} = s;
		const {_map, ruler} = app;

		const path = c.pathData[activeRoute[2]];

		const lngLats = stopIds
			.map(id=>({ll: c.stopData[id].lngLat,id}));

		const stops = lngLats
			.map(ll=>{

				const snapped = ruler.pointOnLine(path, ll.ll).point;
				return turf.point(snapped, {direction:activeRoute[1], id:ll.id})
			});

		_map.getSource('route')
			.setData(turf.lineString(path))

		_map.getSource('stops')
			.setData(turf.featureCollection(stops))

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
	        Math.min(progress, 0.99999), color,
	        Math.min(1, progress+0.00001), `rgba(255,255,255,0)`
	    ]
	    requestAnimationFrame(()=>drawRoute())
	}

	else style = color

	app._map.setPaintProperty('route', 'line-gradient', style)
}


// API call to populate route data
const fetchRouteData = (routeId, cb) => {

	const {utils:{load, getDirection}, format, ruler} = app;
	console.warn('unfetched route', routeId)

	load('routes/'+routeId, cb || function(resp) {

		const {title, description, directions, stops} = resp;
		var output = {title, description};

		// per direction, reconstruct route from stops
		directions.forEach(routeDirection => {

			const {id, name} = routeDirection;

	        resp.stops.forEach(stop=>{
				const {name, id, lon, lat} = stop;
				c.stopData[stop.id] = {name, lngLat:[lon, lat]};
	        })
			
	        var stops = routeDirection.stops
				.map(stop => {
					const {name, id, lngLat} = c.stopData[stop];
					return {
						"type": "Feature",
						"properties": {
							name, 
							id,
							routeId,
							direction: getDirection(routeDirection.id)
						},
						"geometry": {
							"type": "Point",
							"coordinates": lngLat
						}
					}
				})

			format.sameStreetSecond(
				stops, 
				s=>s.properties.name, 
				(s, formatted) => {s.properties.name = formatted; return s}
			);

	        var path = routeDirection.stops.map(id =>c.stopData[id].lngLat);
	        const {boundingBox:{latMin, latMax, lonMin, lonMax}, paths} = resp;

			let temporaryDistanceTracker = 0;
				
			output[id] = {
				title: name,
				bounds: [
					[lonMin, latMin],
					[lonMax, latMax]
				],
				path: {
					"type": "Feature",
					"properties": {direction: getDirection(id)},
					"geometry": {
					"type": "LineString",
					"coordinates": path
					}
				},
				stopIds: routeDirection.stops,
				totalLength: ruler.lineDistance(path),
				stopDistances: path
					.map((stop, index)=>{
						const segmentLength = ruler.distance(path[index-1] || path[0], path[index]);
						temporaryDistanceTracker+=segmentLength;
						return temporaryDistanceTracker
					})
					.map(d=>d/temporaryDistanceTracker)
			}

		})

		c.routeData[routeId] = output;
		app.updateServer.routeData({[routeId]: output})
	})
	
}

const animateDash = () => {

	let {animationDuration, startTime, waves, dashes, gapLength} = c.lineAnimation;
	const {activeTab, mode} = s;
	const {_map} = app;
	if ( mode === 'focus') dashes*=3;
	const t = Date.now() - startTime;
	const justABit = 0.00001;

	const directions = ['IB', 'OB'];
	const wavelength = 1/dashes;

	let p = ((t%animationDuration) / animationDuration) % (wavelength*2);

	let attenuatedOpacity = Math.pow(0.97, _map.getZoom())
	let dashColor = c.color.background.replace('1)', '0)');
	let bgColor = c.color.background.replace('1)', `${attenuatedOpacity})`);	

	let dashSequence = new Array(dashes).fill(1)
		.map((d,i) => {

			const dashPos = p + i * wavelength;
			const bgPos = dashPos + wavelength*(1-gapLength);

			let tailToHead = [
				dashPos, dashColor, 
				Math.min(1, bgPos) - justABit, dashColor, 
			];

			if (bgPos<1) tailToHead.push(Math.min(1, bgPos), bgColor)

			return tailToHead
		}).flat();



	const endIndex = dashSequence.findIndex(d=>d>=1);
	if (endIndex>-1) dashSequence = dashSequence.slice(0, endIndex+2)


	if (p<gapLength) dashSequence = [bgColor, dashSequence[0]-justABit, bgColor, ...dashSequence];
	else dashSequence = [
		dashColor, 
		p-gapLength, bgColor, 
		...dashSequence
	]

	foo = [p, dashSequence]
	_map.setPaintProperty(
		mode === 'focus' ? 'focusRouteAnimation' : `systemViewRoutesAnimation`, 
		'line-gradient',
		[
			'step',
			['line-progress'],
		...dashSequence
		]
	)

    if (activeTab===1 || mode ==='focus') requestAnimationFrame(animateDash)
    
};



const extantRouteGeometry = () => {

	const {pathData} = c;
	let extantRoutes = [];
	s.buses.forEach(({dir:{id}})=>{
		if (!extantRoutes.includes(id)) extantRoutes.push(id)
	})

	extantRoutes = extantRoutes
		.filter(variant=>pathData[variant])
		.map(variant=>{
			const [route, direction] = variant.split('_');
			// console.log(variant,c.pathData[variant])
			return turf.lineString(pathData[variant], {direction: direction ==='0' ? 'OB':'IB', line:route, var:variant})
		})
		.map((line, lineIndex)=>{
			let offset = turf.lineOffset(line, 0.0015).geometry.coordinates;

			// clean up some offset artifacts
			offset = offset.filter(([lng, lat])=>Math.abs(lng)<180 && Math.abs(lat)<90);
			return turf.lineString(offset, line.properties)
		});
	
	
	return groupLines(extantRoutes)
};

const groupLines = (lines) => {
	return lines
	// create a matrix of pairwise line intersections
	const intMatrix = lines.map((l, lI) => {
		const arr = lines.map((candidate, candidateIndex)=>{
			if (candidateIndex === lI) return false
			if (candidateIndex<lI) return null
			return turf.booleanIntersects(l, candidate)
		})

		return arr
	})

	// console.log(intMatrix)
	// create a priority list of lines, with the fewest intersections first
	let collisionHierarchy = [];
	intMatrix.forEach((arr, lineIndex)=>{
		const collisions = arr
			.map((d, collisionIndex)=>{
				if (d===null) intMatrix[lineIndex][collisionIndex] = intMatrix[collisionIndex][lineIndex]
				return d
			})
			.filter(d=>d).length;
		if (collisionHierarchy[collisions]) collisionHierarchy[collisions].push(lineIndex)
		else collisionHierarchy[collisions] = [lineIndex]
	})

	let groupingScheme = []
	collisionHierarchy = collisionHierarchy.flat();

	collisionHierarchy
		.forEach((lineIndex) =>{
			const canJoinGroup = groupingScheme.findIndex(group=>{
				return group.findIndex(candidateLine=>intMatrix[candidateLine][lineIndex]) === -1
			})

			if (canJoinGroup === -1) {
				groupingScheme.push([lineIndex]);
				lines[lineIndex].properties.stack = groupingScheme.length-1
			}
			else {
				groupingScheme[canJoinGroup].push(lineIndex);
				lines[lineIndex].properties.stack = canJoinGroup;

			}
		})

	groupingScheme = groupingScheme.sort((a,b)=>{a.length>b.length})
	// console.log(groupingScheme)

	return lines
}