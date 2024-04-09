import { LineMaterial } from '../jsm/lines/LineMaterial.js';
import {state} from './state.js'
import * as THREE from '../../build/three.module.js';
import {starfieldVertex, starfieldFragment} from './shaders/starfield.js';
import {blocks, noiseExpression, defineProgress} from './shaders/blocks.js';

export const mat = {

	base: new LineMaterial({linewidth:0.01, color:'green'}),
	_wire: new LineMaterial( {
		color: 0xff4500,
		// linewidth: params.stroke.thickness, // in pixels
		//resolution:  // to be set by renderer, eventually
		dashed: true

	} ),

	solid: new THREE.MeshBasicMaterial({
		// color:params.fill.color,
		transparent: true,
		// side: THREE.DoubleSide,
		toneMapped: false
	}),

	_sky: new THREE.ShaderMaterial({
		uniforms:{
			now: state.now,
			dimensions: state.dimensions,
			...state.sky
		},
		side: THREE.BackSide,

		vertexShader: starfieldVertex,
		fragmentShader: starfieldFragment
	}),
	_ball: new THREE.MeshPhysicalMaterial({clearcoat:0, metalness:0.5, roughness:0}),
	_tube: new THREE.MeshPhysicalMaterial({clearcoat:0, metalness:0.5, roughness:0, side: THREE.BackSide}),

	ball: function() {
		const pt = this.unit.point;
		var m = mat._ball.clone();
		m.color = new THREE.Color(pt.color);
		// m = Object.assign(m, {get roughness(){return pt.ball.roughness}});

		m.onBeforeCompile = a => {
			a.uniforms = {
				...a.uniforms,
				...composeUniforms(this),
				ballRadius: this.unit.point.radius
			};

			a.vertexShader = declareUniforms 
			+ `uniform float ballRadius;
				${blocks.makeTranslationMatrix}
				${blocks.makeScaleMatrix}
			`
			+ a.vertexShader
			.replace(
				'#include <project_vertex>',

				`
					// ${rotationTransform}
					// ${translationTransform}
					// ${scaleTransform};

					float progress = ${defineProgress('dfAFW.y')};

					${blocks.deformAxes}

					vec4 instanceTranslation = instanceMatrix[3];

					mat4 deformedInstance = makeTranslationMatrix(deform(instanceTranslation.xyz, progress));


					vec4 mvPosition = vec4( unitTranslation + transformed*ballRadius, 1.0 );

					mat4 unitScaleMatrix = makeScaleMatrix(unitScaleFactor);
					mat4 unitScaleCompensate = makeScaleMatrix(1.0/unitScaleFactor);

					gl_Position = projectionMatrix * viewMatrix * systemRotationMatrix 
					* makeTranslationMatrix(systemTranslation)* scaleTranslationComponents(modelMatrix, vec3(systemRadiusAnimationFactor)) 
					* unitRotationMatrix * unitScaleMatrix * deformedInstance
					* unitScaleCompensate * mvPosition;
				`

			)
			
		}

		return m;
	},

	tube: function() {

		const m = mat._tube.clone();
		m.color = new THREE.Color(this.unit.frame.color);

		m.onBeforeCompile = a => {

			a.uniforms = {
				...a.uniforms,
				...composeUniforms(this),
				radius: this.unit.frame.width
			};

			a.vertexShader = declareUniforms 
			+ `
				uniform vec3 start;
				uniform vec3 end;
				uniform float radius;
				${blocks.makeTranslationMatrix}\n

				${blocks.makeScaleMatrix}\n

				${blocks.lookAt}\n

				${blocks.decomposeRotation}\n

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;
			`
			+ a.vertexShader
			.replace(
				'#include <project_vertex>',

				`
					${rotationTransform}
					${translationTransform}
					${scaleTransform};
					float progress = ${defineProgress('dfAFW.y')};


					vec4 mvPosition = vec4(transformed, 1.0 );

					vec4 iS = vec4(unitScaleFactor * deform(instanceStart, progress) + unitTranslation, 1.0) ;
					vec4 iE = vec4(unitScaleFactor * deform(instanceEnd, progress) + unitTranslation, 1.0);

					mat4 instanceRotationMatrix = lookAt(vec3(iE.xyz-iS.xyz));
					
					mat4 instanceScaleMatrix = makeScaleMatrix(vec3(radius, length(iE - iS), radius));
					mat4 instanceTranslationMatrix = makeTranslationMatrix(iS.xyz);

					vec4 test = viewMatrix * systemRotationMatrix * makeTranslationMatrix(systemTranslation) * scaleTranslationComponents(modelMatrix, vec3(systemRadiusAnimationFactor)) 
					* unitRotationMatrix
					* instanceTranslationMatrix* instanceRotationMatrix * instanceScaleMatrix * makeTranslationMatrix(vec3(0.0, 0.5, 0.0))
					* mvPosition;
					gl_Position = projectionMatrix * test;



				`

			)

		};

		return m;
	}
}




