import * as THREE from '../../build/three.module.js';


export const state = {
	version: null,
	name: null,
	now: {value: performance.now()},
	dimensions: {value:new THREE.Vector2( innerWidth, innerHeight )},

	sky: {
		img: null,
		rotationSpeed: {value: new THREE.Vector3()},
		layers:{value: 2},
		mousePosition: {value: new THREE.Vector2()},
		colorVariation:{value:0},
		starColor: {value: new THREE.Color('orangered')},
		twinkleSpeed: {value: 1},
		moveSpeed: {value: 0.2},
		brightness: {value: 1}
	},

	bloomParams: {

		exposure: 1.25,
		threshold: 0.5,
		strength: 1.5,
		radius: 0.5
	},

	activeSystem: 0,
	systems: {}
};

export const constants = {

	defaultGeometryValues: {
		Circle:[1, 36],
		Sphere:[1,20,20],
		Cone: [1, 2, 30, 10, true],
		Cylinder: [1, 1, 3, 30, 10, true],
		Torus: [1, 0.25, 15, 15, 2*Math.PI],
		Icosahedron: [1,0],
		Dodecahedron:[1,0],
		Octahedron:[1,0],
		Tetrahedron: [1,0],
		'Custom OBJ': ''
		// TorusKnot: []
	},

	defaultGeometryParams: {
		Circle: ['radius', 'segments'],
		Sphere: ['radius', 'widthSegments', 'heightSegments'],
		Cone: ['radius', 'height', 'radialSegments', 'heightSegments'],
		Cylinder: ['radiusTop', 'radiusBottom', 'height', 'radialSegments', 'heightSegments'],
		Torus: ['radius', 'tubeRadius', 'radialSegments', 'tubeSegments'],
		Icosahedron: ['radius', 'complexity'],
		Dodecahedron:['radius', 'complexity'],
		Octahedron:['radius', 'complexity'],
		Tetrahedron:['radius', 'complexity'],
		'Custom OBJ': []

	},

	systemGeometries: [ 'Circle', 'Multi-ring', 'Icosahedron', 'Dodecahedron', 'Octahedron', 'Tetrahedron'],
	rotationUIParams: {min: -180, max: 180, step: 0.1},
	opacityUIParams: {min:0, max:1, step:0.01},
	translationUIParams: {min: -Infinity, max: Infinity, step: 0.1},
	frequencyUIParams: {min:0, max: Infinity, step:0.01},
	amplitudeUIParams: {min:0, max: Infinity, step: 0.1},
	wavelengthUIParams: {min:0.01, max:20, step:0.01},
	scaleUIParams: {
		x: {min:0, max: Infinity, step:0.01}, 
		y: {min:0, max: Infinity, step:0.01}, 
		z: {min:0, max: Infinity, step:0.01}		
	},
	translationUIParams: {
		x: {step:0.01}, 
		y: {step:0.01}, 
		z: {step:0.01}		
	},
	animationUIParams: {options:{'Noise': 0, 'Pulse': 1, 'Revolve': 2}},
	afwUIParams: {
		x: {min:0, max:1, step:0.01},
		y: {min:0, max: Infinity, step:0.01},
		z: {min:0.01, max:20, step:0.01}
	},
	defaultParams: {
		name: "New System",

		unit: {
			geometry: "Sphere",
			obj: null,
			geomParams: [1,6,6],

			frame: {
				type: 0,
				width: {value: 0.01},
				color: '#ff4500',
				tube: {
					facets: 36
				}
			},

			fill: {
				bloom: {value: 10},
				color: '#fff',
				opacity: 0.0,
				opacityFlux: {
					ofT: {value: 0},
					ofAFW: { value: new THREE.Vector3(0,1,0.1)}
				}

			},

			point: {
				type: 0,
				bloom: {value: 10},
				radius: {value: 0.02},
				color: '#fff',
				opacity: {value: 1},
				visibility: {value: 1},
				ball: {
					roughness: 0
				},
				radiusFlux: {
					t: {value: 0},
					afw: { value: new THREE.Vector3(0,1,0.2)}
				},
				brightnessFlux: {
					t: {value: 0},
					afw: { value: new THREE.Vector3(5,1,0.2)},
					amplitude: {value: 0},
					frequency: {value: 1},
					wavelength: {value: 0.2}
				}
			},

			wire: {
				bloom: {value: 10}
			},
			translation: {value: new THREE.Vector3()},			
			rotation: {value: new THREE.Vector3()},
			rotationSpeed: {value: new THREE.Vector3()},

			scale: {value: new THREE.Vector3(1,1,1)},			
			scaleAmplitude: {value: 0},
			scaleFrequency: {value: 1},

		},


		scale: 1,

		// passed directly into shader
		deformation: {
			dfAFW: {value: new THREE.Vector3(0, 0.2, 0.2)},
			deformType: {value: 0}
		},



		system: {
			geometry: 'Circle',
			quantity: 1,
			radius: 1.5,
			radiusAnimationAmplitude:{value: 0},
			radiusAnimationFrequency: {value: 0.5},
			rotation: {value: new THREE.Vector3()},			
			rotationSpeed: {value: new THREE.Vector3()},

			translation: {value: new THREE.Vector3()},			

			rings: 3,
			unitsPerRing: 8,

			complexity: 0
		},

		animation: {},

	}
}
					// ['Sphere', 'Cone', 'Cylinder', 'Dodecahedron', 'Icosahedron', 'Torus', 'TorusKnot']
