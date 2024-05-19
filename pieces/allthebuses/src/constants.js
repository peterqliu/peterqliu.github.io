var s = {

    mode: 'inactive',
    showLabels: false,
    center: [-122.44, 37.77],
    zoom: 13,
    pitch:0,
    activeRoute: false,
    get activeRouteGeometry(){
        const {activeRoute:[line, direction, specific, pathTag]} = s;
        const route = c.routeData[line]
		// fall back to generic IB/OB if specific direction not found
		var routeDirection = route[specific] || route[direction];

		return routeDirection 
    },
    routeDrawStart: Date.now(),

    requestsInFlight:0,
    initScene: false,

    highZoomSizeAttenuation:{value:1.0},
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
        'IB':'rgb(170, 51, 69)',
        'OB': 'rgb(65, 166, 178)',
        'weak':'#BAB49D'
    },
    sceneTranslate: mapboxgl.MercatorCoordinate.fromLngLat(
        s.center,
        0
    ),
    pathData: {},
    routeData:{

    },
    customLayer: {

        id: '3d-model',
        type: 'custom',
        renderingMode: '3d',
        onAdd: (map, gl) => buildRenderer(gl, ()=>{}),

        render: (gl, matrix) => {

            var m = new THREE.Matrix4().fromArray(matrix);
            const {sceneTranslate:{x,y,z}} = c;
            var l = new THREE.Matrix4()
                .makeTranslation(x,y,z)

            s.customLayer.camera.projectionMatrix = m.multiply(l);
            if (s.animatingBuses) s.customLayer.animateBus();
            s.customLayer.renderer.render(s.customLayer.scene, s.customLayer.camera);

        }
    },
    material: {
        inactive: new THREE.ShaderMaterial( { 
            // opacity:0.5, 
            transparent:true, 
            side: THREE.DoubleSide,
            uniforms: {
                highZoomSizeAttenuation: s.highZoomSizeAttenuation
            },
            onBeforeCompile: m=>{
                const tweaked = tweakShader(m, [0.729, 0.706, 0.616, 0.5]);

                m.fragmentShader = tweaked.fragmentShader;
                m.vertexShader = tweaked.vertexShader;
            }   
        }),
        inactiveHover: new THREE.ShaderMaterial( { 
            // color: 0xBAB49D, 
            // opacity:0.75, 
            transparent:true,                    
            side: THREE.DoubleSide,
            uniforms: {
                highZoomSizeAttenuation: s.highZoomSizeAttenuation
            },
            onBeforeCompile: m=>{
                const tweaked = tweakShader(m, [0.729, 0.706, 0.616, 0.95]);

                m.fragmentShader = tweaked.fragmentShader;
                m.vertexShader = tweaked.vertexShader;
            }    
        }),

        IB: new THREE.ShaderMaterial( { 
            opacity:0.75, 
            transparent:true,
            side: THREE.DoubleSide,
            uniforms: {
                highZoomSizeAttenuation: s.highZoomSizeAttenuation
            },
            onBeforeCompile: m=>{
                const tweaked = tweakShader(m, [0.667, 0.2, 0.271, 0.75]);

                m.fragmentShader = tweaked.fragmentShader;
                m.vertexShader = tweaked.vertexShader;
            }            
            // depthWrite:false  
        } ),
        OB: new THREE.ShaderMaterial( { 
            // color: 0x41a6b2,            
            opacity:0.75, 
            transparent:true,
            side: THREE.DoubleSide,
            // alphaToCoverage:true,
            uniforms: {
                highZoomSizeAttenuation: s.highZoomSizeAttenuation
            },
            onBeforeCompile: m=>{
                const tweaked = tweakShader(m, [0.2549019607843137,0.6509803921568628,0.6980392156862745, 0.75]);

                m.fragmentShader = tweaked.fragmentShader;
                m.vertexShader = tweaked.vertexShader;
            }            
            // depthWrite:false  
        } ),

        text: new THREE.ShaderMaterial( { 
            // color: 0xffffff, 
            side: THREE.BackSide,
            uniforms: {
                highZoomSizeAttenuation: s.highZoomSizeAttenuation
            },
            opacity:0.7,
            onBeforeCompile: (m)=>{
                let {vertexShader, fragmentShader} = m;
                vertexShader = `uniform float highZoomSizeAttenuation; \n` + vertexShader;
                m.vertexShader = vertexShader
                    .replace('position', 'position*highZoomSizeAttenuation');
                
                m.fragmentShader = fragmentShader.replace('vec4( 1.0, 0.0, 0.0, 1.0 );', 'vec4( 1.0, 1.0, 1.0, 1.0 );')

            }

            // depthWrite:false,
            // depthTest: false 
        } ),

        basicIB: new THREE.MeshBasicMaterial( { 
            color: 0xaa3345,            
            opacity:0.75, 
            transparent:true,
            side: THREE.BackSide,
            // alphaToCoverage:true,
            onBeforeCompile: m=>{
                let {vertexShader, fragmentShader} = m;
                m.uniforms.highZoomSizeAttenuation = s.highZoomSizeAttenuation;
                vertexShader = `uniform float highZoomSizeAttenuation;\n` + vertexShader;

                // const tweaked = tweakShader(m, [0.667, 0.2, 0.271, 0.75]);

                m.vertexShader = vertexShader
                    .replace(
                        '#include <begin_vertex>', 
                        `vec3 transformed = vec3( position * highZoomSizeAttenuation );

                        #ifdef USE_ALPHAHASH
                        
                            vPosition = vec3( position * highZoomSizeAttenuation );
                        
                        #endif`
                    ) 
                    
                    console.log(vertexShader)
                    
            }            
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
        // ['bus_labels', 'text-opacity', 1]
    ],
    active:[
        ['route', 'line-width', {stops:[[12,1], [22,20]]}],
        ['stops', 'circle-stroke-width', {stops:[[12, 1], [22,20]]}],
        ['stops', 'circle-radius', 0],
        // ['buses', 'circle-color', c.color.weak],
        // ['bus_labels', 'text-opacity', 0]
    ],
    inactive:[
        ['route', 'line-width', 0],
        ['stops', 'circle-stroke-width', 0],
        ['stops', 'circle-radius', 0],
        // ['buses', 'circle-color', {
        //     'property': 'direction',
        //     'type':'categorical',
        //     'stops':[['IB', c.color.IB], ['OB', c.color.OB]]
        // }],
        // ['bus_labels', 'text-opacity', 0]
    ]
}

function tweakShader(s, rgba) {
    let {vertexShader, fragmentShader} = s;
    vertexShader = `uniform float highZoomSizeAttenuation; \n` + vertexShader;
    vertexShader = vertexShader
        .replace('position', 'position*highZoomSizeAttenuation');
    

    fragmentShader = fragmentShader.replace('vec4( 1.0, 0.0, 0.0, 1.0 );', `vec4( ${rgba.join(', ')} );`);
    return {vertexShader, fragmentShader}
}