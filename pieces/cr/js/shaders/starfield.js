// Starfield Tutorial by Martijn Steinrucken aka BigWings - 2020
// countfrolic@gmail.com
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
// 
// This is the end result of a tutorial on my YouTube channel The Art of Code
// 
export const starfieldVertex = `

    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`

export const starfieldFragment = `

#define NUM_LAYERS 2.

uniform vec2 dimensions;
uniform float now;
uniform float layers;
uniform vec2 mousePosition;

uniform float twinkleSpeed;
uniform float colorVariation;
uniform vec3 starColor;
uniform float brightness;
uniform float moveSpeed;

mat2 Rot(float a) {
    float s=sin(a), c=cos(a);
    return mat2(c, -s, s, c);
}

float Star(vec2 uv, float flare) {

	float d = length(uv);
    float m = .05/d;
    
    float rays = max(0., 1.-abs(uv.x*uv.y*1000.));
    // m += rays*flare;
    uv *= Rot(3.1415/4.);
    // rays = max(0., 1.-abs(uv.x*uv.y*1000.));
    // m += rays*.3*flare;
    
    m *= smoothstep(1., .2, d);
    return m;
}

float Hash21(vec2 p) {
    p = fract(p*vec2(123.34, 456.21));
    p += dot(p, p+45.32);
    return fract(p.x*p.y);
}

vec3 StarLayer(vec2 uv) {
	vec3 col = vec3(0);
	
    vec2 gv = fract(uv)-.5;
    vec2 id = floor(uv);
    
    for(int y=-1;y<=1;y++) {
    	for(int x=-1;x<=1;x++) {
            vec2 offs = vec2(x, y);
            
    		float n = Hash21(id+offs); // random between 0 and 1
            float size = fract(n*345.0001);
            
    		float star = Star(gv-offs-vec2(n, fract(n*34.))+.5, smoothstep(.9, 1., size)*.6);
            
            vec3 color = (sin(vec3(.2, .3, .9) * colorVariation * fract(n*2345.2)*123.2)*.5+.5);
            color = color* brightness;
            
            float iTime = now /1000.0;

            star *= twinkleSpeed*sin(iTime*3.+n*6.2831)*.5+1.;
            col += star*size*color;
        }
    }
    return col;
}

void main()
{
    vec2 uv = (gl_FragCoord.xy-.5*dimensions.xy)/dimensions.y;
	vec2 M = (mousePosition.xy-dimensions.xy*.5)/dimensions.y;

    float t = moveSpeed * now * 0.00002;
    
    uv += M*4.;
    
    uv *= Rot(t);
    vec3 col = vec3(0);
    
    for(float i=0.; i<1.; i+=1./layers) {
    	float depth = fract(i+t);
        
        float scale = mix(20., .5, depth);
        float fade = depth*smoothstep(1., .9, depth);
        col += StarLayer(uv*scale+i*453.2-M)*fade;
    }
    
    col = pow(col, vec3(.4545));	// gamma correction
    
    gl_FragColor = vec4(col,1.0);

}

`