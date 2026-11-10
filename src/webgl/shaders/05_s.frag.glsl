#define GLSLIFY 1
varying float vViewZDepth;
varying vec2 vUv;

void main() {
  float color = 1.0 - smoothstep( u_near, u_far, vViewZDepth );
  gl_FragColor = vec4( vec3( color ), 1.0 );
}