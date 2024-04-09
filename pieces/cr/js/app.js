import { EffectComposer } from '../jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from '../jsm/controls/OrbitControls.js';
import {skyMaterial, mat} from './material.js'
import * as THREE from '../../build/three.module.js';
// import * as ium from "https://cdn.skypack.dev/three-instanced-uniforms-mesh@0.45.0"
import { OBJLoader } from '../jsm/loaders/OBJLoader.js';

export const app = {

	version: 3,

	obj: {

		// initialize renderer, camera, sky, postprocessing
		init: () => {
			const {obj: {sky, renderer, camera, light}, scene} = app;

			renderer.setPixelRatio( window.devicePixelRatio );
			renderer.toneMapping = THREE.ReinhardToneMapping;

			document.body.appendChild( renderer.domElement );
			window.renderer = renderer;

			// camera & controls
			camera.position.z = 15;
			const controls = new OrbitControls( camera, app.obj.renderer.domElement );

			renderer.domElement.addEventListener('mousemove', e => {

				if (e.which === 0 ) return
				const val = Math.sin(controls.getPolarAngle())
				if (val<0.00001) return
				state.sky.mousePosition.value.x +=e.movementX*2
				state.sky.mousePosition.value.y -=e.movementY*2
			})
			controls.enablePan = false;

			// lighting
			scene.add( new THREE.AmbientLight( 0xffffff ) );

			light.position.set( 0, 2, 0 );
			scene.add( light );

			const light2 = new THREE.PointLight( 0xffffff, 5, 0 );
			light2.position.set( 100, 200, 100 );
			scene.add( light2 );

			const light3 = new THREE.PointLight( 0xffffff, 5, 0 );
			light3.position.set( - 100, - 200, - 100 );
			scene.add( light3 );

			// postprocessing
			const renderScene = new RenderPass( app.scene, camera );
			window.bloomPass = new UnrealBloomPass( state.dimensions.value, 1.5, 0.4, 0.85 );

			app.obj.composer = new EffectComposer( renderer );
			app.obj.composer.addPass( renderScene );
			app.obj.composer.addPass( bloomPass );

			// sky
			// sky.matrixAutoUpdate = false;
			sky.material.depthTest = false;
			sky.renderOrder = -2;
			sky.scale.x = -1;
			sky.visible = false;
			scene.add(app.obj.sky);
		},

		renderer: new THREE.WebGLRenderer( {
			antialias: true,
			logarithmicDepthBuffer: true
		} ),

		camera: new THREE.PerspectiveCamera(
			40,
			innerWidth / innerHeight,
			0.01, 1500
		),
		composer: null,

		light: new THREE.PointLight( 0xffffff, 3, 0 ),
		sky: new THREE.Mesh(
			new THREE.SphereBufferGeometry(999),
			mat._sky
		)
	},

	iterateSystems: (state, fn) => {
		Object.keys(state.systems)
			.forEach(k=>fn(state.systems[k]))
	},

	makeString: () => {
		const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		var output = ''
		for (var i = 0; i<6; i++) {
			const int = Math.round(Math.random()*25);
			output +=letters[int];
		}

		return output
	},

	bindBloom: () => {
		const {exposure, threshold, strength, radius} = window.state.bloomParams;

		renderer.toneMappingExposure = exposure;
		bloomPass.threshold = threshold;
		bloomPass.strength = strength;
		bloomPass.radius = radius;
	},

	// extract vertices as xyz arrays, from
	// a geometry's position buffer
	verticesFromPositions: function(positions) {

		const deduper = {};
		for (var i=0; i<positions.length; i+=3) {
			const decimals = 1000000;
			const trio = ([positions[i],positions[i+1],positions[i+2]]).map(n=>Math.round(n*decimals)/decimals);
			deduper[trio.join(',')] = true;
		}

		const uniqueKeys = Object.keys(deduper)
			.filter(k=>k!=='0,0,0') // hack to remove center vertex from circles
			.map(k => k.split(',').map(s=>parseFloat(s)));

		return uniqueKeys
	},

	setBackground: function(url) {

		const {obj:{sky}, scene:{environment}} = app;

		if (!url) {
			// sky.material.map?.dispose();
			// sky.material = skyMaterial();

			app.scene.environment = skyMaterial();
			return
		}

		state.sky.img = url;

		new THREE.ImageLoader()
			.setCrossOrigin( '*' )
			.load(url, function ( image ) {
				// sky.material = skyMaterial(i);
				// app.scene.environment = skyMaterial(i);

				const texture = new THREE.CanvasTexture( image );
				// m = new THREE.MeshBasicMaterial( {
				// 	map: texture,
				// 	// side: THREE.BackSide,
				// 	color: 0xffffff
				// } );

				app.scene.environment = texture;
			} );
	},

	buildSystem: function() {

		const {
			obj: {wire, solid, point, group, ball, tube},
			system: {quantity, radius, geometry, rings, unitsPerRing, complexity}
		} = this;

		group.clear();

		onChange.vertexType.call(this);
		onChange.frameType.call(this);

		if (geometry === 'Circle') {

			const solidInstances = new THREE.InstancedMesh(solid.geometry, solid.material, quantity);
			solidInstances.userData.type = 'solid';

			for (var i = 0; i < quantity; i++) {

				const clones = [wire.clone(), point.clone(), ball.clone(), tube.clone()];
				const [wC, pC, bC, tC] = clones;
				const angle = i * 2 * Math.PI/quantity;

				const distance = quantity > 1 ? radius : 0;
				const copyMatrix = new THREE.Matrix4()
					.premultiply(new THREE.Matrix4().makeTranslation(distance, 0, 0))
					.premultiply(new THREE.Matrix4().makeRotationZ(angle))

				clones.forEach(c=>{

					c.matrix.premultiply(copyMatrix);
					c.matrixAutoUpdate = false;

				})

				solidInstances.setMatrixAt(i, copyMatrix)

				group.add(...clones)
			}

			group.add(solidInstances)
		}

		else {

			const geom = geometry === 'Sphere' ? new THREE[`${geometry}BufferGeometry`](1, rings*2, unitsPerRing/2) : new THREE[`${geometry}BufferGeometry`](1, complexity);

			// all fills (solids) are drawn as a single InstancedMesh
			// wires and points are cloned per unit
			const vertices = app.verticesFromPositions(geom.getAttribute('position').array);
			const solidInstances = new THREE.InstancedMesh(solid.geometry, solid.material, vertices.length);
			solidInstances.userData.type = 'solid';

			vertices.forEach((v,i)=>{

				const clones = [wire.clone(), point.clone(), ball.clone(), tube.clone()];
				const xyz = v.map(n=>radius*n);

				const rotation = new THREE.Matrix4()
					.lookAt(
						new THREE.Vector3(),
						new THREE.Vector3(...xyz),
						new THREE.Vector3(0,1,0)
					)

				const translation = new THREE.Matrix4()
					.makeTranslation(...xyz)

				clones.forEach(c=>{
					c.matrix
						.premultiply(rotation)
						.premultiply(translation);

					c.matrixAutoUpdate = false;
				})


				group.add(...clones);
				solidInstances.setMatrixAt(i, clones[0].matrix);


			})

			group.add(solidInstances);
		}

		onChange.vertexType.call(this);
		onChange.frameType.call(this);

	},

	getTubes(fn) {
		this.obj.group.traverse(o=>{
			if (o.userData.type === 'tube') fn(o)
		})
	},

	updateTubes() {
		const {
			obj:{tube}, 
			unit:{
				frame:{
					tube:{
						facets
					}
				}
			}
		} = this;
		tube.geometry = new THREE.CylinderBufferGeometry(1, 1, 1, facets)
		onChange.geometry.call(this);
	},

	// load obj file from dialog
	// and set as geom
	loadSky(event) {
		const fileList = event.target.files;
		const reader = new FileReader();

		reader.addEventListener("load", function () {

			app.OBJLoader.load(
				reader.result, 
				d=>{
					const sys = app.activeSystem;
					sys.unit.geometry = 'Custom';
					sys.unit.obj = d.children[0].geometry;
					onChange.geometry.call(sys);		
				}
			)

		}, false);

		reader.readAsDataURL(fileList[0]);
	},


	OBJLoader: new OBJLoader(),

	get activeSystem() {
		return state.systems[state.activeSystem]
	}
};

export const util = {
	cullProps(props, source) {
		return ((props) => (props))(state);
	}
}