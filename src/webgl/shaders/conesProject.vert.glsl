#define GLSLIFY 1
// mat4 rotMat = rotationMatrix(vec3(0., 0., a_angle.z), a_angle.w);
vec4 mvPosition = vec4( transformed, 1.0 );

// // Show Animation -----
// float d = 0.00005;
// float showVal = min(1., max(0., (u_show * (1. + d * (u_length - 1.))) - d * a_order));
// showVal = qinticInOut(showVal);
// float radius = mix(u_factor + a_random.x * 3., u_factor, showVal) + u_explode * a_random.y;

vec3 pos = texture2D(t_position, a_id).xyz;
vec3 basePos = pos;

// pos.x = (pos.x - 0.5) * 2. * radius;
// pos.y = (pos.y - 0.5) * 2. * radius;
// pos.z = (pos.z - 0.5) * 2. * radius;

// vec3 pos2 = texture2D(t_position, vec2(a_id.x + 0.5, a_id.y)).xyz;
// pos2.x = (pos2.x - 0.5) * 2. * radius;
// pos2.y = (pos2.y - 0.5) * 2. * radius;
// pos2.z = (pos2.z - 0.5) * 2. * radius;

// vec3 pos3 = texture2D(t_position, vec2(a_id.x, a_id.y + 0.5)).xyz;
// pos3.x = (pos3.x - 0.5) * 2. * radius;
// pos3.y = (pos3.y - 0.5) * 2. * radius;
// pos3.z = (pos3.z - 0.5) * 2. * radius;

// vec3 pos4 = texture2D(t_position, vec2(a_id.x + 0.5, a_id.y + 0.5)).xyz;
// pos4.x = (pos4.x - 0.5) * 2. * radius;
// pos4.y = (pos4.y - 0.5) * 2. * radius;
// pos4.z = (pos4.z - 0.5) * 2. * radius;

// pos = mix(pos, pos2, u_progress);
// pos = mix(pos, pos3, max(0., u_progress - 1.));
// pos = mix(pos, pos4, max(0., u_progress - 2.));

pos = texture2D(t_simulation, vec2(a_id.x * 2., a_id.y * 2.)).xyz;
// vec3 basePos = pos;

// Mouse Animation -----
vec4 mPos = vec4(pos, 1.);
mPos *= rotationMatrix(vec3(1., 0., 0.), u_rotation.x * -1.);
mPos *= rotationMatrix(vec3(0., 1., 0.), u_rotation.y * -1.);
mPos *= rotationMatrix(vec3(0., 0., 1.), u_rotation.z * -1.);
mPos.y -= 1.;
mPos.x += u_offset.x;
mPos.y += u_offset.y;
vec2 resolution = mix(
  u_resolution - u_resolution * 0.5,
  u_resolution2 - u_resolution2 * 0.5,
  min(1., max(0., u_progress2))
);
vec2 m = u_mouse * vec2(1., 1.);
float dist = smoothstep( 1.25 + abs(max(u_delta.x, u_delta.y)), 0., distance(mPos.xy, m * resolution)); 
pos.x += dist * sin(u_time * a_random.y) * (a_random.z*0.35 + u_delta.x) * abs( u_explode - 1.);
pos.y += dist * cos(u_time * a_random.y) * (a_random.z* 0.35 + u_delta.y) * abs( u_explode - 1.);

// pos.x += m.x * 0.05;
// pos.y += m.y * 0.05;

// Offset Position -----
// pos += u_offset;

// Mouse Animation -----
// vec4 fake_frag_coord  = mvPosition * vec4(pos, 1.);
// fake_frag_coord.xyz /= fake_frag_coord.w;
// fake_frag_coord.w = 1.0 / fake_frag_coord.w;
// fake_frag_coord.xyz *= vec3 (0.5) + vec3 (0.5);
// fake_frag_coord.xy  *= u_resolution.xy * 0.5; 
// fake_frag_coord.xy  *= vec2(-1., 1.); 

// // Mouse Animation -----
// vec4 mPos = vec4(pos.xy, 1., 1.);
// mPos.y -= 1.;
// mPos.xy += u_offset.xy;
// // mPos *= rotationMatrix(vec3(1., 0., 0.), u_rotation.x);
// // mPos *= rotationMatrix(vec3(0., 1., 0.), u_rotation.y);
// // mPos *= rotationMatrix(vec3(0., 0., 1.), u_rotation.z);
// vec4 tFluid = texture2D( t_fluid, (mPos.xy + u_resolution * 0.5) / u_resolution );
// // pos.x += tFluid.r * 0.025;
// // pos.x -= tFluid.b * 0.025;
// pos.z -= tFluid.r * 0.01;