const declareUniforms = `
	uniform float now;
	uniform vec2 dimensions;

	uniform vec3 dfAFW;
	uniform int deformType;

	uniform float unitScaleAmplitude;
	uniform float unitScaleFrequency;

	uniform vec3 unitScale;
	uniform vec3 unitTranslation;
	uniform vec3 rotation;

	uniform vec3 rotationSpeed;

	uniform vec3 systemTranslation;

	uniform vec3 systemRotation;
	uniform vec3 systemRotationSpeed;

	uniform float systemRadiusAnimationAmplitude;
	uniform float systemRadiusAnimationFrequency;

	${blocks.PI}
	${blocks.makeRotationMatrix}
	${blocks.scaleTranslationComponents}
	${blocks.deformFn('position')}

\n`


const rotationTransform = `
	mat4 unitRotationMatrix = makeRotationMatrix(rotation, rotationSpeed);
	mat4 systemRotationMatrix = makeRotationMatrix(systemRotation, systemRotationSpeed);

`;

const translationTransform = `

	// scale the translation components in modelMatrix to produce radius flux
	mat4 systemRadiusAnimationMatrix = modelMatrix;

	// solid meshes currently use instancematrices for translation within the system
	#ifdef USE_INSTANCING

		systemRadiusAnimationMatrix = instanceMatrix;

	#endif

	float systemRadiusAnimationFactor = 1.0 + sin(systemRadiusAnimationFrequency * now/1000.0) * systemRadiusAnimationAmplitude;

	systemRadiusAnimationMatrix = scaleTranslationComponents(systemRadiusAnimationMatrix, vec3(systemRadiusAnimationFactor));

	// translate system
	systemRadiusAnimationMatrix[3][0] += systemTranslation.x;
	systemRadiusAnimationMatrix[3][1] += systemTranslation.y;
	systemRadiusAnimationMatrix[3][2] += systemTranslation.z;
`

const scaleTransform = `
	vec3 unitScaleFactor = unitScale * (1.0 + unitScaleAmplitude * sin(${defineProgress('unitScaleFrequency')}));
`


const deformationParams = {
	wire: `
		vec4 startDeformationInput = vec4(${noiseExpression('instanceStart', 115.123)}, instanceStart.y, 0, 0)/dfAFW.z + progress;
		vec4 endDeformationInput = vec4(${noiseExpression('instanceEnd', 115.123)}, instanceEnd.y, 0, 0)/dfAFW.z + progress;
	`,
	basic: `vec4 deformationInput = vec4(${noiseExpression('position', 115.123)}, position.y, mod(position.x, progress/10.0), 0)/dfAFW.z + progress;`
};

const systemMatrix = `systemRotationMatrix * systemRadiusAnimationMatrix`;
const customMatrix = `viewMatrix * ${systemMatrix} * unitRotationMatrix`

