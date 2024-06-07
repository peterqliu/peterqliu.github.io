const modal = {
    element: document.getElementById('modal'),
    init: function() {

        d3.selectAll('.tab')
            .on('click', (d,i)=>{
                d3.selectAll('.tabView')
                    .style('display', (d,tabViewIndex)=>tabViewIndex ===i ? 'block' : 'none')
                
                d3.selectAll('.tab')
                    .classed('opacity25', (d,tabIndex)=>i!==tabIndex)
            })

        // d3.select('.utilization.percentToggle')
        //     .on('click', ()=>{
        //         const fractionPath = d3.select('#utilization #fraction');
        //         const fractionVisible = !fractionPath.classed('none');
        //         fractionPath
        //             .classed('none', fractionVisible);

        //         d3.select('.utilization.percentToggle')
        //             .text(fractionVisible ? 'Show percentage' : 'Hide percentage')
        //     })

        modal.element.addEventListener('mouseenter', ()=>app.popup.remove())
        modal.trendView.createGraph(d3.select('#utilization'))
        modal.trendView.createGraph(d3.select('#utilizationFlux'))

    },

    routeView: {
        title:d3.select('#routeName'),
        subtitle: d3.select('#routeDir'),
        routeStops: d3.select('#routeStops'),
        routeBuses: d3.select('#routeBuses'),
        updateStops: function() {

            const {route:{name}, dir:{dirNameShort}, direction} = s.activeBus;
            const {routeView:{title, subtitle, routeStops}} = modal;
            const {activeRouteGeometry:{stops:{features}}, customLayer:{ highlightStop }} = s;

            title.text(name);
            subtitle.text(dirNameShort);
            d3.select('.routeView').node().scroll(0,0);

            d3.select('#directionText')
                .attr('class', `${direction} directionText highlight`)

            routeStops
                .selectAll('.routeStop')
                .remove();

            
            const rS = routeStops
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
            const multiBusOffsetPercentage = 40;
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
                .style('opacity', ({transform:[x,y]})=>{
                    const additionalMarkers = temporaryVerticalTransformTracker[y]
                    
                    return 0.6 * Math.pow(0.75, additionalMarkers)
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
                .attr('class', 'directionLabel modalSmall mt6')
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

        tooltip: d3.select('.tooltip'),

        createGraph: function(parent) {

            const graphContainer = parent.append('div')
                .attr('class', 'inline-block')

            const graph = graphContainer
                .append('div')
                .attr('class', 'relative hoverChildVisible cursor-crosshair');
            // ylabel
            graph.append('div')
                .attr('class', 'modalSmall align-t absolute mr3')
                .attr('id', 'yLabelMax')
                .style('transform', 'translate(-110%, -50%)')
                .text('xxx')

            graph.append('div')
                .attr('class', 'modalSmall bottom absolute mr3')
                .attr('id', 'yLabelMin')
                .style('transform', 'translate(-110%, 50%)')
                // .text('xxx')

            const graphNotation = graph
                .append('div')
                .attr('class', 'events-none absolute modalSmall z5 graphNotation none bg-lighten75 px6 py3');

            graphNotation
                .selectAll('span')
                .data(['OB highlight  mr3', 'IB highlight mr3', 'dashedUnderline', 'block date'])
                .enter()
                .append('span')
                .attr('class', d=>d)
                .attr('id', (d,i)=> i===2 ? 'percent' : '')            

                graph
                .append('div')
                .attr('class', 'absolute h-full hoverLine none events-none')

            const svg = graph
                .append('svg')
                .attr('class', 'graph align-t h180')
                .attr('preserveAspectRatio',  'xMinYMin meet')

            svg
                .selectAll('path')
                .data([['IB', 'capacity'], ['OB', 'riding'], ['dashedUnderline', 'fraction']])
                .enter()
                .append('path')
                .attr('class', d=>d[0])
                .attr('id', d=>d[1])

            graphContainer
                .append('div')
                .attr('class', 'xaxis modalSmall relative')
                .append('div')
                .attr('class', 'mt3')
                .selectAll('span')
                .data(['yesterday fl inline-block', 'midnight opacity25 inline-block', 'today fr inline-block'])
                .enter()
                .append('span')
                .attr('class', d=>d)

        },

        update: function() {

            d3.json('https://peterqliu-past24.web.val.run/', (d) => {
                console.warn(d)
                foo = d.riding
                let {time, capacity, riding, routeBlend} = d;
                s.past24 = d;

                const HHMM = time
                    .map(t=>{
                        const date = new Date(t)
                        return `${app.utils.getCurrent(t, {weekday: 'short'})} ${date.getHours()}:${date.getMinutes() || '00'}`
                    })         
                    
                
                this.updateTimeAxis();
                this.updateUtilization({capacity, riding, HHMM});
                this.updateUtilizationDelta({capacity, riding, HHMM})
                this.updateBlend({blend:routeBlend, riding, HHMM})

            })
        },

        updateTimeAxis: function() {

            // x axis labels
            const today = app.utils.getCurrent(undefined, {weekday: 'short'});
            const yesterday = app.utils.getCurrent(undefined, {weekday: 'short'}, 1);
            const h = parseInt(app.utils.getCurrent(undefined, {hour: 'numeric'}));
            const m = new Date().getMinutes();
            const minsSinceMidnight = 60*h+m;
            const midnightProgress = 1-minsSinceMidnight/(24*60);

            d3.selectAll('.midnight')
                .style('margin-left', `${100*midnightProgress}%`)
                .style('transform', 'translateX(-50%)')

            d3.selectAll('.yesterday')
                .style('margin-left', `${50*midnightProgress}%`)
                .style('transform', 'translateX(-50%)')
                .text(yesterday)

            d3.selectAll('.today')
                .style('margin-right', `${100*minsSinceMidnight/(2*24*60)}%`)
                .style('transform', 'translateX(50%)')
                .text(today)

        },

        updateBlend: function(d) {

            const {blend, riding, HHMM} = d;
            const width = 400;
            const height = 449;
            console.log(blend)
            let tooSmall = {
                r: 'others', 
                riding:new Array(riding.length).fill(0),
                fraction:new Array(riding.length).fill(0)
            };

            let eligibleRoutes = [];

            blend.forEach(route=>{
                
                // const {riding} = route;
                const fraction = route.riding
                    .map((r,i)=> riding[i] ? r/riding[i] : 0);
                // console.log(route.riding, riding)
                const meetsThreshold = fraction.find(f=>f>0.1);
                // console.log(r.riding, tooSmall)
                if (meetsThreshold) eligibleRoutes.push({...route, fraction})
                else {
                    console.log('ts')
                    tooSmall.riding = tooSmall.riding.map((r,rI)=> r+(route.riding[rI]||0)),
                    tooSmall.fraction = tooSmall.fraction.map((f,fI)=> f+(fraction[fI]||0))

                }
            })

            let tempTracker = [];
            let data = [tooSmall, ...eligibleRoutes].map(route => {
                const addStack = {
                    ...route, 
                    // fraction: route.riding.map((r,i)=>r/riding[i]),
                    stacked: route.riding.map((r,i)=> r+tempTracker[i] || 0)
                }
                tempTracker = addStack.stacked;
                return addStack
            })

            console.log(data, eligibleRoutes);
            let yMax = Math.max(...data.map(b=>b.stacked).flat());
            yMax = app.format.graphYAxisExtent(yMax,1);
            const routeBlend = d3.select('#blend');

            routeBlend.select('#yLabel')
                .text(`${yMax/1000}k`);
                
            routeBlend.select('svg')
                .attr('height', 450);

            
            data.reverse().forEach((r,pathIndex) => {
                
                const {stacked, riding, fraction} = r;
                routeBlend.select('svg')
                    .append('path')
                    .datum([0,...stacked,0])
                    .attr('class', 'routePath')
                    .attr('d', d3.line()
                        .x((d,i)=> width * (i-1)/stacked.length)
                        .y((d,i) => height * (1 - (d)/yMax))
                    )
                    // .on('mouseenter', d=>console.log(pathIndex))
                    // .attr('fill', 'red')
                    // .on('mouseenter', (d,highlightedIndex)=>{
                    //     d3.selectAll('g .routePath')
                    //         .attr('fill', (d,i) => highlightedIndex === i ? 'red' : 'blue')

                    // })
            })

            modal.trendView.bindHoverFunctionality(routeBlend, widthFraction => {

                const index = Math.round(riding.length * widthFraction);
                const totalRiders = riding[index];
                const blendAtTime = blend
                    .map(route=>({r:route.r, riders:route.riding[index]}))
                    .filter(r=>r.riders)
                    .sort((a,b)=>b.riders-a.riders)


                d3.selectAll('#blendBar div')
                    .remove();

                d3.select('#blendBar')
                    .selectAll('div')
                    .data(blendAtTime)
                    .enter()
                    .append('div')
                    .attr('class', 'inline-block fl h-full align-center modalSmall color-white')
                    .style('width', d =>`${100*d.riders/totalRiders}%`)
                    .style('line-height', '24px')
                    .text(d=>d.riders/totalRiders>0.05 ? d.r.replace('OWL','🦉') : '');
                    
                return {'.date': HHMM[index]}
            })
        },
        
        updateUtilization: function(d) {

            const {width, height} = c.graph;
            const {capacity, riding, HHMM} = d;
            const fraction = riding.map((r,i)=>r/capacity[i] || 0);

            // const viewBox = [0,0,c.length, height].join(' ');
            const [capacityMax, fractionMax] = [
                app.format.graphYAxisExtent(Math.max(...capacity), 4000), 
                Math.max(...fraction)
            ];

            const utilization = d3.select('#utilization')
            // d3.select('#past24')
                // .attr("viewBox",viewBox)

            utilization.select('#yLabelMax')
                .text(`${capacityMax/1000}k`)

            utilization.select('#capacity')
                .datum(capacity)
                .attr("d", d3.line()
                    .x((d,i)=>width * i/capacity.length)
                    .y(d=>height * (1 - d/capacityMax))
                )

            utilization.select('#riding')
                .datum(riding)
                .attr("d", d3.line()
                    .x((d,i) => width * i/capacity.length)
                    .y(d => height * (1 - d/capacityMax))
                )

            utilization.select('#fraction')
                .datum(fraction)
                .attr("d", d3.line()
                    .x((d,i) => width * i/capacity.length)
                    .y(d => height * (1 - d/fractionMax))
                )
                
            modal.trendView.bindHoverFunctionality(utilization, widthFraction => {
                const index = Math.round(riding.length * widthFraction);
                const [r, c] = content = [riding[index], capacity[index]]
                    .map(app.format.trendPopulation)
                const f = fraction[index];
                return {
                    '.IB': c,
                    '.OB': r,
                    '.date': HHMM[index],
                    '#percent': `${Math.round(100*f)}%`
                }
            })

        },

        updateUtilizationDelta: function(d) {

            const {width, height} = c.graph;
            const {riding, capacity, HHMM} = d;
            
            const [ridingDeltas, capacityDeltas] = [riding, capacity]
                .map(app.utils.derivative);

            const [min, max] = d3.extent([...ridingDeltas, ...capacityDeltas])
                .map(d => app.format.graphYAxisExtent(d, 1000));
            const extent = max-min;
            
            const utilizationFlux = d3.select('#utilizationFlux');

            utilizationFlux.select('#yLabelMax')
                .text(`+${max/1000}k`);

            utilizationFlux.select('#yLabelMin')
                .text(`${min/1000}k`);
            console.log(extent, min, max)
            const xAxisOffset = height*min/extent;



            utilizationFlux
                .select('.xaxis')
                .style('transform', `translateY(${xAxisOffset}px)`);
                
            utilizationFlux
                .select('#capacity')
                .datum(capacityDeltas)
                .attr("d", d3.line()
                    .x((d,i) => width * i/capacity.length)
                    .y(d => height * (1 - (d-min)/extent))
                )

            utilizationFlux
                .select('#riding')
                .datum(ridingDeltas)
                .attr("d", d3.line()
                    .x((d,i) => width * i/capacity.length)
                    .y(d => height * (1 - (d-min)/extent))
                )
            modal.trendView.bindHoverFunctionality(utilizationFlux, widthFraction => {
                const index = Math.round(riding.length * widthFraction);
                const [r, c] = content = [ridingDeltas[index], capacityDeltas[index]]
                    .map(app.format.trendPopulation)
                const f = fraction[index];
                return {
                    '.IB': c,
                    '.OB': r,
                    '.date': HHMM[index],
                    // '#percent': `${Math.round(100*f)}%`
                }
            })
        },

        bindHoverFunctionality: function(element, cb) {

            element.select('svg')
                .on('mousemove', () => {

                    const {layerX} = d3.event;
                    const {graph:{width, height}} = c;
                    const widthFraction = layerX/width; 

                    element.select('.hoverLine')
                        .style('transform', `translateX(${layerX}px)`)
                    const graphNotation = element.select('.graphNotation');
                    
                    if (cb) {
                        Object.entries(cb(widthFraction))
                            .forEach(([selection, text])=>{
                                graphNotation.select(selection)
                                    .text(text)
                            })
                    }

                })
        }
    }
}