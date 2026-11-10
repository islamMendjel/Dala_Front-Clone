#define GLSLIFY 1
varying vec2 vUv;
varying float vViewZDepth;

void main() {
  #include <begin_vertex>
  #include <project_vertex>
  vViewZDepth = - mvPosition.z;
  vUv = uv;
}