precision highp float;
#define GLSLIFY 1

uniform sampler2D t_oTarget;
uniform sampler2D t_position;
uniform sampler2D t_oVelocity;
uniform sampler2D t_params;
uniform sampler2D t_params2;
uniform sampler2D t_params3;

uniform vec2 u_resolution;
uniform float u_factor;
uniform float u_length;
uniform float u_show;
uniform float u_explode;
uniform float u_progress;
uniform float u_spring;
uniform float u_friction;
uniform float u_rendered;
uniform float u_delay;

varying vec2 vUv;

float qinticInOut(float x)
{
  //  x < 0.5 ? 16 * x * x * x * x * x : 1 - pow(-2 * x + 2, 5) / 2;
  float inValue = 16.0 * x * x * x * x * x;
  float outValue = 1.0 - pow(-2.0 * x + 2.0, 5.0) / 2.0;
  return step(inValue , 0.5) * inValue + step(0.5,outValue) * outValue;
}

void main() {
  float vx = 0.;
  float vy = 0.;
  float vz = 0.;

  if (u_rendered > 0.) {
    vec4 tParams = texture2D(t_params, vUv);
    vec4 tParams2 = texture2D(t_params2, vUv);
    vec4 tParams3 = texture2D(t_params3, vUv);

    // Show Animation -----
    float d = 0.00005;
    float d3 = 0.00015;
    float showVal = min(1., max(0., (u_show * (1. + d * (u_length - 1.))) - d * tParams.z));
    showVal = qinticInOut(showVal);
    // float radius = mix(u_factor + tParams.x * 3., u_factor, showVal) + u_explode * tParams.y;
    // float radius = mix(u_factor + tParams.x * 3., u_factor, showVal) + min(1., max(0., u_explode * (1. + d3 * (u_length - 1.)) - d3 * tParams2.w)) * 6.;
    float radius = mix(u_factor + tParams.x * 3., u_factor, showVal);

    vec3 pos = texture2D(t_position, vec2(vUv.x * 0.5, vUv.y * 0.5)).xyz;
    vec3 basePos = pos;

    pos.x = (pos.x - 0.5) * 2. * radius;
    pos.y = (pos.y - 0.5) * 2. * radius;
    pos.z = (pos.z - 0.5) * 2. * radius;

    vec3 pos2 = texture2D(t_position, vec2(vUv.x * 0.5 + 0.5, vUv.y * 0.5)).xyz;
    pos2.x = (pos2.x - 0.5) * 2. * radius;
    pos2.y = (pos2.y - 0.5) * 2. * radius;
    pos2.z = (pos2.z - 0.5) * 2. * radius;

    vec3 pos3 = texture2D(t_position, vec2(vUv.x * 0.5, vUv.y * 0.5 + 0.5)).xyz;
    pos3.x = (pos3.x - 0.5) * 2. * radius;
    pos3.y = (pos3.y - 0.5) * 2. * radius;
    pos3.z = (pos3.z - 0.5) * 2. * radius;

    vec3 pos4 = texture2D(t_position, vec2(vUv.x * 0.5 + 0.5, vUv.y * 0.5 + 0.5)).xyz;
    pos4.x = (pos4.x - 0.5) * 2. * radius;
    pos4.y = (pos4.y - 0.5) * 2. * radius;
    pos4.z = (pos4.z - 0.5) * 2. * radius;

    // vec3 pos5 = tParams3.xyz;
    // pos5.xy *= u_resolution * 2.;

    // vec3 pos5 = tParams3.xyz;
    // pos5.xyz *= vec3(u_resolution * 2., u_resolution.x * 2.);

    float d2 = 0.0005;
    float d4 = u_delay; // 0.000025 for mobile and 0.0005 for dekstop
    pos = mix(pos, pos2, min(1., max(0., ((u_progress * (1. + d4 * (u_length - 1.))) - d4 * tParams2.x))));
    pos = mix(pos, pos3, min(1., max(0., ((max(0., u_progress - 1.) * (1. + d2 * (u_length - 1.))) - d2 * tParams2.y))));
    pos = mix(pos, pos4, min(1., max(0., ((max(0., u_progress - 2.) * (1. + d4 * (u_length - 1.))) - d4 * tParams2.z))));
    pos = mix(pos, pos * tParams3.x, min(1., max(0., u_explode * (1. + d3 * (u_length - 1.)) - d3 * tParams2.w)));

    vec4 tOtarget = texture2D(t_oTarget, vUv);
    vec4 tOVelocity = texture2D(t_oVelocity, vUv);

    float spring = u_spring + tParams.w;
    float friction = u_friction;

    float dx = pos.x - tOtarget.x;
    float dy = pos.y - tOtarget.y;
    float dz = pos.z - tOtarget.z;

    float ax = dx * spring;
    float ay = dy * spring;
    float az = dz * spring;

    vx = tOVelocity.x + ax;
    vy = tOVelocity.y + ay;
    vz = tOVelocity.z + az;

    vx *= friction;
    vy *= friction;
    vz *= friction;
  }

  gl_FragColor = vec4(vec3(vx, vy, vz), 1.);
}
