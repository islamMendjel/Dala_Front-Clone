precision highp float;
#define GLSLIFY 1

uniform sampler2D t_position;
uniform sampler2D t_oPos;
uniform sampler2D t_velocity;
uniform sampler2D t_params;
uniform sampler2D t_params2;

uniform float u_factor;
uniform float u_length;
uniform float u_show;
uniform float u_explode;
uniform float u_progress;
uniform float u_rendered;

varying vec2 vUv;

float qinticInOut(float x)
{
  //  x < 0.5 ? 16 * x * x * x * x * x : 1 - pow(-2 * x + 2, 5) / 2;
  float inValue = 16.0 * x * x * x * x * x;
  float outValue = 1.0 - pow(-2.0 * x + 2.0, 5.0) / 2.0;
  return step(inValue , 0.5) * inValue + step(0.5,outValue) * outValue;
}

void main() {
  vec4 tOpos = texture2D(t_oPos, vUv);
  vec3 pos = tOpos.xyz;

  if (u_rendered > 0.) {
    vec4 tVelocity = texture2D(t_velocity, vUv);
    pos += tVelocity.xyz;

  } else {
    vec4 tParams = texture2D(t_params, vUv);
    vec4 tParams2 = texture2D(t_params2, vUv);

    // Show Animation -----
    float d = 0.00005;
    float d2 = 0.0005;
    float showVal = min(1., max(0., (u_show * (1. + d * (u_length - 1.))) - d * tParams.z));
    showVal = qinticInOut(showVal);
    // float radius = mix(u_factor + tParams.x * 3., u_factor, showVal) + u_explode * tParams.y;
    float radius = mix(u_factor + tParams.x * 3., u_factor, showVal) + min(1., max(0., (u_explode * (u_length - 1.)) - d2 * tParams2.w));

    pos = texture2D(t_position, vec2(vUv.x * 0.5, vUv.y * 0.5)).xyz;
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

    pos = mix(pos, pos2, u_progress);
    pos = mix(pos, pos3, max(0., u_progress - 1.));
    pos = mix(pos, pos4, max(0., u_progress - 2.));
  }

  gl_FragColor = vec4(pos, 1.);
}
