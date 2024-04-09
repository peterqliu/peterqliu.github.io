import state from '../core/state.js'

import lineFragment from './shaders/lineFragment.glsl';
import lineVertex from './shaders/lineVertex.glsl';
import {Matrix4, ShaderMaterial, Color} from 'three'

export default class LineMaterial extends ShaderMaterial {

	constructor(){
	
		super({

			side:2,
			transparent: true,
			uniforms: {
				lineColor: {value: new Color(1,1,1)},
				zoom: state.uniforms.zoom,
				opacity: { value: 1 },

				viewportSize: state.uniforms.viewportSize,
				pixelRatio: state.uniforms.pixelRatio,
				
				// world animation
				now: state.uniforms.now,

				cameraStartMatrix: state.uniforms.cameraStartMatrix,

				worldMatrix: state.uniforms.worldMatrix,
				worldStartMatrix: state.uniforms.worldStartMatrix,
				worldAnimationDuration: state.uniforms.worldAnimationDuration,
				worldAnimationStartTime: state.uniforms.worldAnimationStartTime,

				animateUntil: state.uniforms.animateUntil,

				// mesh animation 
				startTime: { value: 0 },
				duration: { value: 1 },
				startMatrix: {value: new Matrix4()},
				endMatrix: {value: new Matrix4()}


				// diffuse: { value: new THREE.Color('green') }
			},

			vertexShader: lineVertex,
			fragmentShader: lineFragment

		})
	}
}


