

    var token = mapboxgl.accessToken = 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImNqdHE0cXByZDAzaWY0NHBldG9yd3Jld28ifQ.8dISItctShjFnmnVeAgW2A';

    var map = new mapboxgl.Map({
        hash: true,
        container: 'map', // container id
        style: 'mapbox://styles/mapbox/light-v9', // stylesheet location
        center: [-74.50, 40], // starting position [lng, lat]
        zoom: 9 // starting zoom
    });

    var dendrite = new mapboxgl.Map({
        container: 'dendrite', // container id
        style: 'mapbox://styles/peterqliu/cjdxv0cbr5b0y2rpfy6pokf72', // stylesheet location
        center: [0,0], // starting position [lng, lat]
        zoom: 16 // starting zoom
    });

    // var timeline = new mapboxgl.Map({
    //     container: 'timeline', // container id
    //     style: 'mapbox://styles/peterqliu/cjdxv0cbr5b0y2rpfy6pokf72', // stylesheet location
    //     center: [0,0], // starting position [lng, lat]
    //     zoom: 5 // starting zoom
    // });





    // timeline.on('load', function(){
    //     timeline
    //     .addLayer({
    //         'id':'background',
    //         'type': 'background',
    //         'paint': {
    //             'background-color': '#BACAD5'
    //         }
    //     })
    //     .addLayer({
    //         'id': 'labels',
    //         'type': 'symbol',
    //         'source':{
    //             'type': 'geojson',
    //             'data': turf.featureCollection(state.timeline)
    //         },
    //         'paint':{
    //             'text-color': '#FfFef9'
    //         },
    //         'layout':{
    //             'text-font':["Open Sans Bold","Arial Unicode MS Regular"],
    //             'text-field':'{time}'
    //         }
    //     })
    // })

    dendrite.on('load', function(){

        dendrite
        .addSource('routes', {
                'type': 'geojson',
                'data': turf.featureCollection([])
            })
        .addSource('nodes', {
                'type': 'geojson',
                'data': turf.featureCollection([])
            });

        dendrite
            .addLayer({
                'id':'background',
                'type': 'background',
                'paint': {
                    'background-color': '#FfFef9'
                }
            })
            .addLayer({
                'id': 'guide',
                'type': 'line',
                'source': {
                    'type': 'geojson',
                    'data': turf.featureCollection(state.timeline)
                },
                'paint':{
                    'line-opacity': 0.25,
                    'line-width':{
                        'property':'klass',
                        'stops':[
                            [{zoom: 0, value: 0}, 1],
                            [{zoom: 0, value: 1}, 0],
                            [{zoom: 7.999, value: 0}, 1],
                            [{zoom: 7.999, value: 1}, 0],
                            [{zoom: 8, value: 0}, 4],
                            [{zoom: 8, value: 1}, 1.5],
                        ]
                    },
                    'line-color':'#BACAD5',
                    //'line-dasharray': [0,3]
                },
                'layout':{
                    'line-cap': 'round'
                }
            })
            .addLayer({
                'id':'guideLabel',
                'type': 'symbol',
                'filter':['==', 'klass',0],
                'source':'guide',
                'layout':{
                    'text-field':'{time} MIN'
                },
                'paint':{
                    'text-color':'#BACAD5',
                    'text-halo-color':'#FfFef9',
                    'text-halo-width':2
                }
            })
            .addLayer({
                'id': 'tree_edges',
                'type': 'line',
                'source': 'routes',
                'layout':{
                    'line-cap': 'round'
                },
                'paint':{
                    'line-width':{
                        //'property': 'width',
                        'base':1.5,
                        'stops':[
                            [0,1], [16,32]
                        ]
                    },
                    'line-color': '#EDE9DA',
                    'line-opacity':1
                }
            })
            .addLayer({
                'id': 'tree_nodes',
                'type': 'circle',
                'source': 'nodes',
                'paint':{
                    'circle-color': {
                        'property': 'direction',
                        'type': 'categorical',
                        'stops':[
                            ['left', '#AA3345'],
                            ['right', '#41A6B2']
                        ]
                    },
                    'circle-radius':{

                        'stops':[[0,0.2], [16,8]]
                    }                  
                }
            })
            .addLayer({
                'id': 'tree_node_cores',
                'type': 'circle',
                'filter': ['!=', 'relativePosition', 0],
                'source': 'nodes',
                'paint':{
                    'circle-stroke-width':{
                        'stops':[[0,0.2], [16,4]]
                    },     
                    'circle-stroke-color':{
                        'property': 'direction',
                        'type': 'categorical',
                        'stops':[
                            ['left', '#AA3345'],
                            ['right', '#41A6B2']
                        ]
                    },
                    'circle-radius':{
                        'stops':[[0,0.1], [16,4]]
                    },
                    'circle-color': '#FfFef9'              
                }
            })
            .addLayer({
                'id': 'node_text',
                'type': 'symbol',
                'source': 'nodes',
                'minzoom':12,
                'layout':{
                    'text-font':["Open Sans Semibold","Arial Unicode MS Regular"],
                    'text-field': '{instruction}',
                    'text-offset':[1,0],
                    'text-justify': 'left',
                    'text-anchor':'left',
                    'text-size':12,
                    'text-allow-overlap':false
                },
                'paint':{                  
                    'text-color': '#999'
                }
            })            
            .addLayer({
                'id': 'point',
                'type': 'circle',
                'source': {
                    'type': 'geojson',
                    'data': turf.point([0,0])
                },
                'paint':{
                    'circle-radius': {
                        'base':2,
                        'stops':[[0,6], [16,30]]
                    },
                    'circle-color': '#BACAD5'
                }
            })
            .addLayer({
                'id': 'tree_edge_labels',
                'type': 'symbol',
                'minzoom':3,
                'source': 'routes',
                'layout':{
                    'text-font':["Open Sans Semibold","Arial Unicode MS Regular"],
                    'text-transform': 'uppercase',
                    'text-field':'{name}',
                    'symbol-placement':'line',
                    'text-size':{
                        'stops':[[0,6], [16,20]]
                    },
                    //'text-keep-upright': false,
                    'text-ignore-placement': false,
                    'text-letter-spacing':{
                        'stops':[[0,0], [16,0.07]],
                    },
                    'text-max-angle':60,
                    //'text-allow-overlap': true,
                    'symbol-spacing':{
                        'base':1.5,
                        'stops':[[0,15], [16,300]],
                    }
                },
                'paint':{
                    'text-color':'rgba(184,174,140,1)'
                }
            })
    })
    .on('click', 'tree_edges', function(e){
        console.log(e.features.map((ft)=>{return ft.properties.instruction}))
    })
    // .on('move', function(){
    //     timeline.jumpTo({center: [dendrite.getCenter().lng,0], zoom:dendrite.getZoom()})
    // })
