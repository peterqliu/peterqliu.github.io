const modal = {
    element: document.getElementById('modal'),
    init: function() {

        d3.selectAll('.tab')
            .on('click', (d,i)=>{
                app.setState('activeTab', i)
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
        modal.trendTab.createGraph(d3.select('#utilization'))
        modal.trendTab.createGraph(d3.select('#utilizationFlux'))
        modal.trendTab.createGraph(d3.select('#occupancy'))

    },

    routeView: {
        
        title:d3.select('#routeName'),
        subtitle: d3.select('#routeDir'),
        description: d3.select('#description'),
        routeStops: d3.select('#routeStops'),
        routeBuses: d3.select('#routeBuses'),
        
        updateStops: function() {

            const {route:{name, id}, dir:{dirNameShort}, direction} = s.activeBus;
            const {routeView:{title, description, subtitle, routeStops}} = modal;
            const {activeRouteGeometry:{stopIds}, customLayer:{ highlightStop }} = s;


            description.text(c.routeData[id].description.split('(')[0])
            title.text(name);
            subtitle.text(dirNameShort);

            d3.select('.routeView').node().scroll(0,0);

            d3.select('#directionText')
                .attr('class', `${direction} directionText highlight`)

            routeStops
                .selectAll('.routeStop')
                .remove();

            let routeData = stopIds.map(id=>({id, ...c.stopData[id]}))
            routeData = app.format.sameStreetSecond(
                routeData, 
                s=>s.name, 
                (s, formatted) => {s.name = formatted; return s}
            );
            const rS = routeStops
                .selectAll('.routeStop')
                .data(routeData)
                .enter()
                .append('div')
                .attr('class', 'listEntry routeStop')
                .on('click', (d)=>{
                    app._map.panTo(d.lngLat);
                    highlightStop(d)
                });

            rS
                .append('div')
                .attr('class', 'notation modalSmall px3')
                .text((d,i) => {

                    if (!i) return
                    const { activeRouteGeometry:{totalLength,stopDistances}} = s;
                    const stepwiseDistance = stopDistances[i]-stopDistances[i-1];
                    return app.format.distance(stepwiseDistance*totalLength);

                });
                
            rS
                .append('div')
                .attr('class', 'body dark ml30 mr60')
                .text(({name})=>name)

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
                    let matchingStopIndex = s.activeRouteGeometry.stopIds.indexOf(currentStopTag)

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

                    if (routeSet[name].lineVars[lineVar].data){
                        const pathPoints = routeSet[name].lineVars[lineVar].data.path.geometry.coordinates;
                        const busProgress = ruler.pointOnLine(pathPoints, lngLat).t;
                        routeSet[name][direction].title =dirNameShort;
                        routeSet[name][direction].buses.push({busProgress, linkedVehicleIds, vehiclePosition,direction})
                    }
                })


            let extantRoutes = extantRouteGeometry();


            app._map.getSource('systemViewRoutes')
                .setData({type:"FeatureCollection",features:extantRoutes});
            
            app._map.getSource('ext')
                // .setData({type:"FeatureCollection",features:extantRoutes.map(l=>turf.buffer(l, 0.005))});


            const data = Object.keys(routeSet).sort()
                .map(route=>({route, ...routeSet[route]}), ({route})=>route);

            // console.log(data)
            const r = {
                append: 'section',
                attr: {class: d=> `route listEntry`},
                data: [data, d=>d.route],
                exitFn: selection => selection.remove(),
                on: {click:(d)=>{
                    const {line} = d;
                    const matchingMarker = s.mesh.markers
                        .find(m=>m.userData.route.id ===line);

                    app.setState('mode', 'focus');
                    app.setState('activeRoute', matchingMarker.userData);
                    app.setState('activeTab', 0);

                    app._map.fitBounds(s.activeRouteGeometry.bounds)
                }},

                children: [
                    {
                        append:'div',
                        attr:{class:'subtitle'},
                        text: d=>d.route,
                        children:[{
                            append: 'div',
                            data: [d=>([d.OB, d.IB])],
                            attr:{class:'direction pt6'},
                            children:[
                                {
                                    append: 'div',
                                    style: {'transform': (d,i) => i ? 'none' : 'rotate(180deg)'},
                                    klass: 'directionBar',
                                    // attr:{class:'directionBar', style: ['transform', (d,i) => i ? 'none' : 'rotate(180deg)']},
                                    children: [
                                        {
                                            append: 'div',
                                            klass:'barExtent',
                                            children: [{
                                                append: 'div',
                                                exitFn: selection=>selection.remove(),
                                                updateFn: selection => selection.style('opacity', 1).style('transform',  ({busProgress})=>{return `translate(${0}%)`}),
                                                style: {transform: ({busProgress})=> `translate(${busProgress*100}%)`},
                                                attr:{class:d=>`${d.direction.toLowerCase()} animateTransform absolute left quiet marker`},
                                                data: [d=>d.buses, b=>b.linkedVehicleIds]
                                            }]
                                        }
                                    ]
                                }
                            ]
                        }]
                    },

                    // route direction label
                    {
                        append: 'div',
                        attr:{class:'directionLabel modalSmall pt6'},
                        children: [{
                            append: 'span',
                            data: [d=>[d.OB, d.IB]],
                            text: (d,i)=>format.dirName(d.title),
                            attr:{class:(d,i)=>i ? 'fr': ''}
                        }]

                    }
                ]

            }

            d3UI(d3.select('#routeList'), r)


            // UPDATE bus marker positions
            // d3.select('#routeList')
            //     .selectAll('.marker')
            //     .style('transform',  ({busProgress})=>{return `translate(${busProgress*100}%)`});

            // REMOVE obsolete routes, and buses
            // routes.exit().remove();
            // markers.exit().remove();
        }
    },
    vehicleTab: {
        OB: document.querySelector('#ob'),
        IB: document.querySelector('#ib'),
        riders: document.querySelector('#riderCount'),
        capacity: document.querySelector('#capacityCount'),
        updateTicker: function(newState) {

            const {diff} = s;
            const tickerEntries =  d3.select('#ticker')
                .selectAll('.listEntry');

            const updatedData = [...diff, ...tickerEntries.data()].slice(0,30);
            const arrivalsHeight = `translateY(-${diff.length*68}px)`;

            const l = {
                append:'div', 
                data: [updatedData, d=>d.tickerKey], 
                attr: {class:'listEntry tickerEvent animateTransform txt-nowrap wmax360 overflow-hidden opacity0'}, 
                style:{transform:arrivalsHeight, transition:'none'},
                exitFn: d=>d.remove(),
                on: {click:d=>app._map.easeTo({center:d.lngLat})},
                children: [
                    {
                        append:'span',
                        html: ({event, route, vehicleType, id, stopName, direction})=>{
                            const vehicle = app.format._vehicleType(vehicleType);
                            const titles = {
                                arrival: `Boarding at <span class="dark">${stopName}</span>`,
                                online: `New ${vehicle} #${id}`,
                                online: `Offline: ${vehicle} #${id}`,
                                newRoute: `#${id} now on route ${route.id}`,
                                switchDirection: `Turnaround: ${vehicle} #${id} now <span class="${direction} directionText highlight txt-lowercase"></span>`
                            }

                            return titles[event]
                        },
                        attr: {class:'block body strong'}
                    },
                    {
                        append:'span',
                        text: ({route, direction}) => `${c.routeData[route.id].title}`,
                        attr: {class: ({direction}) => `${direction} modalSmall highlight`}
                    },
                    {
                        append:'span',
                        text: ({dirName}) => ` to ${dirName}`,
                        attr: {class: `modalSmall`}
                    }
                ]
            }
            
            d3UI(d3.select('#ticker'), l)
            d3.selectAll('.tickerEvent')
                .style('transform', arrivalsHeight)
                .style('transition', 'none')


            setTimeout(()=>d3.selectAll('.tickerEvent').style('transform', 'none').style('transition', 'all 1s').classed('opacity0',false), 50)
            // console.log(arrivals.length, ot)
        }
    },
    trendTab: {

        tooltip: d3.select('.tooltip'),

        createGraph: function(container) {

            const l = {
                append: 'div',
                attr: {class:'inline-block hoverChildVisible relative'},
                children: [
                    // {
                    //     append:'div',
                    //     attr: {class:'relative cursor-crosshair'}
                    // },
                    {
                        append:'div',
                        attr: {class:'modalSmall align-t absolute mr3', id:'yLabelMax'},
                        style:{ transform:'translate(-110%, -50%)'},
                        // text: '100%'
                    },
                    {
                        append:'div',
                        attr: {class:'modalSmall bottom absolute mr3', id:'yLabelMin'},
                        style:{ transform:'translate(-110%, -50%)'},
                    },
                    {
                        append:'div',
                        attr:{class:'absolute h-full hoverLine none events-none z5'}
                    },

                    {
                        append:'div',
                        attr:{class:'relative cursor-crosshair'},
                        children: [
                            {
                                append:'div',
                                attr:{class:'timeLines z-neg1'}
                            },
                            {
                                append: 'svg',
                                attr:{class:'graph yaxis align-t h180 z5', preserveAspectRatio:'xMinYMin meet'},
                                children: [
                                    {
                                        append:'path',
                                        data: [[['IB', 'capacity'], ['OB', 'riding'], ['dashedUnderline', 'fraction']]],
                                        attr: {class:d=>d[0], id: d=>d[1]}
                                    }
                                ]
                            },
                             // graphNotation
                            {
                                append:'div',
                                attr: {class:'events-none absolute modalSmall z5 graphNotation none bg-lighten75 px6 py3'},
                                children: [
                                    {
                                        append: 'span',
                                        data: [['OB highlight  mr3', 'IB highlight mr3', 'dashedUnderline', 'block date']],
                                        attr: {class:d=>d, id:(d,i)=> i===2 ? 'percent' : ''}
                                    }
                                ]
                            },
                        ]
                    },
                    {
                        append:'div',
                        attr:{class:'xaxis modalSmall relative events-none pt6 h12 mb12'},
                        children:[{append:'div'}]
                    }
                ]
            }

            d3UI(container, l);
        },

        update: function() {

            d3.json('https://peterqliu-past24.web.val.run/', (d) => {

                // foo = d.riding
                let {time, capacity, riding, occupancy, routeBlend} = d;
                s.past24 = d;

                const HHMM = time
                    .map(t=>{
                        const date = new Date(t)
                        return `${app.utils.getCurrent(t, {weekday: 'short'})} ${date.getHours()}:${date.getMinutes() || '00'}`
                    })         
                    
                
                this.updateTimeAxis();
                this.updateUtilization({capacity, riding, HHMM});
                // this.updateUtilizationDelta({capacity, riding, HHMM})
                this.updateOccupancy({occupancy, HHMM})
                // this.updateBlend({blend:routeBlend, riding, HHMM})

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

            const axis = d3.selectAll('.xaxis');
            const timeData = (['6am', '12pm', '6pm', '🌙'])
                .map((d,i)=>({d, p:`${100*(midnightProgress+(i+1)*0.25)%100}%`}));

            const xAxisLines = {
                append:'span',
                attr:{class:'absolute transformCenterX bg-white'},
                data:[timeData],
                text:d=>d.d,
                style:{'margin-left': d=>d.p}
            }

            d3UI(axis, xAxisLines)

            d3UI(d3.selectAll('.timeLines'), {
                append:'div',
                data: [timeData], 
                attr:{class:`absolute h-full timeLine border-l transformCenterX`},
                style:{'margin-left': d=>d.p}
            })

        },

        updateBlend: function(d) {

            const {blend, riding, HHMM} = d;
            const width = 400;
            const height = 449;

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
                const meetsThreshold = fraction.find(f=>f>0.1);

                if (meetsThreshold) eligibleRoutes.push({...route, fraction})
                else {
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

            // console.log(data, eligibleRoutes);
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
                    .datum([0,...stacked, stacked[stacked.length-1], 0])
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

            modal.trendTab.bindHoverFunctionality(routeBlend, widthFraction => {

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
                
            modal.trendTab.bindHoverFunctionality(utilization, widthFraction => {
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

            utilizationFlux
                .select('.xaxis')
                .classed('pt6', false)
                .selectAll('span')
                .style('transform', 'translate(-50%, -50%)');
            
            modal.trendTab.bindHoverFunctionality(utilizationFlux, widthFraction => {
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

        updateOccupancy: function(d) {

            const {width, height} = c.graph;
            const {occupancy, HHMM} = d;
            const {sumArray, crossCutNestedArray} = app.utils;
            
            const occupancySums = occupancy.map(sumArray);
            const occupancyProportions = occupancy.map((array,aI)=>array.map(n=>n/occupancySums[aI]));
            const occupation = d3.select('#occupancy');


            let tempAccumulator = new Array(occupancy.length).fill(0);

            // stacked plots
            const plots = crossCutNestedArray(occupancyProportions)
                .map((plot,index)=>{
                    tempAccumulator = plot.map((p,pI)=>p+tempAccumulator[pI]);
                    return tempAccumulator
                })
                .slice(0,3)
                .reverse();


            const stackedColors = new Array(plots.length+1).fill(1)
                .map((p,pI) => d3.interpolateRgb(c.color.IB, "white")((pI)/(plots.length*2)));




            const graph = occupation.select('.graph');
            var hoveredIndex;

            graph
                .append('rect')
                .attr('width', 999)
                .attr('height', 999)
                .attr('fill', c.color.IB)

            graph
                .selectAll('.stackedPath')
                .data(plots)
                .enter()
                .append('path')
                .datum(plot=>[-10,...plot, plot[plot.length-1], -10])
                .attr('d', d3.line()
                    .x((d,i) => width * (i-1)/plots[1].length)
                    .y(d => height * (1 - d))
                )
                .style('fill', (d,i)=>stackedColors[i+1])
                .attr('class', 'stackedPath')
                .on('mousemove', (d,i)=>hoveredIndex = i+1)
            

            modal.trendTab.bindHoverFunctionality(occupation, widthFraction => {

                if (!document.querySelector('path:hover')) hoveredIndex = 0;
                const index = Math.round(occupancy.length * widthFraction);

                const plotIndex = 6-3-hoveredIndex;
                const percentage = occupancyProportions[index][plotIndex]
                return {
                    '.IB': [Math.round(percentage*100), '% of fleet was ', c.occupancy.descriptor[hoveredIndex].toLowerCase()].join(''),
                    '.date': HHMM[index],
                }
            })

            occupation.select('.xaxis')
                .classed('xaxis', false)
            occupation.select('.yaxis')
                .classed('yaxis', false)

            d3UI(occupation, 
                {
                    append: 'div',
                    klass: 'legend justify mb3 mt12',
                    children:[{
                        append:'span',
                        data:[stackedColors],
                        style: {background:d=>d},
                        klass: 'px6 mr6 color-white  inline-block',
                        text: (d,i)=>c.occupancy.descriptor[i]
                    }]
                }
            )
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

function d3UI(parentSelection, structure) {

    iterateLevel(parentSelection, structure)

    function iterateLevel(selection, list) {

        let {append, klass, data, text, html, attr, style, on, exitFn, updateFn} = list;
        let children = selection;

        if (data) {
            if (!data.length) data = [data]

            children = children
                .selectAll(append)
                .data(...data)

            if (exitFn) exitFn(children.exit())
            if (updateFn) updateFn(children)

            children = children.enter()
        }


        children = children
            .append(append);

        // attach class (special shortcut without the attr method, but doable there too)
        if (klass) children.attr('class', klass)
        
        // attach styles (special shortcut without the attr method, but doable there too)
        if (style) Object.entries(style).forEach(([k,v])=>children.style(k,v))


        // attach attr's
        if (attr) {
            Object.entries(attr)
            .forEach(([k,v])=>children.attr(k,v))
        }

        // attach text and html
        if (text) children.text(text)
        if (html) children.html(html)


        // attach events
        if (on) {
            Object.entries(on).forEach(([k,v]) => {
                children.on(k, v)
            })
        }

        if (list.children) list.children.forEach(c=>iterateLevel(children, c))

    }
}