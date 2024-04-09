
export const noiseExpression = (pos, scale) => `(${pos}.x+${pos}.y)*${scale}`;
export const defineProgress = frequency => `2.0 * PI * mod(${frequency} * now/1000.0, 1.0)`;
export const blocks = {
	PI: `float PI = 3.1415926535897932384626433832795; `,
	makeRotationMatrix:`
		mat4 makeRotationMatrix(vec3 rotation, vec3 rotationSpeed) {
			float degToRad = 2.0 * PI / 360.0;

			vec3 r = degToRad * (rotation + rotationSpeed * now/1000.0);

			vec3 s = sin(r);
			vec3 c = cos(r);

			mat4 rX = mat4(
				1.0,0.0,0.0,0.0,
				0.0,c.x,-s.x,0.0,
				0.0,s.x,c.x,0.0,
				0.0,0.0,0.0,1.0
			);

			mat4 rY = mat4(
				c.y,0.0,s.y,0.0,
				0.0,1.0,0.0,0.0,
				-s.y,0.0,c.y,0.0,
				0.0,0.0,0.0,1.0
			);

			mat4 rZ = mat4(
				c.z,-s.z,0.0,0.0,
				s.z,c.z,0.0,0.0,
				0.0,0.0,1.0,0.0,
				0.0,0.0,0.0,1.0
			);

			return rX * rY * rZ;
		}
	`,

	makeTranslationMatrix: `
		mat4 makeTranslationMatrix(vec3 translation) {

			mat4 o = mat4(1.0);

			o[3][0] += translation.x;
			o[3][1] += translation.y;
			o[3][2] += translation.z;
			return o;

		}
	`,

	makeScaleMatrix: `
		mat4 makeScaleMatrix(vec3 scale) {

			mat4 o = mat4(1.0);

			o[0][0] = scale.x;
			o[1][1] = scale.y;
			o[2][2] = scale.z;
			return o;

		}
	`,

	decomposeRotation: `
		vec3 decomposeRotation(vec3 d) {

			float z = atan(d.x, d.y);
			float y = atan(d.x, -d.z);
			float x = atan(d.y, d.z);
			return 360.0 * vec3(0.0, -y, -z) / (PI * 2.0);

		}
	`,

	lookAt: `

		mat4 lookAt(vec3 d) {

			vec3 z = normalize(d);

			vec3 x = cross(vec3(0.0, 1.0, 0.0001), z);
			x = normalize(x);
			vec3 y = cross(z, x);

			mat4 o = mat4(1.0);

			o[0] = vec4(x.xyz, 0.0);
			o[1] = vec4(z.xyz, 0.0);
			o[2] = vec4(y.xyz, 0.0);

			return o;
		}
	`,

	scaleTranslationComponents:`
		mat4 scaleTranslationComponents(mat4 inputMatrix, vec3 scale) {
			mat4 o = inputMatrix;
			o[3][0] *= scale.x;
			o[3][1] *= scale.y;
			o[3][2] *= scale.z;
			return o;
		}
	`,
	
	// some deformations affect only some axes (wiggle)
	deformAxes: `vec4 axesAffected = vec4(1.,1.,1.,0.);`,
	// deformFactor:(dfName, position)=> {

	// 	// noise, pulse, revolve, wiggle
	// 	const input = `(vec4(${noiseExpression(position, 115.123)}, ${position}.y, mod(${position}.x, progress/10.0), 0)/dfAFW.z + progress)`;
	// 	const rawFactor = `(sin(${input}[deformType]) * dfAFW.x)`;
	// 	return `
	// 		 vec3 ${dfName} = vec3(1.0 + ${rawFactor}, 1.0 + ${rawFactor}*axesAffected[deformType], 1.0 + ${rawFactor}*axesAffected[deformType]);
	// 	`

	// },

	deformFn: (position) => {

		return `vec3 deform(vec3 position, float progress) {
			vec4 iv = vec4(${noiseExpression(position, 115.123)}, position.y, mod(${position}.x, progress/10.0), position.y)/dfAFW.z + progress;
			float amp = dfAFW.x;
			float rawFactor = sin(iv[deformType]) * amp;
			mat4 outputs = mat4(1.);

		// noise, pulse, revolve, wiggle

			outputs[0] = vec4((1.+rawFactor)*position, 1.0);
			outputs[1] = vec4((1.+rawFactor)*position, 1.0);
			outputs[2] = vec4(1.);
			outputs[3] = vec4(position.x+rawFactor*1., position.y-cos(iv[deformType]) * amp*(position.x)/(dfAFW.z * 20.), position.z,0.);

			vec4 outt = outputs[deformType];
			return outt.xyz;
		}`

	}
}