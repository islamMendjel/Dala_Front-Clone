#define GLSLIFY 1
vec3 col = v_color.rgb;

#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
// https://github.com/mrdoob/three.js/pull/22425
#ifdef USE_TRANSMISSION
diffuseColor.a *= transmissionAlpha + 0.1;
#endif
outgoingLight.rgb = col.rgb;
diffuseColor.a *= v_color.a;
gl_FragColor = vec4( outgoingLight, diffuseColor.a );