// vec2 resolution = u_resolution * 0.5;
// vec2 m = resolution * u_mouse * vec2(1., 1.);
// float dist = smoothstep(2., 0., distance(pos.xy + u_offset.xy, m));
// pos *= max(1., 1. + dist * 0.1 + dist * abs(sin(basePos.y * 120. + u_time * 0.5)) * 0.1);

float n = snoise(pos * u_amplitude);
// float n2 = snoise(pos * u_amplitude2 + u_time * 0.2);
mat4 rotMat = rotationMatrix(vec3(1., 0., 1.), n);
// mat4 rotMat2 = rotationMatrix(vec3(0., 1., 0.), mod(u_time * a_random.x * 2., 3.1416 * 2.));
mat4 rotMat2 = rotationMatrix(vec3(0., 1., 1.), mod(n + u_time, 3.1416 * 2.));

float scale = texture2D(t_scale, a_id).x * u_scale;
float scale2 = texture2D(t_scale, vec2(a_id.x + 0.5, a_id.y)).x * u_scale;
float scale3 = texture2D(t_scale, vec2(a_id.x, a_id.y + 0.5)).x * u_scale;
float scale4 = texture2D(t_scale, vec2(a_id.x + 0.5, a_id.y + 0.5)).x * u_scale;
scale = mix(scale, scale2, u_progress);
scale = mix(scale, scale3, max(0., u_progress - 1.));
scale = mix(scale, scale4, max(0., u_progress - 2.));

scale += dist * 0.75 * abs( u_explode - 1.);

#ifdef USE_INSTANCING
  mat4 instanceMat = instanceMatrix;

  instanceMat[3][0] = instanceMat[3][0] + pos.x;
  instanceMat[3][1] = instanceMat[3][1] + pos.y;
  instanceMat[3][2] = instanceMat[3][2] + pos.z;

  mat4 rotMat3 = mat4(calcLookAtMatrix(vec3(instanceMat[3][0] + u_offset.x, instanceMat[3][1] + u_offset.y, instanceMat[3][2]), cameraPosition, 0.));

  // instanceMat[0][0] = instanceMat[0][0] * smoothstep(0., 1., scale);
  // instanceMat[1][1] = instanceMat[1][1] * smoothstep(0., 1., scale);
  // instanceMat[2][2] = instanceMat[2][2] * smoothstep(0., 1., scale);

  instanceMat[0][0] = instanceMat[0][0] * scale;
  instanceMat[1][1] = instanceMat[1][1] * scale;
  instanceMat[2][2] = instanceMat[2][2] * scale;

  // instanceMat *= rotMat;
  if (u_mobileRotation > 0.) {
    instanceMat *= rotMat3;
  } else {
    instanceMat *= rotMat2;
  }

	mvPosition = instanceMat * mvPosition;
  // mvPosition.xyz += u_offset;
#endif

// Offset Position -----
mat4 modViewMatrix = modelViewMatrix;
modViewMatrix[3][0] += u_offset.x;
modViewMatrix[3][1] += u_offset.y;
modViewMatrix *= rotationMatrix(vec3(1., 0., 0.), u_rotation.x);
modViewMatrix *= rotationMatrix(vec3(0., 1., 0.), u_rotation.y);
modViewMatrix *= rotationMatrix(vec3(0., 0., 1.), u_rotation.z);

mvPosition = modViewMatrix * mvPosition;

// mat4 testMatrix = modelMatrix;
// testMatrix[3][0] += u_offset.x;
// testMatrix *= rotationMatrix(vec3(0., 1., 0.), u_rotation);

// mvPosition2 = testMatrix * mvPosition2;

v_pos = mvPosition.xyz;
v_pos.z += 10.;

// // Mouse Animation -----
// vec2 resolution = u_resolution * 0.5;
// vec2 m = u_mouse * vec2(1., 1.);
// // float dist = smoothstep(.1, 0., distance(mvPosition.xy / resolution, m));
// float dist = step(distance(mvPosition.xy / resolution, m), .1);
// mvPosition.x += dist * sin(u_time * a_random.y) * a_random.z;
// mvPosition.y += dist * cos(u_time * a_random.y) * a_random.z;
// // mvPosition.z += dist * cos(u_time * a_random.y) * a_random.z;
// // mvPosition.z += dist * abs(sin(basePos.y * 120. + u_time * 0.5)) * 1.5;

// vec4 tFluid = texture2D( t_fluid, (mvPosition.xy + vec2(1.) ) * 0.5);
// mvPosition.x += tFluid.r * 0.01;
// mvPosition.x -= tFluid.b * 0.01;
// pos.y += tFluid.g * 0.01;
// mvPosition.z += tFluid.r * 0.05;

gl_Position = projectionMatrix * mvPosition;

v_id = a_id;
v_hover = dist;