mat._wire.vertexShader = declareUniforms + 
	mat._wire.vertexShader
	.replace(
		'// camera space',
		`// camera space
		${rotationTransform}
		${translationTransform}
		${scaleTransform}
		float progress = ${defineProgress('dfAFW.y')};
		${deformationParams.wire};
		vec4 startMatrix = ${customMatrix} * vec4( unitTranslation + unitScaleFactor * deform(instanceStart, progress), 1.0 );
		vec4 endMatrix = ${customMatrix} * vec4( unitTranslation + unitScaleFactor * deform(instanceEnd, progress), 1.0 );

		`
	)
	.replace(
		'modelViewMatrix * vec4( instanceStart, 1.0 );',
		`startMatrix;`
	)
	.replace(
		'modelViewMatrix * vec4( instanceEnd, 1.0 );',
		'endMatrix;'
	)
	.replace(
		`offset *= linewidth;`,
		`
		offset *=  linewidth * dimensions.y /2000.0; //(200.0*(startMatrix.z+endMatrix.z));
		`
	)


function composeUniforms(params) {

	const {
		deformation,
		system,
		unit: {rotationSpeed, rotation, translation, scale, scaleAmplitude, scaleFrequency}
	} = params;

	const uniforms = {

		now: state.now,
		dimensions: state.dimensions,
		...deformation,

		unitTranslation: translation,
		unitScale: scale,
		unitScaleAmplitude: scaleAmplitude,
		unitScaleFrequency: scaleFrequency,
		rotation: rotation,
		rotationSpeed: rotationSpeed,

		systemTranslation: system.translation,
		systemRotation: system.rotation,
		systemRotationSpeed: system.rotationSpeed,
		systemRadiusAnimationAmplitude: system.radiusAnimationAmplitude,
		systemRadiusAnimationFrequency:	system.radiusAnimationFrequency
	}

	return uniforms
}


export function solidMaterial() {

	const m = mat.solid.clone();
	// m.depthWrite = false;
	m.onBeforeCompile = a => {

		const {color, opacity, opacityFlux} = this.unit.fill;
		m.color = new THREE.Color(color);
		m.opacity = opacity;
		a.uniforms = {
			...a.uniforms,
			...composeUniforms(this),
			...opacityFlux
		}

		a.vertexShader = declareUniforms + 
		`varying vec3 worldPos;\n`+ 
		a.vertexShader
			.replace(
				'#include <project_vertex>',

				`	vec4 mvPosition = vec4( transformed, 1.0 );
					${rotationTransform}
					${translationTransform}
					${scaleTransform}

					float progress = ${defineProgress('dfAFW.y')};

					worldPos = position;

					gl_Position = projectionMatrix * ${customMatrix} * vec4(unitScaleFactor * deform(position, progress) + unitTranslation, 1.0);
				`
			)

		a.fragmentShader = a.fragmentShader
			.replace(
				'uniform vec3 diffuse;',

				`uniform vec3 diffuse;
				varying vec3 worldPos;
				uniform float now;
				uniform int ofT;
				uniform vec3 ofAFW;
				`
			)
			.replace(
				`#include <color_fragment>`,
				`#if defined( USE_COLOR_ALPHA )

					diffuseColor *= vColor;

				#elif defined( USE_COLOR )

					diffuseColor.rgb *= vColor;

				#endif

				float ofProgress = ${defineProgress('ofAFW.y')};
				float ofAmplitude = ofAFW.x;
				float ofFactor = sin(ofProgress+atan(worldPos.y, worldPos.x)/ofAFW.z);
				diffuseColor.a *= 1.0+ofFactor*ofAmplitude;
				diffuseColor.a *= length(worldPos)/3.;
				`

			)

		m.uniforms = a.uniforms;
		m.vertexShader = a.vertexShader;

	}

	m.toneMapped = false;
	// m.polygonOffset = true;
	// m.polygonOffsetUnits = 1111111111;
	return m
};


export function makeMaterial() {
	const m = mat._wire.clone();
	// const {deformation, rotation: {frequency, amplitude}, stroke: {color, thickness}} = params;

	const {color, width} = this.unit.frame;
	m.color = new THREE.Color(color);
	m.linewidth = width.value;

	m.uniforms = {
		...m.uniforms,
		...composeUniforms(this)
	}
	m.fragmentShader = m.fragmentShader
	// 	.replace(
	// 		`alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );`,
	// 		``
	// 	)
		.replace('vec4 diffuseColor = vec4( diffuse, alpha );', 'vec4 diffuseColor = vec4( diffuse, 0. );')
		.replace(
			`gl_FragColor = vec4( diffuseColor.rgb, alpha );`,
			`gl_FragColor = vec4( diffuseColor.rgb, 0. );`
		)
		.replace(`#include <logdepthbuf_fragment>`,'')
		.replace(`#include <color_fragment>`,'')
		.replace(`#include <tonemapping_fragment>`,'')
		.replace(`#include <encodings_fragment>`,'')
		.replace(`#include <fog_fragment>`,'')
		// .replace(`#include <premultiplied_alpha_fragment>`,'')


		// console.log(m.fragmentShader, m.vertexShader)

	return m
}

