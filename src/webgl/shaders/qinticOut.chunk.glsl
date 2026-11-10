#define GLSLIFY 1
float qinticOut(float t) {
  // return 1.0 - (pow(t - 1.0, 5.0));
  return 1.0 - pow(1.0 - t , 5.0);
  // return 1.0 - ((t - 1.0)*(t - 1.0)*(t - 1.0)*(t - 1.0)*(t - 1.0));
}
