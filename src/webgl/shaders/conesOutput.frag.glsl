#define GLSLIFY 1
vec3 col = texture2D(t_color, v_id).xyz;
vec3 col2 = texture2D(t_color, vec2(v_id.x + 0.5, v_id.y)).xyz;
vec3 col3 = texture2D(t_color, vec2(v_id.x, v_id.y + 0.5)).xyz;
vec3 col4 = texture2D(t_color, vec2(v_id.x + 0.5, v_id.y + 0.5)).xyz;
col = mix(col, col2, u_progress);
col = mix(col, col3, max(0., u_progress - 1.));
col = mix(col, col4, max(0., u_progress - 2.));
// col += v_hover * 0.5;
col = mix(col, vec3(0.45), max(0., v_hover - u_explode) * abs( u_explode - 1.));

#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
// https://github.com/mrdoob/three.js/pull/22425
#ifdef USE_TRANSMISSION
diffuseColor.a *= transmissionAlpha + 0.1;
#endif
outgoingLight.rgb = col.rgb * u_colorFactor;
// outgoingLight.rgb = vec3(smoothstep(-7., 5., v_pos.z));
// outgoingLight.rgb = vec3(step(1., v_pos.y / (u_resolution.y * 0.5)));
// outgoingLight.rgb = vec3(v_pos.x / (u_resolution.x * 0.5));
// outgoingLight.rgb = vec3(v_pos.y / (u_resolution.y * 0.5));
// float alpha = diffuseColor.a * mix(smoothstep(-8., 5., v_pos.z), 1., u_explode);
float alpha = diffuseColor.a * smoothstep(-4.5, 4., v_pos.z);
gl_FragColor = vec4( outgoingLight, alpha );