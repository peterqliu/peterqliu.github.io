const modal = {
    element: document.getElementById('modal'),
    routeView: {
        title:d3.select('#routeName'),
        subtitle: d3.select('#routeDir'),
        routeStops: d3.select('#routeStops'),
        routeBuses: d3.select('#routeBuses'),
        updateStops: function() {

            const {route:{name}, dir:{dirNameShort}, direction} = s.activeBus;
            const {routeView:{title, subtitle,routeStops}} = modal;
            const {activeRouteGeometry:{stops:{features}}, customLayer:{highlightStop}} = s;

            title.text(name);
            subtitle.text(dirNameShort);
            d3.select('.routeView').node().scroll(0,0);

            d3.select('#directionText')
                .attr('class', `${direction} directionText highlight`)

            routeStops
                .selectAll('*')
                .remove();

            
            const rS = modal.routeView.routeStops
                .selectAll('.routeStop')
                .data(features)
                .enter()
                .append('div')
                .attr('class', 'listEntry routeStop')
                .on('click', (d)=>{
                    app.map.panTo(d.geometry.coordinates);
                    highlightStop(d)
                });

            rS
                .append('div')
                .attr('class', 'notation modalSmall')
                .text((d,i)=>{
                    if (!i) return
                    const stepwiseDistance = app.ruler.distance(features[i-1].geometry.coordinates, d.geometry.coordinates)
                    return app.format.distance(stepwiseDistance);
                })
            rS
                .append('div')
                .attr('class', 'subtitle ml30 mr60')
                .text(({properties:{name, id}})=>`${name}`)

            modal.routeView.updateBuses();

        },

        updateBuses: function() {

            const {activeBus: {dir:{id}, direction}, buses} = s;
            const {routeView:{routeBuses}} = modal;
            const multiBusOffsetPercentage = 50;
            const temporaryVerticalTransformTracker = {};
            // const markerTransform
            const busesOnRoute = buses
                .filter(bus=>bus.dir.id === id)
                .map(b=>{

                    const {vehiclePosition: {atCurrentStop, currentStopTag}} = b;
                    // find routeStop element matching the stop tag
                    let matchingStopIndex = s.activeRouteGeometry.stops.features
                        .findIndex(s=>s.properties.id === currentStopTag);

                    let matchingElement = document.querySelectorAll('.routeStop')[matchingStopIndex];
                    let markerOffsetY;
                    if (!matchingElement) {
                        console.log('no match found for', b);
                        markerOffsetY = 0;
                    }
                    else {
                        const {offsetTop, offsetHeight} = matchingElement;
                        markerOffsetY = offsetTop;
                        if (atCurrentStop && matchingElement) markerOffsetY += offsetHeight/2;
                    }


                    if (temporaryVerticalTransformTracker[markerOffsetY]>=0) temporaryVerticalTransformTracker[markerOffsetY]++
                    else temporaryVerticalTransformTracker[markerOffsetY] = 0;

                    const markerOffsetX = temporaryVerticalTransformTracker[markerOffsetY]*multiBusOffsetPercentage;
                    b.transform = [markerOffsetX, markerOffsetY];

                    return b; 
                })

            const markers = routeBuses
                .selectAll('.marker')
                .data(busesOnRoute, ({id})=>id);

            markers
                .exit()
                .remove();

            markers
                .enter()
                .append('div')
                .attr('class', `animateTransform big quiet ${direction} down marker`)
                .style('z-index', '99');

            routeBuses
                .selectAll('.marker')
                .style('transform', ({transform:[x,y]})=>{
                    const additionalMarkers = temporaryVerticalTransformTracker[y]
                    const adjustedXOffset = x-additionalMarkers*multiBusOffsetPercentage/2;
                    const adjustedScale = Math.pow(0.9, additionalMarkers);
                    return `translate(${adjustedXOffset}%, ${y}px) scale(${adjustedScale})`
                })
        }
    },

    systemView: {
        routes: d3.selectAll('.route'),
        updateRoutes: function(){

            if (s.requestsInFlight) return 

            const routeSet = {};
            const {ruler, format} = app;
            s.buses
                .map(({route, direction, linkedVehicleIds, vehiclePosition, dir:{id, dirNameShort}, lon, lat})=>({...route, direction, linkedVehicleIds, vehiclePosition, id, dirNameShort, lngLat:[lon, lat]}))
                .forEach(({name, direction, linkedVehicleIds, id, lngLat, dirNameShort, vehiclePosition})=>{

                    const [line, dir, variant] = id.split('_');
                    const lineVar = [line,variant].join('_');
                    
                    if (!routeSet[name]) routeSet[name] = {line, IB:{buses:[]}, OB:{buses:[]}, lineVars:{}}
                    if (!routeSet[name].lineVars[lineVar]) {
                        routeSet[name].lineVars[lineVar] = {dirNameShort, direction, buses: [], OB:[], IB:[], data: c.routeData[line][id]}
                    };

                    const pathPoints = routeSet[name].lineVars[lineVar].data.path.geometry.coordinates;
                    const busProgress = ruler.pointOnLine(pathPoints, lngLat).t;
                    routeSet[name][direction].title =dirNameShort;
                    routeSet[name][direction].buses.push({busProgress, linkedVehicleIds, vehiclePosition,direction})
                })


                const data = Object.keys(routeSet).sort()
                .map(route=>({route, ...routeSet[route]}), ({route})=>route);

            // console.log(data)
            const routes = d3.select('#routeList')
                .selectAll('.route')
                .data(data, d=>d.route);

            const newRoutes = routes
                .enter()
                .append('div')
                .attr('class', 'route listEntry')
                .on('click', (d)=>{
                    const {line} = d;
                    const matchingMarker = s.mesh.markers
                        .find(m=>m.userData.route.id ===line);

                    app.setState('mode', 'focus');
                    app.setState('activeRoute', matchingMarker.userData);
                    app.map.fitBounds(s.activeRouteGeometry.bounds)
                });

            newRoutes
                .append('div')
                .classed('subtitle', true)
                .text(d=>d.route);

            const newDirections = newRoutes
                .selectAll('.direction')
                .data(d=>([d.OB, d.IB]))
                .enter()
                .append('div')
                .attr('class', 'direction mt6')
            

            // route direction bars
            const newDirectionBars = newDirections
                .append('div')
                .classed('directionBar', true)
                .style('transform', (d,i) => i ? 'none' : 'rotate(180deg)')
                .append('div')
                .attr('class', 'barExtent');

            // route markers for each bar
            const markers = newDirectionBars
                .selectAll('.marker')
                .data(d=>d.buses, b=>b.linkedVehicleIds);

            // new markers
            markers
                .enter()
                .append('div')
                .attr('class', d=>`${d.direction.toLowerCase()} animateTransform absolute left quiet marker`);

            // route direction label
            newRoutes
                .append('div')
                .attr('class', 'directionLabel modalSmall mt3')
                .selectAll('span')
                .data(d=>[d.OB, d.IB])
                .enter()
                .append('span')
                .text((d,i)=>format.dirName(d.title))
                .attr('class', '')
                .classed('fr', (d,i)=>i)

            // UPDATE bus marker positions
            d3.select('#routeList')
                .selectAll('.marker')
                .style('transform',  ({busProgress})=>{return `translate(${busProgress*100}%)`});

            // REMOVE obsolete routes, and buses
            routes.exit().remove();
            markers.exit().remove();
        }
    },

    trendView: {

        updateUtilization: function(){

            d3.json('https://peterqliu-past24endpoint.web.val.run/', (d) => {

                let {time, capacity, riding} = d;

                // indices of 5-minute intervals
                let indices = time
                    .filter(t=>{
                        let d = new Date(t);
                        return d.getMinutes()%10 ===0;
                    })
                    .map(d=>time.indexOf(d))

                const c = indices.map(i=>capacity[i]);
                const r = indices.map(i=>riding[i]);

                const width = 400;
                const height = 150;
                // const viewBox = [0,0,c.length, height].join(' ');
                const yMax = Math.ceil(Math.max(...c)/1000) * 1000;


                s.past24 = d;
                // d3.select('#past24')
                    // .attr("viewBox",viewBox)

                d3.select('#capacity')
                    .datum(c)
                    .attr("d", d3.line()
                        .x((d,i)=>width * i/indices.length)
                        .y(d=>height* (1 - d/yMax))
                    )

                d3.select('#riding')
                    .datum(r)
                    .attr("d", d3.line()
                        .x((d,i)=>width * i/indices.length)
                        .y(d=>height* (1 - d/yMax))
                    )

                // x axis labels
                const h = app.utils.getCurrentHourInTimeZone();
                const m = new Date().getMinutes();
                const minsSinceMidnight = 60*h+m;
                console.log(minsSinceMidnight/(24*60), m);

                d3.select('.midnight')
                    .style('margin-left', `${100*(1-minsSinceMidnight/(24*60))}%`)
                    .style('transform', 'translateX(-50%)')

            })
        }
    }
}