#define GLSLIFY 1
mat4 rotMat = rotationMatrix(vec3(a_angle.x, a_angle.y, a_angle.z), mod(a_angle.w * u_time * 0.15, 3.1416 * 2.));
vec4 mvPosition = vec4( transformed, 1.0 );

v_color = a_color;

#ifdef USE_INSTANCING
  mat4 instanceMat = instanceMatrix;

  float zFactor = map(instanceMat[3][2], 0., 9., 0.5, 0.2);

  instanceMat[3][0] = instanceMat[3][0] * u_resolution.x * zFactor - u_mouse.x * a_param.x + sin(u_time * a_param.w * 0.5) * a_param.y * 0.15;
  instanceMat[3][1] = instanceMat[3][1] * u_resolution.y * zFactor - u_mouse.y * a_param.x + cos(u_time * a_param.w * 0.5) * a_param.z * 0.15;
  instanceMat[3][2] = instanceMat[3][2];

  instanceMat[0][0] = instanceMat[0][0] * u_scale;
  instanceMat[1][1] = instanceMat[1][1] * u_scale;
  instanceMat[2][2] = instanceMat[2][2] * u_scale;

  instanceMat *= rotMat;

	mvPosition = instanceMat * mvPosition;
#endif

mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;