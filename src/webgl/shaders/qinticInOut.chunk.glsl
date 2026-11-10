#define GLSLIFY 1
float qinticInOut(float x)
{
  //  x < 0.5 ? 16 * x * x * x * x * x : 1 - pow(-2 * x + 2, 5) / 2;
  float inValue = 16.0 * x * x * x * x * x;
  float outValue = 1.0 - pow(-2.0 * x + 2.0, 5.0) / 2.0;
  return step(inValue , 0.5) * inValue + step(0.5,outValue) * outValue;
}
