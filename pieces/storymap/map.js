mapboxgl.accessToken = 'pk.eyJ1IjoicGV0ZXJxbGl1IiwiYSI6ImNqdHJqdG92OTBkNTg0M3BsNDY0d3NudWcifQ.0z4ov_viFE-yBMSijQpOhQ';

const map = new ExpressML(mapboxgl).Map({
    style:'mapbox://styles/peterqliu/cm3va5r50000r01sl52u7a6va',
    hash:true,
    container: 'map', // container ID
    center: [-74.5, 40], // starting position [lng, lat]. Note that lat must be set between -90 and 90
    zoom: 9 // starting zoom
});

map.setProjection('mercator')

map.on('load', ()=> {
    console.log('vanilla load', map.loaded())
    map.addSource('dists',  {
        type:'vector',
        url:'mapbox://peterqliu.3836hc4x'
    });

    map
    .addLayer({
        id:'reference-layer',
        type: 'fill',
        source:'dists', 
        'source-layer': 'districts',
        // filter:['==', 'nothing', 'by default'],
        layout:{
            // visibility: 'none'
        },
        paint: {
            'fill-opacity':0.00000001,
        }
    })
    .addLayer({
        id:'district-fill',
        type: 'fill',
        source:'dists', 
        'source-layer': 'districts',
        paint: {
            'fill-opacity':0.5,
            'fill-color':'#dedede'
            // 'fill-extrusion-pattern':
            // [
            //     'case',
            //     ['==', ['get', 'district'], '-1'],
            //     'crosshatch',
            //     null
            // ]
            // 'fill-color':'steelblue'

        }
    }, 'place-label')
    .addLayer({
        id:'native-land',
        type: 'fill',
        source:'dists', 
        'source-layer': 'districts',
        paint: {
            'fill-pattern':'crosshatch',
            'fill-opacity':0.1
        }
    }, 'place-label')
    .addLine('district-lines', {
            source: 'dists',
            'source-layer':'districts',
            color:'#dedede',
            width: {stops:[[0,0.5],[12,3]]},
            // opacity:0.25
    }, 'place-label')


    .addLine('atLarge', {
        source:'dists', 
        'source-layer': 'districts',
        filter:['has', 'none'],
        color: 'blue',
        width: {stops:[[0,2],[12,6]], base:1.5},
        // dasharray:[0,3],
        cap:'round'
    }, 'place-label')
    .addLayer({
        id: 'poles',
        type: 'symbol',
        filter:['!', ['has', 'point_count']],
        source: {
            type:'geojson',
            // cluster:true,
            // clusterRadius:15,
            data: {
                "type": "FeatureCollection",
                "features": []
            }
        },
        layout:{
            'text-field':['get', 'dots'],//'●',
            'text-size':{stops:[[0,12],[12, 500]], base:2},
            'text-allow-overlap': true,
            'text-line-height':0.5,
            visibility: 'none'
            // 'text-pitch-alignment': 'map'
        },
        paint: {
            'text-color':'blue',
            'text-halo-color':'white',
            'text-halo-width':2,
            'text-opacity':0.9999
            // 'circle-radius': {stops:[[0,2],[10, 12]], base:1.5}
        }
    })
    .addIcon('portraits', {
        image:['get', 'icon'],
        'allow-overlap': true,
        'ignore-placement':true,
        visibility: 'none',
        padding:0
    })
        // .addLayer({
        //     id:'district-extrude',
        //     type: 'fill-extrusion',
        //     source:'dists', 
        //     'source-layer': 'districts',
        //     filter:['==', 'id', 'abc'],
        //     paint: {
        //         // 'fill-opacity':0.7,
        //         'fill-extrusion-color':'white',
        //         'fill-extrusion-height':10000
        //     }
        // })

    console.warn('setting session')
    map.once('render', ()=>{setSession(0); fitSessionBounds()})
})
map.on('click',  e=>{

    const [ft] = foo = map.queryRenderedFeatures(e.point, {layers:['district-fill']})
    console.warn('clicked fts', foo.map(f=>f.properties))

    if (ft) {

        setMapFocus(ft)
    
        setModalFocus(ft)
        // viewStateHistory(ft.properties.statename)
    }

    // viewSpotHistory(e)
})
.on('mousemove',  e=>{

    if (state.colorMode === 'dots') {
        const [ft] = map.queryRenderedFeatures(e.point, {layers:['district-fill']})
        if (ft) {
            const {properties:{statename, district}} = ft;
            d3.select('.mapboxgl-popup-content')
                .html(`<b>${statename} district #${district}</b><br><i>Click to see detail</i>`)
            state.popup.setLngLat(e.lngLat)

        }
    }
})


// function setPopup(lngLat, [header, subhead1, subhead2]) {

//     state.popup = new mapboxgl.Popup({
//         closeButton: false
//     })
//         .setLngLat(lngLat)
//         .setHTML(`<b>${header}</b><div>${subhead1}</div>`)
//         .addTo(map);
// }

// set map focus on highlighted district
function setMapFocus(ft) {
    const isFills = state.colorMode === 'fills'
    if (isFills){
        map.setPaintProperty(
            'district-fill', 
            'fill-opacity', 
            [
                'case',
                ['==', ['get', 'id'], ft?.properties?.id || null],
                0,
                0.5
            ]
        )
    }
        if (!ft) {
            clearPreviousHover(); 
            return
        }

        const {properties:{id}} = ft;
        const newHighlightName = `highlight-${id}`;
        const newHover = ft && !map.getLayer(newHighlightName);

        if (state.activeId) {
            if (!ft || newHover) clearPreviousHover();
        }


        if (newHover) {

            // d3.selectAll('.zoomed')
            //     .style('display', 'block');

            state.activeId = id
            const {_containerWidth} = map;

            map.fitBounds(geomData[id].b, {    
                padding: {top: 20, bottom: 150, left: _containerWidth/5, right: _containerWidth/5}, 
                linear:true, 
                pitch: isFills ? 30: 0,
                duration:600,
                // maxZoom: map.getZoom()
            })
            
            map
                .addLayer({
                    id:newHighlightName,
                    type: 'fill-extrusion',
                    source:'dists', 
                    'source-layer': 'districts',
                    filter:['==', 'id', ft.properties.id ],
                    paint: {
                        'fill-extrusion-opacity': isFills ? 0.9 : 0.25,
                        'fill-extrusion-color':map.getPaintProperty('district-fill', 'fill-color'),
                        'fill-extrusion-height':0
                    }
                },'place-label')

                .setPaintProperty(
                    newHighlightName, 
                    'fill-extrusion-base',
                    isFills ? {stops:[[0,68000],[14,6800]]} : 0
                )
                .setPaintProperty(
                    newHighlightName, 
                    'fill-extrusion-height',
                    isFills ? {stops:[[0,70000*2],[14,7000*1]]}: 1
                )

            
        }



}

function fitSessionBounds(){
    const sessionBounds = [minX, minY, maxX, maxY] = sessionInfo[state.activeSession].b;
    sessionBounds[2] = Math.min(maxX, -65);
    map.fitBounds(sessionBounds, {pitch:0, linear:true, duration:900});
}


function clearPreviousHover() {
    if (!state.activeId) return
    const layerToRemove = `highlight-${state.activeId}`;
    map.setPaintProperty(layerToRemove, 'fill-extrusion-height',0)
        .setPaintProperty(layerToRemove, 'fill-extrusion-opacity',0)
    setTimeout(()=>{if (map.getLayer(layerToRemove)) map.removeLayer(layerToRemove)},300)
    state.activeId = undefined;

}