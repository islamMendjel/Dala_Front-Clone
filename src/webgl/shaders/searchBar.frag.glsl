//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
  {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
// First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

// Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

// Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;

// Gradients: 41 points uniformly over a line, mapped onto a diamond.
// The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

// Normalise gradients implicitly by scaling m
// Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

// Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

#ifndef PI
#define PI 3.141592653589793
#endif

float sineInOut(float t) {
  return -0.5 * (cos(PI * t) - 1.0);
}

#ifndef PI
#define PI 3.141592653589793
#endif

precision highp float;
#define GLSLIFY 1

varying vec2 vUv;

uniform float uTime;
uniform sampler2D uNoiseTexture;
uniform float uBlurScale;
uniform float uNoiseScale;
uniform vec2 uPosA;
uniform vec3 uColorA;
uniform float uScaleA;
uniform vec2 uPosB;
uniform vec3 uColorB;
uniform float uScaleB;
uniform float uAlpha;
uniform float uCoordScale;

float circle(vec2 circle_pos, vec2 coord, float rad, float blur) {
    float dist = distance(circle_pos, coord);
    return smoothstep(rad + blur, rad - blur, dist);
}

void main() {
    vec2 uv = vUv;
    vec2 coord = vUv * uCoordScale;
    // coord.y *= 1.5;
    // coord.y -= 0.25;
    vec4 noiseColor = texture2D(uNoiseTexture, (uv * uNoiseScale) + (uTime * 0.01));
    vec4 finalColor;

    float noiseA = noiseColor.r;
    float noiseB = noiseColor.b;

    vec2 posA = uPosA;
    posA.x *= (noiseA * 0.1) + 1.0;
    posA.y *= (noiseB * 0.1) + 1.0;

    float mixAmountA = circle(posA, coord, uScaleA * noiseA, uBlurScale);
    vec4 spotColorA = vec4(uColorA, 1.0);
    vec4 bgColorA = vec4( vec3( 0.0 ), mixAmountA );
    finalColor += mix(bgColorA, spotColorA, mixAmountA);

    vec2 posB = uPosB;
    posB.x *= noiseB;
    posB.y *= noiseA;

    float mixAmountB = circle(posB, coord, uScaleB * noiseB, uBlurScale);
    vec4 spotColorB = vec4(uColorB, 1.0);
    vec4 bgColorB = vec4( vec3( 0.0 ), mixAmountB );

    finalColor += mix(bgColorB, spotColorB, mixAmountB);

    finalColor *= uAlpha;

	gl_FragColor = finalColor;
}