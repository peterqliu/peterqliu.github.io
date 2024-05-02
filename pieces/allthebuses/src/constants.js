var s = {

    mode: 'inactive',
    showLabels: false,
    center: [-122.44, 37.77],
    zoom: 13,
    pitch:0,
    activeRoute: false,
    routeDrawStart: Date.now(),

    requestsInFlight:0,
    initScene: false,

    highlightedBus: {
        uuid: null, 
        routeId: null,
        startTime: null,
        markerObj: null
    }
}
var c = {
    fullBounds:[
        [-122.51981158087418,37.73448595445758],
        [-122.35330876278951,37.830708228670474]
    ],
    labelZoomThreshold:14,
    animationDuration: 500,
    markerScale: 0.000002,
    emptyGeojson: {type:"FeatureCollection",features:[]},
    color: {
        'IB':'rgba(170, 51, 69, 1)',
        'OB': 'rgba(65, 166, 178, 1)',
        'weak':'#BAB49D'
    },
    sceneTranslate: mapboxgl.MercatorCoordinate.fromLngLat(
        s.center,
        0
    ),
    routeData:{

    },
    customLayer: {

        id: '3d-model',
        type: 'custom',
        renderingMode: '3d',
        onAdd: (map, gl) => buildRenderer(gl, ()=>{}),

        render: (gl, matrix) => {

            var m = new THREE.Matrix4().fromArray(matrix);
            var l = new THREE.Matrix4()
                .makeTranslation(
                    c.sceneTranslate.x,
                    c.sceneTranslate.y,
                    c.sceneTranslate.z
                )

            s.customLayer.camera.projectionMatrix = m.multiply(l);
            if (s.animatingBuses) s.customLayer.animateBus();
            s.customLayer.renderer.render(s.customLayer.scene, s.customLayer.camera);

        }
    },
    material: {
        inactive: new THREE.MeshBasicMaterial( { 
            color: 0xBAB49D, 
            opacity:0.5, 
            transparent:true, 
            side: THREE.DoubleSide,
            // depthWrite:false  
        }),
        inactiveHover: new THREE.MeshBasicMaterial( { 
            color: 0xBAB49D, 
            opacity:0.75, 
            transparent:true,                    
            side: THREE.DoubleSide,
            // depthWrite:false  
        }),
        IB: new THREE.MeshBasicMaterial( { 
            color: 0xaa3345,            
            opacity:0.75, 
            transparent:true,
            side: THREE.DoubleSide,
            // depthWrite:false  
        } ),
        OB: new THREE.MeshBasicMaterial( { 
            color: 0x41a6b2,            
            opacity:0.75, 
            transparent:true,
            side: THREE.DoubleSide,
            // depthWrite:false  
        } ),

        text: new THREE.MeshBasicMaterial( { 
            color: 0xf0eed9, 
            side: THREE.BackSide,
            // transparent:true,
            opacity:0.7,
            // depthWrite:false,
            // depthTest: false 
        } )
    },

    geometry: {
        bus: null,
        label: {}
    } 
}

c.style = {
    focus:[
        ['route', 'line-width', {stops:[[12,1], [22,20]]}],
        ['stops', 'circle-stroke-width', {stops:[[12,1], [22,20]]}],
        ['stops', 'circle-radius', {stops:[[12,1], [22,20]]}],
        // ['buses', 'circle-color', c.color.weak],
        ['bus_labels', 'text-opacity', 1]
    ],
    active:[
        ['route', 'line-width', {stops:[[12,1], [22,20]]}],
        ['stops', 'circle-stroke-width', {stops:[[12, 1], [22,20]]}],
        ['stops', 'circle-radius', 0],
        // ['buses', 'circle-color', c.color.weak],
        ['bus_labels', 'text-opacity', 0]
    ],
    inactive:[
        ['route', 'line-width', 0],
        ['stops', 'circle-stroke-width', 0],
        ['stops', 'circle-radius', 0],
        ['buses', 'circle-color', {
            'property': 'direction',
            'type':'categorical',
            'stops':[['IB', c.color.IB], ['OB', c.color.OB]]
        }],
        ['bus_labels', 'text-opacity', 0]
    ]
}
