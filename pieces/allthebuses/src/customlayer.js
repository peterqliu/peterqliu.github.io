

s.customLayer = {

	buses: {},

	camera: new THREE.OrthographicCamera(),
	scene: new THREE.Scene(),
	raycaster: new THREE.Raycaster(),

	render: () =>{
		if (!app.map.isMoving()) s.customLayer.renderer.render(s.customLayer.scene, s.customLayer.camera);
		// requestAnimationFrame(s.customLayer.render)
	},

	updateBuses: () => {
        start = Date.now()

		const extantBuses = Object.keys(s.customLayer.buses);
		var updatedBuses = s.buses.map(bus=>bus.id);

		// console.log(updatedBuses.length, ' on record')
		s.buses.forEach(bus=>{

			const busExists = s.customLayer.buses[bus.id];
			
			// add new buses
			if (!busExists) s.customLayer.addBus(bus);
			
			// move existing buses
			else s.customLayer.moveBus(bus, busExists, true)
			
		})

		extantBuses.forEach(bus => {
			if (!updatedBuses.includes(bus)) {
				const busToRemove = s.customLayer.buses[bus];
				s.customLayer.scene.remove(busToRemove)
				// console.log('removing')
				delete s.customLayer.buses[bus]
			}
		})

		s.mesh = {
			markers: s.customLayer.scene.children.map(bus=>bus.children[0]),
			labels: s.customLayer.scene.children.map(bus=>bus.children[1])
		}

		// console.log('updatebus complete', Date.now()-start)
		app.map.triggerRepaint();

		// console.log(s.customLayer.scene.children.length, ' in scene', Object.keys(s.customLayer.buses).length, ' on record')
	},


	addBus: d => {

		const {route:{id}} = d;

 		//build bus marker
 		const currentMarkerMaterial = s.mode === 'inactive' ? d.direction : 'inactive'
		const marker = new THREE.Mesh( 
			c.geometry.bus, 
			c.material[currentMarkerMaterial] 
		) ;   

		// build bus text
		var geomLookup = c.geometry.label[d.routeId];

		if (!geomLookup) {
			const textGeom = new THREE.TextGeometry( id, {
				font: c.font,
				size: 1/Math.pow(1.25, id.length),
				height:0,
				curveSegments: 24
			} );

			// center text
			textGeom.computeBoundingBox();
			textGeom.bb = textGeom.boundingBox;

			textGeom.matrixAutoUpdate = false;
			c.geometry.label[id] = geomLookup = textGeom
		}


		const text = new THREE.Mesh(geomLookup, c.material.text);

		if (!s.showLabels) text.scale.set(0.00001,0.00001,0.00001);

		text.rotation.x = Math.PI
		text.position.x = -0.5 * ((geomLookup.bb.max.x-geomLookup.bb.min.x) + (id.match(/1/g) || []).length / (id.length+3))
		text.position.y = (geomLookup.bb.max.y - geomLookup.bb.min.y) * 0.5;
		text.position.z = 0.001

		// group text and marker, scale, and position
 		const group = new THREE.Group()

		group.add(marker)
		group.add(text)
		group.scale.set(0.000002,0.000002,0.000002)

		s.customLayer.moveBus(d, group)

		s.customLayer.scene.add( group );
		s.customLayer.buses[d.id] = group;

		return group
	}, 

	moveBus: (data, busObj, animate) => {

		// position and rotate bus
		const newPosition = app.utils.projectToScene([data.lon,data.lat]);
		if (!animate) busObj.position.copy(newPosition);

		busObj.userData = {
			routeId: data.route.id,
			lastPosition: busObj.position.clone(),
		}

		busObj.userData.positionDelta = newPosition.sub(busObj.userData.lastPosition)
		
		const [marker] = busObj.children;
		marker.rotation.z = app.utils.radify(data.heading-135);
		marker.userData = data;

		

	},

	animateBus: () => {
		
		const progress = (Date.now()-s.lastPollTime)/1000;

		if (s.animatingBuses === false || progress > 1) s.animatingBuses = false

		else {
			// sine function for eased movement
			const smoothed = Math.sin(progress * Math.PI/2)

			for (id of Object.keys(s.customLayer.buses)){

				const bus = s.customLayer.buses[id];
				const newPos = bus.userData.lastPosition.clone();
				const totalChange = bus.userData.positionDelta.clone();
				newPos.add(totalChange.multiplyScalar(smoothed));
				bus.position.set(newPos.x, newPos.y, bus.position.z) // keep z during animation to avoid flickering from Math.random
                
                app.map.triggerRepaint();

			}
					
		}

	},

	restoreBusMarkerColors: () => {

		for (bus of s.mesh.markers) {
			bus.material = c.material[bus.userData.direction];
			bus.parent.position.z = Math.random()/100000000
		}
	},

	highlightMarker: (newBus) => {

		const hB = s.highlightedBus;
		let {markerObj,uuid} = hB;
		const mouseout = !newBus || newBus.uuid !== uuid;

		const updateHovered = newBus && newBus.uuid !== uuid;
		const unhovering = mouseout && markerObj;

		const {mode, activeRoute, mesh:{markers}} = s;

		// if (unhovering) console.log('unhover')
		// if (updateHovered) console.log('updatehover')

		const sameRouteAndDirection = markerObj?.userData.route.id === activeRoute[0] && markerObj?.userData.dir.id === activeRoute[2]

		// if moving off of a hovered marker
		if (unhovering) {

			// in focus mode, mousing out only resets the size of one hovered marker
			if (mode === 'focus') {
					
				if (!sameRouteAndDirection) {
					hB.markerObj.material = c.material.inactive;
					hB.markerObj.parent.position.z = Math.random()/100000000;
				}

			}


			//in default mode, mousing out restores color to all markers and removes route

			else app.setState('mode', 'inactive')

			markerObj.scale.set(1,1,1);
			hB.markerObj = hB.uuid = null;
		
			app.clearPopup()
		
		}

		// if there's a new active marker, highlight it
		if (updateHovered) {

			hB.uuid = newBus.uuid;
			newBus.scale.set(1.2,1.2,1.2)
			hB.markerObj = newBus;
			
			// set popup for hovered bus
			const {route:{id}, direction, lon, lat, dir, kph, occupancyDescription, linkedVehicleIds} = newBus.userData;
			const relevantRoute = c.routeData[id];
			const subhead = relevantRoute[dir.id]?.title || relevantRoute.title;
			const {format:{occupancyString, speed}} = app;
			s.customLayer.setPopup(
				[lon, lat],
				[
					c.routeData[id].title, // route name
					`#${linkedVehicleIds} ${speed(kph)}, ${occupancyString(occupancyDescription)}
					<br><span class="highlight">${direction === 'IB' ? 'Inbound' : 'Outbound'}</span> to ${subhead}
					`
				],

				direction
			)

			// if (s.mode === 'focus') {
			// 	// const nonActiveRouteAndDirection = markerObj.userData.routeId !== s.activeRoute[0] || markerObj.userData.direction !== s.activeRoute[1]
			// 	console.log('focus updatehover', sameRouteAndDirection, activeRoute, newBus)
			// 	// if (!sameRouteAndDirection) newBus.material = c.material.inactiveHover;
			// }

			if (s.mode !== 'focus') {
				app.setState('mode', 'active')
				app.setState('activeRoute', newBus.userData);
				// fade out other markers

				for (bus of markers) {

					const sameRouteAndDirection = bus.userData.route.id === s.activeRoute[0] && bus.userData.dir.id === s.activeRoute[2]
					if (!sameRouteAndDirection) bus.material = c.material.inactive;
					else bus.parent.position.z = 0.0000001;
				}

			}

		}

        if (updateHovered || unhovering) {
			document.querySelector('.mapboxgl-canvas').style.cursor = updateHovered ? 'pointer' : 'default'
        	app.map.triggerRepaint()
        };

	},

	highlightStop: (newStop) => {

		if (newStop) {

			const {geometry:{coordinates}, properties:{name, id, direction, routeId}} = newStop;
			if (name === s.highlightedStop) return

			s.customLayer.setPopup(
				coordinates, 
				[name, direction === 'IB' ? 'Inbound' : 'Outbound']
			)

			app.getPrediction(routeId, id, (predictions)=>{

				let [{seconds, occupancy}, ...futureBuses] = predictions;
				const formattedOccupancy =app.format.occupancyString(occupancy)
				var prediction = `Next bus in <span class='highlight'>${app.format.time(seconds)}</span> (${formattedOccupancy})`;

				if (!seconds) prediction = 'no current prediction'


				if (futureBuses.length) {
					const additionalPredictions = futureBuses.map(p=>app.formatTime(p.seconds)).join(', ');
					prediction +=`<br>then ${additionalPredictions}`
				}
				s.customLayer.setPopup(
					coordinates, 
					[name, prediction],
					direction
				)
			});

		}

		s.highlightedStop = newStop ? newStop.properties.name : undefined;
        app.map.triggerRepaint();

	},


	setPopup: (lngLat, content, dir, offsetMultiplier) => {
		const [title, direction] = content;
		const markup = `<div class='title'>${title}</div><div class='${dir}'>${direction}</div>`
		app.popup.options.offset = 25 * Math.pow(1.25, Math.max(0, app.map.getZoom()-13))
		app.popup.setLngLat(lngLat)
			.setHTML(markup)
			.addTo(app.map)
	},

	onClick: () => {

		const hB = s.highlightedBus;

		// if no highlighted bus, stop here
		if (!hB.markerObj) return

		// zoom in on bus
		app.map.easeTo({
			center: [hB.markerObj.userData.lon, hB.markerObj.userData.lat], 
			zoom:15
		})

		app.setState('mode', 'focus')

		// draw route only if in focused mode (bc not drawn on hover)
		if (s.mode === 'focus') app.setState('activeRoute', hB.markerObj.userData)

		// fade out other markers

		for (bus of s.mesh.markers) {

			const sameRouteAndDirection = bus.userData.route.id === s.activeRoute[0] && bus.userData.dir.id === s.activeRoute[2]
			if (!sameRouteAndDirection) bus.material = c.material.inactive;
			else {
				bus.material = c.material[bus.userData.direction];
				bus.parent.position.z = 0.0000001;
			}
		}

		s.customLayer.highlightMarker()
	}
}

// init
const buildRenderer = (gl) => {

	const startTime = performance.now()

	const cL = s.customLayer;

	cL.renderer = new THREE.WebGLRenderer({
	    canvas: app.map.getCanvas(),
	    alpha:true,
	    context:gl,
	    antialias: true
	});

	cL.renderer.setPixelRatio( window.devicePixelRatio );
	cL.renderer.setSize(window.innerWidth, window.innerHeight)
	cL.renderer.autoClear = false;

	app.setState('initScene', true);
	console.log('scene initialized in ', performance.now()- startTime)
}
