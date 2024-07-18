

s.customLayer = {

	buses: {},

	camera: new THREE.OrthographicCamera(),
	scene: new THREE.Scene(),
	raycaster: new THREE.Raycaster(),

	buildRenderer: (gl) => {

		const startTime = performance.now()
		const cL = s.customLayer;
	
		cL.renderer = new THREE.WebGLRenderer({
			canvas: app._map.getCanvas(),
			alpha:true,
			context:gl,
			antialias: true
		});
	
		const {devicePixelRatio, innerHeight, innerWidth} = window;
		cL.renderer.setPixelRatio( devicePixelRatio );
		cL.renderer.setSize(innerWidth, innerHeight)
		cL.renderer.autoClear = false;
	
		app.setState('initScene', true);
		console.log('scene initialized in ', performance.now() - startTime)
	},

	render: () =>{
		const {customLayer:{renderer, scene, camera}} = s;
		if (!app._map.isMoving()) renderer.render(scene, camera);
	},

	// conditionally update bus color depending on app view state
	updateBusColor: function(bus) {
		const {activeTab, mode, customLayer:{buses}} = s;
		const {id, direction, event} = bus;

		if (mode ==='inactive') {
			const [busMarker] = buses[id].children;
			busMarker.material = c.material[direction];
		}

	},

	updateBuses: () => {

		const {activeTab, diff, customLayer:{buses, scene, moveBus, addBus}} = s;

		// on first run, just add all buses to scene
		if (!Object.keys(s.customLayer.buses).length) s.buses.forEach(addBus)

		else {

			const newBuses = [];

			diff
				.forEach(bus => {
					
					const {id, direction, event} = bus;

					// toggle material color for buses switching direction
					if (event==='switchDirection') {
						s.customLayer.updateBusColor(bus)
					}

					// add buses coming online
					if (event=== 'online') {
						addBus(bus);
						newBuses.push(id)
					}

					// remove buses going offline
					else if (event=== 'offline') {
						const busToRemove = buses[id];
						scene.remove(busToRemove)
						delete buses[bus]
					}
				})

			s.buses.forEach(bus=>{
				// move existing buses
				if (!newBuses[bus.id]) moveBus(bus, buses[bus.id], activeTab !==1)
				
			})
		}

		s.mesh = {
			markers: scene.children.map(bus=>bus.children[0]),
			labels: scene.children.map(bus=>bus.children[1])
		}

		app._map.triggerRepaint();

	},

	addBus: d => {

		const {route:{id}} = d;
		const {TextGeometry, Mesh, Group} = THREE;
		const {customLayer, mode} = s;
		const {geometry, material, font} = c;

 		//build bus marker
 		const currentMarkerMaterial = mode === 'inactive' ? d.direction : 'inactive'
		const marker = new Mesh( 
			geometry.bus, 
			material[currentMarkerMaterial] 
		) ;   

		// build bus text
		var geomLookup = geometry.label[d.routeId];

		if (!geomLookup) {

			const textGeom = new TextGeometry( id, {
				font: font,
				size: 1/Math.pow(1.25, id.length),
				height:0,
				curveSegments: 24
			} );

			// center text
			textGeom.computeBoundingBox();
			textGeom.bb = textGeom.boundingBox;

			textGeom.matrixAutoUpdate = false;

			textGeom.translate(
				-0.5 * ((textGeom.bb.max.x-textGeom.bb.min.x) + (id.match(/1/g) || []).length / (id.length+3)),
				-(textGeom.bb.max.y - textGeom.bb.min.y) * 0.5,
				-0.1
			)

			geometry.label[id] = geomLookup = textGeom
		}

		const text = new Mesh(geomLookup, material.text);

		if (!s.showLabels) text.scale.set(0.00001,0.00001,0.00001);

		text.rotation.x = Math.PI

		// group text and marker, scale, and position
 		const group = new Group()

		group.add(marker)
		group.add(text)
		group.scale.set(0.000002,0.000002,0.000002)

		customLayer.moveBus(d, group)

		customLayer.scene.add( group );
		customLayer.buses[d.id] = group;

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
		
		const {lastPollTime, animatingBuses, customLayer} = s;
		const progress = (Date.now()-lastPollTime)/1000;
		if (animatingBuses === false || progress > 1) s.animatingBuses = false

		else {
			// sine function for eased movement
			const smoothed = Math.sin(progress * Math.PI/2)

			for (id of Object.keys(customLayer.buses)){

				const bus = customLayer.buses[id];
				const {userData:{lastPosition, positionDelta}} = bus;


				const newPos = lastPosition.clone();
				const totalChange = positionDelta.clone();
				newPos.add(totalChange.multiplyScalar(smoothed));
				bus.position.set(newPos.x, newPos.y, bus.position.z) // keep z during animation to avoid flickering from Math.random
                
                app._map.triggerRepaint();

			}
					
		}

	},

	restoreBusMarkerColors: (bus) => {

		if (bus) {
			bus.material = newColor(bus)
			return 
		}
		
		for (b of s.mesh.markers) {
			b.material = newColor(b)
			b.parent.position.z = Math.random()/100000000
		}

		function newColor(bus) {
			return c.material[bus.userData.direction];
		}
	},

	highlightMarker: (newBus) => {

		const hB = s.highlightedBus;
		let {markerObj, uuid} = hB;
		const mouseout = !newBus || newBus.uuid !== uuid;

		const updateHovered = newBus && newBus.uuid !== uuid;
		const unhovering = mouseout && markerObj;

		const {mode, activeRoute, buses, customLayer, mesh:{markers}} = s;
		const {_map, clearPopup, setState} = app;
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
		
			clearPopup()
		
		}

		// if there's a new active marker, highlight it

		if (updateHovered) {

			hB.uuid = newBus.uuid;
			newBus.scale.set(1.2,1.2,1.2);
			hB.markerObj = newBus;
			
			// set popup for hovered bus
			const {route, direction, lon, lat, dir, kph, occupancyDescription, id, vehicleType} = newBus.userData;
			const routeId = route.id;
			const {title, [dir.id]: directionTitle} = c.routeData[routeId];
			const subhead = directionTitle?.title || title;
			const {format:{occupancyString, speed, _vehicleType}} = app;

			if (mode !== 'focus') {

				setState('mode', 'active');
				setState('activeRoute', newBus.userData);
				
				buses.forEach(({id, dir})=>{
					const sameRouteAndDirection =  dir.id === s.activeRoute[2];
					const [busMarker] = customLayer.buses[id].children;
					if (!sameRouteAndDirection) busMarker.material = c.material.inactive;
					else busMarker.parent.position.z = 0.0000001;
				})

			}

			customLayer.setPopup(
				[lon, lat],
				[
					title, // route name
					`<div><span class="${direction} highlight directionText"></span> to ${subhead}</div>
					${_vehicleType(vehicleType)} #${id} ${speed(kph)}, ${occupancyString(occupancyDescription)}
					`
				],

				direction
			)
		}

        if (updateHovered || unhovering) {
			document.querySelector('.mapboxgl-canvas').style.cursor = updateHovered ? 'pointer' : 'default'
        	_map.triggerRepaint()
        };

	},

	updateMarkerColor: function() {

	},

	highlightStop: (newStop) => {

		if (newStop) {

			const {activeRoute:[route, direction]} = s;
			const {
				lngLat,
				id,
				name
			} = newStop;

			if (id === s.highlightedStop) return
			s.customLayer.setPopup(
				lngLat, 
				[name, direction === 'IB' ? 'Inbound' : 'Outbound']
			)

			app.getPrediction(route, id, predictions=>{

				let prediction;

				if (!predictions.length) prediction = 'no current prediction'

				else {
					let [{seconds, occupancy}, ...futureBuses] = predictions;
					const {format:{occupancyString, time}} = app;
					const formattedOccupancy = occupancyString(occupancy);
	
					prediction = `Next bus in <span class='${direction} highlight'>${time(seconds)}</span> (${formattedOccupancy})`;
	
	
					if (futureBuses.length) {
						const additionalPredictions = futureBuses.map(({seconds})=>time(seconds)).join(', ');
						prediction +=`<br>then ${additionalPredictions}`
					}
				}

				s.customLayer.setPopup(
					lngLat, 
					[name, prediction],
					direction
				)
			});

			s.highlightedStop = id;
			app._map.triggerRepaint();

		}

	},


	setPopup: (lngLat, content, dir, offsetMultiplier) => {

		const [title, direction] = content;
		const markup = `<div class='title'>${title}</div><div class='${dir} body'>${direction}</div>`

		app.popup.setLngLat(lngLat)
			.setHTML(markup)
			.addTo(app._map)
	},

	onClick: () => {

		const hB = s.highlightedBus;

		// if no highlighted bus, stop here
		if (!hB.markerObj) return
		const {lon, lat, id} = hB.markerObj.userData;

		// zoom in on bus
		app._map.easeTo({
			center: [lon, lat], 
			padding:{right: 2*modal.element.clientWidth},
			zoom:15
		})

		app.setState('mode', 'focus')
		app.setState('activeRoute', hB.markerObj.userData)
		app.setState('activeTab', 0)
	},

	setActiveRoute: () => {
		const {mesh:{markers}, customLayer, activeRoute} = s;

		// fade out other markers

		for (bus of markers) {
			const {userData} = bus;
			const sameRouteAndDirection = userData.route.id === activeRoute[0] && userData.dir.id === activeRoute[2]
			if (!sameRouteAndDirection) bus.material = c.material.inactive;
			else {
				bus.material = c.material[bus.userData.direction];
				bus.parent.position.z = 0.0000001;
			}
		}

		customLayer.highlightMarker()
	}
}

