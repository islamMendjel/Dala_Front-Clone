precision highp float;
#define GLSLIFY 1

uniform sampler2D t_noise;

uniform float u_show;
uniform float u_bright;
uniform float u_alpha;
uniform float u_scale;
uniform float u_time;

varying vec2 vUv;

float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

float pattern() {
  float s = sin( 0.5 ), c = cos( 0.5 );
  vec2 center = vec2(random(vUv + u_time));
  vec2 tex = vUv * vec2(4096, 4096) * u_scale - center;
  vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y );
  return ( sin( point.x ) * sin( point.y ) ) * 4.0;
}

void main() {
  // vec4 tNoise = texture2D(t_noise, vUv * u_scale);

  // // vec3 color = vec3(0.);
  // // float dist = distance(vec2(0.5), vUv) * 2.;
  // // float alpha = smoothstep(u_show - 0.1, u_show + 0.1, dist);

  // // gl_FragColor = vec4(color, alpha);

  // vec4 black = vec4(0., 0., 0., 1.);
  // vec4 grain = vec4(tNoise.rgb * u_bright, u_alpha);
  // float dist = distance(vec2(0.5), vUv) * 2.;
  // vec4 color = mix(grain, black, smoothstep(u_show - 0.1, u_show + 0.1, dist));

  // gl_FragColor = vec4(color, alpha);

  float dist = distance(vec2(0.5), vUv) * 2.;

  vec4 black = vec4(0., 0., 0., 1.);
  float rand = random(gl_FragCoord.xy * 0.01 * u_scale + u_time * 0.01);
  // float distVignette = smoothstep(0.5, 0.9, dist);
  // vec4 grain = mix(vec4(rand, rand, rand, u_alpha), vec4(0., 0., 0., 1.), distVignette);
  // vec4 grain = vec4(rand, rand, rand, u_alpha);
  float pat = pattern();
  vec4 grain = vec4(pat, pat, pat, u_alpha);
  grain.rgb *= u_bright;

  vec4 color = mix(grain, black, smoothstep(u_show - 0.1, u_show + 0.1, dist));

  gl_FragColor = color;
}
