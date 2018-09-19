var myFragmentShader = `

precision mediump float;

#define M_PI 3.1415926535897932384626433832795 

varying vec3 vPosition;
varying vec4 vPositionRot;
varying float vVertexScale;

uniform sampler2D texSampler;

uniform vec4 color;
uniform int oID;
uniform float zdist;
uniform float cameraZ;
uniform float fogfac;
uniform float usetex;
uniform float xrot;
uniform float yrot;
uniform float aspect;

const float rad = 1.;
const float a_bulge = 1.542;
const float amin = 0.0;//03;

//from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
//simple 3D noise
float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}
float snoise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}

// from https://www.seedofandromeda.com/blogs/49-procedural-gas-giant-rendering-with-gpu-noise
//fractal noise
float noise(vec3 position, int octaves, float frequency, float persistence, int rigid) {
    float total = 0.0; // Total value so far
    float maxAmplitude = 0.0; // Accumulates highest theoretical amplitude
    float amplitude = 1.0;
    const int largeN = 50;
    for (int i = 0; i < largeN; i++) {
    	if (i > octaves){
    		break;
    	}
        // Get the noise sample
	if (rigid == 0){
           total += snoise(position * frequency) * amplitude;
	} else {
	// rigid noise
	    total += ((1.0 - abs(snoise(position * frequency))) * 2.0 - 1.0) * amplitude;	       
	}
        // Make the wavelength twice as small
        frequency *= 2.0;
        // Add to our maximum possible amplitude
        maxAmplitude += amplitude;
        // Reduce amplitude according to persistence for the next octave
        amplitude *= persistence;
    }
 
    // Scale the result by the maximum amplitude
    return total / maxAmplitude;
}


float getnoise(vec3 position, int octaves, float frequency, float persistence){
	//fractal noise (can play with these)
	float pfac = 8.; //this changes the size of the noise
	float regfac = 0.02; //this looks like an offset from the center?
	float rigfac1 = 0.04; //this is also an offset and  strength
	float rigfac2 = -0.01; //this controls elongation?
    float n1 = noise(position * pfac, octaves, frequency, persistence, 0) * regfac; //regular
    float n2 = noise(position * pfac, octaves, frequency, persistence, 1) * rigfac1 + rigfac2; //rigid

    //storms
    // Get the three threshold samples
    float s = 0.5; //this changes how "deep" the noise is
    float f = 6.0; //this changes how many
   	float p1off = 800.; //this doesn't seem to change much
   	float tfac = 0.5;
    float t1 = snoise(position * f) - s;
    float t2 = snoise((position + p1off) * f) * tfac - s;
    float t3 = snoise((position + 2.*p1off) * f) * tfac - s;

    // Intersect them and get rid of negatives
    float thfac = 0.3;
    float threshold = max(t1 * t2 * t3, 0.0);
    float n3 = snoise(position * f) * threshold * thfac;

    //now add the noise terms together and get the positions for the texture
    float n12fac = 0.8;
    float n3fac = 0.6;
    float n = (n1 + n2)*n12fac + n3*n3fac;

    return n;

}


void main(void) {
    gl_FragColor = color;

    //get the distance from the center
    vec2 fromCenter = abs(vPosition.xy);
	float dist = length(fromCenter);
    vec2 fromCenterR = abs(vPositionRot.xy);
	float distR = length(fromCenterR);

//define some blending so that it looks like the lines are going behind the galaxy
	float afog = 1.;
	if (oID == 2 || oID == 3 || oID == 4 || oID == 5 ){
		float afmin = 0.5;
		if (oID == 3){
			afmin = 0.1;
		}

		float afsig = 50.;//25.;
		vec3 cpos = vec3(0., 0., vPositionRot[2]- cameraZ);//vec3(vPositionRot[0], vPositionRot[1], vPositionRot[2]- cameraZ);
		float rxyz = length(cpos);
		float axyz = (1. - fogfac/exp( pow(rxyz, 2.) / afsig));
		float zatamin = sqrt(log(fogfac/(1. - amin))*afsig) - cameraZ;


		if (vPositionRot[2] < (-1.*zatamin)){
			afog = min(1., afmin + axyz);
			//gl_FragColor = vec4(0., 1., 0.,1.);
		} else {
		//if (vPositionRot[2] > zatamin) {
			afog = min(afmin, afog);
			//gl_FragColor = vec4(0., 0., 1.,1.);

		}
		//gl_FragColor = vec4(afog, 0, 0, 1.);

        gl_FragColor.a *= afog;
    }

	if (oID == 2 || oID == 7 || oID == 8 || oID == 9 || oID == 10){ //stars, SNe, GRB, kilonova
		gl_FragColor.a *= 1. - dist/rad;
			if (dist > 1.){
			discard;
		}
	}


    if (oID == 1){ // galaxy
    	float a_bulge_use = a_bulge;/// a_bulge/vVertexScale;
    	float zuse = zdist / vVertexScale;
        float r = sqrt(dist*dist + zuse*zuse);
       	float x = r + a_bulge_use;
       	float a = a_bulge_use / (2. * M_PI * r * x*x*x );
			float ause = clamp(pow(a, 2.5),0.,1.);// * pow((1. - dist*100.),1.6), 0., 1.);

        //noise
        int octaves = 5;
        float frequency = 0.1;
       	float persistence = 0.8; 
  	  	//for x dimension
        vec3 position = vPosition.xyz +  xrot/360.; 
		float nx = getnoise(position, octaves, frequency, persistence);

	    	//for y dimension
	    position = vPosition.yzx + yrot/360.;
        float ny = getnoise(position, octaves, frequency, persistence);

        vec2 texcoord = (vPosition.xy + 1.)/2.;
	    vec2 newTexCoord = texcoord + vec2(nx, ny); 

     	vec4 texcolor = texture2D(texSampler, newTexCoord);
     	gl_FragColor = texcolor + ause;
     	gl_FragColor.a *= (a*20.);
     }

     if (oID == 6){ //text texture
		vec2 texcoord = (vPosition.xy + 1.)/2.;
		texcoord.y = texcoord.y/(aspect);
		//gl_FragColor = vec4(texcoord.y/2.,0,0,1.);
		gl_FragColor *= texture2D(texSampler, texcoord);

     }

     if (oID == 5){ //BNS symbol texture
     	vec2 texcoord = (vPosition.xy + 1.)/2.;
     	vec4 texcolor = texture2D(texSampler, texcoord);
     	//if (texcoord.x > 0.5){
     	//	texcolor.rgb = vec3(1.,0.,0.);
     	//}
		gl_FragColor = vec4(0., 0., 0., 0.);
		if (texcolor.a > 0.5){
			gl_FragColor = color;
			if (usetex > 0.){
				gl_FragColor *= texcolor;
			}
		} else{
			discard;
		}
		//if (gl_FragColor.a < 0.01){
		//	discard;
		//}
		gl_FragColor.a *= afog;

     }
}
`;