export function skyMaterial(image) {
	return mat._sky;


	return m
}
export function makePointMaterial() {

	const {radius, opacity, visibility, brightnessFlux, radiusFlux, bloom} = this.unit.point;
	const mat = new THREE.ShaderMaterial( {

		uniforms: {
			...composeUniforms(this),
			color: { value: new THREE.Color( 0xffffff ) },
			pointRadius: radius,
			opacity: opacity,
			bfType: brightnessFlux.t,
			bfAFW: brightnessFlux.afw,

			rfType: radiusFlux.t,
			rfAFW: radiusFlux.afw
			// bloomFactor: bloom
		},

		vertexShader: `
			#ifdef USE_LOGDEPTHBUF
			#define EPSILON 1e-6
			#ifdef USE_LOGDEPTHBUF_EXT
			varying float vFragDepth;
			#endif
			uniform float logDepthBufFC;
			#endif
			//attribute float scale;
			${declareUniforms}

			uniform float pointRadius;
			uniform vec3 rfAFW;
			uniform int rfType;

			varying vec3 vPosition;

			void main() {

				vPosition = position;
				${rotationTransform}
				${translationTransform}
				${scaleTransform}
				float progress = ${defineProgress('dfAFW.y')};
				${blocks.deformAxes}

				vec3 animatedPosition = unitScaleFactor * deform(position, progress);

				// calculate position in camera space first, to feed into point size
				vec4 mvPosition = ${customMatrix} * vec4(animatedPosition + unitTranslation, 1.0);


				// set point size as function of radius, clip space distance, and selected flux
				// also a scale factor to get close to scene space coordinates
				gl_PointSize = dimensions.y * pointRadius * ( 5.5  / -mvPosition.z );

				vec4 fluxInput = vec4(${noiseExpression('vPosition', 118.41)}, vPosition.y, 10.0*vPosition.x/(vPosition.y+0.000001), 0)/rfAFW.z + ${defineProgress('rfAFW.y')};
				gl_PointSize *= rfAFW.x * sin(fluxInput[rfType]) + 1.0;


				gl_Position = projectionMatrix * mvPosition;

			}
		`,

		fragmentShader: `
			#ifdef USE_LOGDEPTHBUF
			uniform float logDepthBufFC;
			#ifdef USE_LOGDEPTHBUF_EXT
			varying float vFragDepth;
			#endif
			#endif

			uniform vec3 color;
			uniform float opacity;
			uniform float pointRadius;

			uniform float now;
			uniform int bfType;
			uniform vec3 bfAFW;
			// uniform float bloomFactor;
			varying vec3 vPosition;
			${blocks.PI}

			void main() {

				if (opacity * pointRadius == 0.0) discard;
				if ( length( gl_PointCoord - vec2( 0.5, 0.5 ) ) > 0.475 ) discard;

				// scale brightness
				vec4 fluxInput = vec4(${noiseExpression('vPosition',113.1)}, vPosition.y, 10.0*vPosition.x/(vPosition.y+0.000001), 0)/bfAFW.z + ${defineProgress('bfAFW.y')};

				float brightnessScale = bfAFW.x * sin(fluxInput[bfType]) + 1.0;

				#if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
				    gl_FragDepthEXT = log2(vFragDepth) * logDepthBufFC * 0.5;
				#endif

				gl_FragColor = vec4( color, opacity/2.0 );

			}
		`
	} );

	// mat.extensions.derivatives = true;
	// console.log(mat)
	// mat.toneMapped = false;
	mat.transparent = true;
	// mat.polygonOffset = true;
	// mat.polygonOffsetFactor = 111111111;
	// mat.transparent = true;
	return mat
}
