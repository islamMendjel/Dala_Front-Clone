import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  FloatType,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RawShaderMaterial,
  RepeatWrapping,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  UnsignedByteType,
  UVMapping,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import gsap from 'gsap';
import { store } from '../ui/SmoothScroll';

import depthVert from './shaders/customDepth.vert.glsl?raw';
import depthFrag from './shaders/customDepth.frag.glsl?raw';
import frontConesRotationChunk from './shaders/frontConesRotation.chunk.glsl?raw';
import frontConesProjectVert from './shaders/frontConesProject.vert.glsl?raw';
import frontConesMapChunk from './shaders/frontConesMap.chunk.glsl?raw';
import worldposChunk from './shaders/worldpos.chunk.glsl?raw';
import frontConesOutputFrag from './shaders/frontConesOutput.frag.glsl?raw';
import bigTriangleVert from './shaders/bigTriangle.vert.glsl?raw';
import bigTriangleFrag from './shaders/bigTriangle.frag.glsl?raw';
import conesMatrixChunk from './shaders/conesMatrix.chunk.glsl?raw';
import conesProjectVert from './shaders/conesProject.vert.glsl?raw';
import snoise3dChunk from './shaders/snoise3d.chunk.glsl?raw';
import qinticOutChunk from './shaders/qinticOut.chunk.glsl?raw';
import qinticInOutChunk from './shaders/qinticInOut.chunk.glsl?raw';
import conesOutputFrag from './shaders/conesOutput.frag.glsl?raw';
import simQuadVert from './shaders/simulation.vert.glsl?raw';
import simPositionFrag from './shaders/simulationPos.frag.glsl?raw';
import simSpringFrag from './shaders/simulationSpring.frag.glsl?raw';
import grainVert from './shaders/grainLayer.vert.glsl?raw';
import grainFrag from './shaders/grainLayer.frag.glsl?raw';

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function mapRange(val: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((val - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

export function calcPerspectiveSize(camera: PerspectiveCamera, distance: number) {
  const fovRad = (camera.fov * Math.PI) / 180;
  const height = 2 * Math.tan(fovRad / 2) * Math.abs(distance);
  return { width: height * camera.aspect, height };
}

// Verbatim from theme.pretty.js jt (L4487–4498)
export class CustomBasicMaterial extends MeshBasicMaterial {
  _customUniforms: any[];
  constructor(params: any = { customUniforms: [], onBeforeCompile: () => {} }) {
    const { customUniforms = [], onBeforeCompile = () => {}, ...rest } = params;
    super(rest);
    this._customUniforms = customUniforms;
    this.onBeforeCompile = onBeforeCompile;
    this._setup();
  }
  get customUniforms() {
    return this._customUniforms;
  }
  _setup() {}
}

// Verbatim from theme.pretty.js Bt (L4499–4527)
export class CustomDepthMaterial extends ShaderMaterial {
  _customUniforms: Record<string, any>;
  constructor({
    customUniforms = {} as Record<string, any>,
    near = 0.1,
    far = 13,
    transparent = false,
    onBeforeCompile = () => {},
  }: {
    customUniforms?: Record<string, any>;
    near?: number;
    far?: number;
    transparent?: boolean;
    onBeforeCompile?: (shader: any, renderer: any) => void;
  } = {}) {
    let vs = depthVert;
    let fs = depthFrag;
    customUniforms.u_near = { type: 'float', value: near };
    customUniforms.u_far = { type: 'float', value: far };
    const uniforms: Record<string, any> = {};
    Object.keys(customUniforms).forEach((key) => {
      uniforms[key] = customUniforms[key];
      vs = `uniform ${customUniforms[key].type} ${key};\n` + vs;
      fs = `uniform ${customUniforms[key].type} ${key};\n` + fs;
    });
    super({ transparent, uniforms, vertexShader: vs, fragmentShader: fs });
    this._customUniforms = customUniforms;
    this.onBeforeCompile = onBeforeCompile;
    this._setup();
  }
  get customUniforms() {
    return this._customUniforms;
  }
  _setup() {}
}

// Verbatim from theme.pretty.js Ht (L4539–4692)
export class FrontCones extends Object3D {
  _params = { basePosition: new Vector3() };
  _mouseTg = { x: 0, y: 0 };
  _easing = 0.1;
  _nb = 250;
  _loaded = false;
  _geometry!: BufferGeometry;
  _material!: CustomBasicMaterial;
  _depthMaterial!: CustomDepthMaterial;
  _mesh!: InstancedMesh;
  _pSize!: { width: number; height: number };

  constructor() {
    super();
  }

  _setupGeometry() {
    store.WebGL.assets.models.piramed.scene.traverse((child: any) => {
      if (child.type === 'Mesh') {
        this._geometry = child.geometry.clone();
      }
    });
  }

  _setupMaterial() {
    const self = this;
    this._material = new CustomBasicMaterial({
      color: new Color('white'),
      vertexColors: true,
      transparent: true,
      customUniforms: [
        { id: 'u_time', type: 'float', value: 0 },
        { id: 'u_scale', type: 'float', value: 1 },
        { id: 'u_resolution', type: 'vec2', value: new Vector2() },
        { id: 'u_mouse', type: 'vec2', value: new Vector2() },
      ],
      onBeforeCompile: function (this: CustomBasicMaterial, shader: any) {
        for (let i = 0; i < this._customUniforms.length; i++) {
          const u = this._customUniforms[i];
          shader.uniforms[u.id] = u;
          shader.vertexShader = `uniform ${u.type} ${u.id};\n` + shader.vertexShader;
          shader.fragmentShader = `uniform ${u.type} ${u.id};\n` + shader.fragmentShader;
        }
        shader.vertexShader = frontConesRotationChunk + shader.vertexShader;
        shader.vertexShader = frontConesMapChunk + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_param;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_angle;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_color;\n' + shader.vertexShader;
        shader.vertexShader = 'varying vec4 v_color;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', frontConesProjectVert);
        shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', worldposChunk);
        shader.fragmentShader = 'varying vec4 v_color;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <output_fragment>', frontConesOutputFrag);
      },
    });
    void self;
  }

  _setupMesh() {
    this._mesh = new InstancedMesh(this._geometry, this._material, this._nb);
    const mat = new Matrix4();
    const pos = new Vector3();
    const quat = new Quaternion();
    const scale = new Vector3();
    const colors = new Float32Array(4 * this._nb);
    const angles = new Float32Array(4 * this._nb);
    const params = new Float32Array(4 * this._nb);
    const palette = [
      { r: 93, g: 57, b: 154 },
      { r: 186, g: 136, b: 43 },
      { r: 40, g: 116, b: 100 },
      { r: 164, g: 148, b: 175 },
    ];
    for (let i = 0; i < this._nb; i++) {
      const x = 2 * Math.random() - 1;
      const y = 2 * Math.random() - 1;
      const z = 9 * Math.random();
      const s = store.mq.sm.matches ? 0.075 : 0.05;
      pos.set(x, y, z);
      scale.set(s, s, s);
      mat.compose(pos, quat, scale);
      this._mesh.setMatrixAt(i, mat);
      mat.identity();
      colors[4 * i] = palette[i % 4].r / 255;
      colors[4 * i + 1] = palette[i % 4].g / 255;
      colors[4 * i + 2] = palette[i % 4].b / 255;
      colors[4 * i + 3] = Math.random();
      angles[4 * i] = 2 * Math.random() - 1;
      angles[4 * i + 1] = 2 * Math.random() - 1;
      angles[4 * i + 2] = 2 * Math.random() - 1;
      angles[4 * i + 3] = 2 * Math.random() - 1 * Math.PI;
      params[4 * i] = Math.random();
      params[4 * i + 1] = Math.random();
      params[4 * i + 2] = Math.random();
      params[4 * i + 3] = Math.random();
    }
    this._geometry.setAttribute('a_param', new InstancedBufferAttribute(params, 4));
    this._geometry.setAttribute('a_color', new InstancedBufferAttribute(colors, 4));
    this._geometry.setAttribute('a_angle', new InstancedBufferAttribute(angles, 4));
    this._depthMaterial = new CustomDepthMaterial({
      transparent: true,
      customUniforms: {
        u_time: { type: 'float', value: 0 },
        u_scale: { type: 'float', value: 1 },
        u_resolution: { type: 'vec2', value: new Vector2() },
        u_mouse: { type: 'vec2', value: new Vector2() },
      },
      onBeforeCompile: function (shader: any) {
        shader.vertexShader = frontConesRotationChunk + shader.vertexShader;
        shader.vertexShader = frontConesMapChunk + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_param;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_angle;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_color;\n' + shader.vertexShader;
        shader.vertexShader = 'varying vec4 v_color;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', frontConesProjectVert);
      },
    });
    this._mesh.customDepthMaterial = this._depthMaterial;
    this.add(this._mesh);
  }

  onMousemove(mouse: { x: number; y: number }) {
    this._mouseTg.x = mouse.x;
    this._mouseTg.y = mouse.y;
  }

  onAssetsLoaded() {
    this._loaded = true;
    this._setupGeometry();
    this._setupMaterial();
    this._setupMesh();
  }

  resize({ camera }: { camera: PerspectiveCamera }) {
    if (this._loaded) {
      this._pSize = calcPerspectiveSize(camera, 9.9);
      this._material.customUniforms[2].value.set(this._pSize.width, this._pSize.height);
      this._depthMaterial.customUniforms.u_resolution.value.set(this._pSize.width, this._pSize.height);
    }
  }

  update(time: number) {
    if (this._loaded) {
      this._material.customUniforms[0].value = time;
      this._depthMaterial.customUniforms.u_time.value = time;
      this._updateMouse();
      if (store.mq.sm.matches) this._updatePosition();
    }
  }

  _updateMouse() {
    this._material.customUniforms[3].value.x +=
      (0.25 * this._mouseTg.x - this._material.customUniforms[3].value.x) * this._easing;
    this._material.customUniforms[3].value.y +=
      (0.25 * this._mouseTg.y - this._material.customUniforms[3].value.y) * this._easing;
    this._depthMaterial.customUniforms.u_mouse.value.x +=
      (0.25 * this._mouseTg.x - this._depthMaterial.customUniforms.u_mouse.value.x) * this._easing;
    this._depthMaterial.customUniforms.u_mouse.value.y +=
      (0.25 * this._mouseTg.y - this._depthMaterial.customUniforms.u_mouse.value.y) * this._easing;
  }

  _updatePosition() {
    const e = store.sectionProgress;
    const t =
      clamp(mapRange(e, 0, 1, 2, -5), -5, 1) +
      clamp(mapRange(e, 1.25, 1.5, 0, 5), 0, 5) -
      clamp(mapRange(e, 2.7, 3, 0, 5), 0, 5) +
      clamp(mapRange(e, 3.3, 3.5, 0, 5), 0, 9) -
      clamp(mapRange(e, 4.5, 5, 0, 5), 0, 4);
    this._params.basePosition.x = 0.25 * t;
    this.position.x += (this._params.basePosition.x - this.position.x) * this._easing;
  }
}

// Verbatim from theme.pretty.js $t (L4697–4747)
export class DoubleFBO {
  simulation: any;
  _read: WebGLRenderTarget;
  _write: WebGLRenderTarget;
  debug1?: Mesh;
  debug2?: Mesh;

  constructor({
    width = 256,
    height = 256,
    format = RGBAFormat,
    type = FloatType,
    minFilter = NearestFilter,
    magFilter = NearestFilter,
    depthBuffer = false,
    stencilBuffer = false,
    generateMipmaps = false,
    material,
    debug = false,
  }: any) {
    this.simulation = material;
    const opts = {
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      minFilter,
      magFilter,
      format,
      type,
      stencilBuffer,
      depthBuffer,
      generateMipmaps,
    };
    this._read = new WebGLRenderTarget(width, height, opts);
    this._write = new WebGLRenderTarget(width, height, opts);
    if (debug) this.debug();
  }

  swap() {
    const tmp = this._read;
    this._read = this._write;
    this._write = tmp;
  }

  setSize(w: number, h: number) {
    this._read.setSize(w, h);
    this._write.setSize(w, h);
  }

  debug() {
    this.debug1 = new Mesh(new PlaneGeometry(4, 4), new MeshBasicMaterial({ map: this._read.texture }));
    this.debug1.renderOrder = 1;
    this.debug2 = new Mesh(new PlaneGeometry(1.4, 1.4), new MeshBasicMaterial({ map: this._write.texture }));
    this.debug2.renderOrder = 2;
    this.debug1.position.set(0, 2.5, 1);
    this.debug2.position.set(0, 0, 0);
    store.WebGL.add(this.debug1);
  }

  get read() {
    return this._read;
  }
  get write() {
    return this._write;
  }
}

// Verbatim from theme.pretty.js xn (L5619–5658)
export class SingleFBO {
  _fbo: WebGLRenderTarget;
  constructor({
    width = 256,
    height = 256,
    format = RGBAFormat,
    type = UnsignedByteType,
    minFilter = LinearFilter,
    magFilter = LinearFilter,
    depthBuffer = true,
    generateMipmaps = false,
    stencilBuffer = false,
  }: any = {}) {
    const opts = {
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      minFilter,
      magFilter,
      format,
      type,
      stencilBuffer,
      depthBuffer,
      generateMipmaps,
    };
    this._fbo = new WebGLRenderTarget(width, height, opts);
  }

  setSize(w: number, h: number) {
    this._fbo.setSize(w, h);
  }

  dispose() {
    this._fbo.dispose();
  }

  get renderTarget() {
    return this._fbo;
  }
  get texture() {
    return this._fbo.texture;
  }
}

// Verbatim from theme.pretty.js Jt (L4751–4810)
export class BigTriangle extends Object3D {
  _geometry: BufferGeometry;
  _material: RawShaderMaterial;
  _mesh: Mesh;
  _camera!: OrthographicCamera;
  _scene!: Scene;

  constructor({
    positions = new Float32Array([-0.5, -0.5, 1.5, -0.5, -0.5, 1.5]),
    uvs = new Float32Array([0, 0, 2, 0, 0, 2]),
    material = new RawShaderMaterial({
      uniforms: { t_diffuse: { value: null } },
      vertexShader: bigTriangleVert,
      fragmentShader: bigTriangleFrag,
    }),
    texture = null as Texture | null,
    scene = false,
  }: any = {}) {
    super();
    this._geometry = new BufferGeometry();
    this._geometry.setAttribute('position', new BufferAttribute(positions, 2));
    this._geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    if (texture) {
      material.uniforms.t_diffuse = { value: texture };
      material.uniforms.t_diffuse.value.needsUpdate = true;
    }
    this._material = material;
    this._mesh = new Mesh(this._geometry, this._material);
    this._mesh.frustumCulled = false;
    this.add(this._mesh);
    if (scene) {
      this._camera = this.addOrthographicCamera({ width: 1, height: 1, near: 0, far: 1 });
      this._scene = this.addScene();
      this._scene.add(this);
    }
  }

  addOrthographicCamera({
    width = window.innerWidth,
    height = window.innerHeight,
    near = 0,
    far = 100,
  } = {}) {
    return new OrthographicCamera(width / -2, width / 2, height / 2, height / -2, near, far);
  }

  addScene({ scene = new Scene() } = {}) {
    return scene;
  }

  get geometry() {
    return this._geometry;
  }
  get material() {
    return this._material;
  }
  set material(mat: RawShaderMaterial) {
    this._material = mat;
    this._mesh.material = this._material;
  }
  get customDepthMaterial() {
    return this._mesh.customDepthMaterial;
  }
  set customDepthMaterial(mat: any) {
    this._mesh.customDepthMaterial = mat;
  }
  get scene() {
    return this._scene;
  }
  get camera() {
    return this._camera;
  }
}

// Verbatim from theme.pretty.js an (L4823–5426)
export class Cones extends Object3D {
  _nb: number;
  _loaded = false;
  objectVisible = true;
  active = false;
  _hasRendered = false;
  _posRT: WebGLRenderTarget | null = null;
  _easing = 0.1;
  _factor: number;
  _scale: number;
  _m = { x: 0, y: 0 };
  _mTg = { x: 0, y: 0 };
  _mPr = { x: 0, y: 0 };
  _mDelta = { x: 0, y: 0 };
  royYEnd: number;
  _params: { pr: number; baseRotation: Vector3; basePosition: Vector3 };
  _position1: Vector3;
  _fluid: any;
  _tParams!: DataTexture;
  _tParams2!: DataTexture;
  _tParams3!: DataTexture;
  _fboPos!: DoubleFBO;
  _fboSpring!: DoubleFBO;
  _simulationPos!: BigTriangle;
  _simulationSpring!: BigTriangle;
  _geometry!: BufferGeometry;
  _material!: CustomBasicMaterial;
  _depthMaterial!: CustomDepthMaterial;
  _mesh!: InstancedMesh;
  _pSize!: { width: number; height: number };
  _pSize2!: { width: number; height: number };

  constructor({ fluid = null }: { fluid?: any } = {}) {
    super();
    this._nb = store.isMobile ? 7000 : 10000;
    this._factor = store.isMobile ? 2.5 : 4.35;
    this._scale = store.isMobile ? 1.2 : 1.55;
    this.royYEnd = store.isMobile ? 5.8 : 6;
    this._params = {
      pr: 0,
      baseRotation: new Vector3(0, -0.25 * Math.PI, 0),
      basePosition: new Vector3(),
    };
    this._position1 = new Vector3(0, -1.19, 0);
    this.position.copy(this._position1);
    this._fluid = fluid;
  }

  _setupFBO() {
    const e = new Uint8Array(40000);
    store.WebGL.renderer.readRenderTargetPixels(this._posRT, 0, 0, 100, 100, e);
    const t = new Uint8Array(40000);
    store.WebGL.renderer.readRenderTargetPixels(this._posRT, 100, 0, 100, 100, t);
    const n = new Uint8Array(40000);
    store.WebGL.renderer.readRenderTargetPixels(this._posRT, 0, 100, 100, 100, n);
    const r = new Uint8Array(40000);
    store.WebGL.renderer.readRenderTargetPixels(this._posRT, 100, 100, 100, 100, r);
    const o = new Uint8Array(40000);
    store.WebGL.renderer.readRenderTargetPixels(this._posRT, 0, 0, 100, 100, o);

    const s: any[] = [];
    const a: any[] = [];
    const l: any[] = [];
    const c: any[] = [];
    const h: any[] = [];

    {
      let idx = 0;
      for (let i = 0; i < e.length; i += 4) {
        s.push({ x: e[i], y: e[i + 1], z: e[i + 2], index: idx, order: null });
        idx++;
      }
      s.sort((p1, p2) => p2.y - p1.y);
      for (let i = 0; i < s.length; i++) s[i].order = i;
      s.sort((p1, p2) => p1.index - p2.index);
    }
    {
      let idx = 0;
      for (let i = 0; i < t.length; i += 4) {
        a.push({ x: t[i], index: idx, order: null });
        idx++;
      }
      a.sort((p1, p2) => p1.x - p2.x);
      for (let i = 0; i < a.length; i++) a[i].order = i;
      a.sort((p1, p2) => p1.index - p2.index);
    }
    {
      let idx = 0;
      for (let i = 0; i < n.length; i += 4) {
        l.push({ x: n[i], index: idx, order: null });
        idx++;
      }
      l.sort((p1, p2) => p2.x - p1.x);
      for (let i = 0; i < l.length; i++) l[i].order = i;
      l.sort((p1, p2) => p1.index - p2.index);
    }
    {
      let idx = 0;
      for (let i = 0; i < r.length; i += 4) {
        c.push({ y: r[i + 1], index: idx, order: null });
        idx++;
      }
      c.sort((p1, p2) => p2.y - p1.y);
      for (let i = 0; i < c.length; i++) c[i].order = i;
      c.sort((p1, p2) => p1.index - p2.index);
    }
    {
      let idx = 0;
      for (let i = 0; i < o.length; i += 4) {
        h.push({ y: o[i + 1], index: idx, order: null });
        idx++;
      }
      h.sort((p1, p2) => p1.y - p2.y);
      for (let i = 0; i < h.length; i++) h[i].order = i;
      h.sort((p1, p2) => p1.index - p2.index);
    }

    const width = 100;
    const height = 100;
    const data1 = new Float32Array(40000);
    this._tParams = new DataTexture(
      data1,
      width,
      height,
      RGBAFormat,
      FloatType,
      UVMapping,
      RepeatWrapping,
      RepeatWrapping,
      NearestFilter,
      NearestFilter,
      0
    );
    this._tParams.generateMipmaps = false;

    const data2 = new Float32Array(40000);
    this._tParams2 = new DataTexture(
      data2,
      width,
      height,
      RGBAFormat,
      FloatType,
      UVMapping,
      RepeatWrapping,
      RepeatWrapping,
      NearestFilter,
      NearestFilter,
      0
    );
    this._tParams2.generateMipmaps = false;

    const data3 = new Float32Array(40000);
    this._tParams3 = new DataTexture(
      data3,
      width,
      height,
      RGBAFormat,
      FloatType,
      UVMapping,
      RepeatWrapping,
      RepeatWrapping,
      NearestFilter,
      NearestFilter,
      0
    );
    this._tParams3.generateMipmaps = false;

    for (let i = 0; i < this._nb; i++) {
      (this._tParams.image.data as Float32Array)[4 * i] = i % 2 === 0 ? Math.random() : -1 * Math.random();
      (this._tParams.image.data as Float32Array)[4 * i + 1] = Math.floor(i / 100) / 200 + 0.0025;
      (this._tParams.image.data as Float32Array)[4 * i + 2] = s[i].order;
      (this._tParams.image.data as Float32Array)[4 * i + 3] = 0.0002 * Math.random() - 0.0001;

      (this._tParams2.image.data as Float32Array)[4 * i] = a[i].order;
      (this._tParams2.image.data as Float32Array)[4 * i + 1] = l[i].order;
      (this._tParams2.image.data as Float32Array)[4 * i + 2] = c[i].order;
      (this._tParams2.image.data as Float32Array)[4 * i + 3] = h[i].order;

      (this._tParams3.image.data as Float32Array)[4 * i] = 1 + 5 * Math.random();
      (this._tParams3.image.data as Float32Array)[4 * i + 1] = 2 * Math.random() - 1;
      (this._tParams3.image.data as Float32Array)[4 * i + 2] = mapRange(s[i].x, 0, 256, -1, 1);
      (this._tParams3.image.data as Float32Array)[4 * i + 3] = 0;
    }

    this._tParams.needsUpdate = true;
    this._tParams2.needsUpdate = true;
    this._tParams3.needsUpdate = true;

    this._fboPos = new DoubleFBO({
      width: 200,
      height: 200,
      type: store.isDesktop ? FloatType : HalfFloatType,
    });
    this._fboSpring = new DoubleFBO({
      width: 200,
      height: 200,
      type: store.isDesktop ? FloatType : HalfFloatType,
    });

    this._simulationPos = new BigTriangle({
      material: new RawShaderMaterial({
        uniforms: {
          t_position: { value: null },
          t_velocity: { value: null },
          t_params: { value: this._tParams },
          t_params2: { value: this._tParams2 },
          t_pos: { value: null },
          t_oPos: { value: null },
          u_show: { value: 0 },
          u_length: { value: this._nb },
          u_explode: { value: 0 },
          u_factor: { value: this._factor },
          u_progress: { value: 0 },
          u_rendered: { value: 0 },
        },
        vertexShader: simQuadVert,
        fragmentShader: simPositionFrag,
      }),
      scene: true,
    });
    this._simulationPos.material.uniforms.t_position.value = store.WebGL.assets.textures.cone_position_exr;
    this._simulationPos.material.uniforms.t_position.value.minFilter =
      this._simulationPos.material.uniforms.t_position.value.magFilter = NearestFilter;
    this._simulationPos.material.uniforms.t_position.value.flipY = true;
    this._simulationPos.material.uniforms.t_position.value.needsUpdate = true;
    this._simulationPos.material.needsUpdate = true;

    this._simulationSpring = new BigTriangle({
      material: new RawShaderMaterial({
        uniforms: {
          t_position: { value: null },
          t_oTarget: { value: null },
          t_params: { value: this._tParams },
          t_params2: { value: this._tParams2 },
          t_params3: { value: this._tParams3 },
          t_velocity: { value: null },
          t_oVelocity: { value: null },
          u_show: { value: 0 },
          u_length: { value: this._nb },
          u_explode: { value: 0 },
          u_factor: { value: this._factor },
          u_progress: { value: 0 },
          u_spring: { value: 0.006 },
          u_friction: { value: 0.892 },
          u_resolution: { value: new Vector2() },
          u_rendered: { value: 0 },
        },
        vertexShader: simQuadVert,
        fragmentShader: simSpringFrag,
      }),
      scene: true,
    });
    this._simulationSpring.material.uniforms.t_position.value = store.WebGL.assets.textures.cone_position_exr;
    this._simulationSpring.material.uniforms.t_position.value.minFilter =
      this._simulationSpring.material.uniforms.t_position.value.magFilter = NearestFilter;
    this._simulationSpring.material.uniforms.t_position.value.flipY = true;
    this._simulationSpring.material.uniforms.t_position.value.needsUpdate = true;
    this._simulationSpring.material.needsUpdate = true;
  }

  _setupGeometry() {
    store.WebGL.assets.models.piramed.scene.traverse((child: any) => {
      if (child.type === 'Mesh') {
        this._geometry = child.geometry.clone();
      }
    });
  }

  _setupMaterial() {
    this._material = new CustomBasicMaterial({
      transparent: true,
      customUniforms: [
        { id: 't_position', type: 'sampler2D', value: null },
        { id: 't_scale', type: 'sampler2D', value: null },
        { id: 't_color', type: 'sampler2D', value: null },
        { id: 'u_factor', type: 'float', value: this._factor },
        { id: 'u_time', type: 'float', value: 0 },
        { id: 'u_scale', type: 'float', value: this._scale },
        { id: 'u_amplitude', type: 'float', value: 0.619 },
        { id: 'u_colorFactor', type: 'float', value: 1.3 },
        { id: 'u_show', type: 'float', value: 0 },
        { id: 'u_length', type: 'float', value: this._nb },
        { id: 'u_mouse', type: 'vec2', value: new Vector2(0, 0) },
        { id: 'u_resolution', type: 'vec2', value: new Vector2(store.window.w, store.window.h) },
        { id: 'u_offset', type: 'vec3', value: new Vector3(0, 0, 0) },
        { id: 'u_explode', type: 'float', value: 0 },
        { id: 'u_progress', type: 'float', value: 0 },
        { id: 'u_rotation', type: 'vec3', value: new Vector3() },
        { id: 'u_amplitude2', type: 'float', value: 0.5 },
        { id: 't_simulation', type: 'sampler2D', value: null },
        { id: 't_fluid', type: 'sampler2D', value: this._fluid ? this._fluid.density.read.texture : null },
        { id: 'u_resolution2', type: 'vec2', value: new Vector2() },
        { id: 'u_progress2', type: 'float', value: 0 },
        { id: 'u_delta', type: 'vec2', value: new Vector2() },
        { id: 'u_delay', type: 'vec2', value: store.isMobile ? 25e-6 : 5e-4 },
        { id: 'u_mobileRotation', type: 'float', value: store.isDesktop ? 0 : 1 * Math.PI },
      ],
      onBeforeCompile: function (this: CustomBasicMaterial, shader: any) {
        for (let i = 0; i < this._customUniforms.length; i++) {
          const u = this._customUniforms[i];
          shader.uniforms[u.id] = u;
          shader.vertexShader = `uniform ${u.type} ${u.id};\n` + shader.vertexShader;
          shader.fragmentShader = `uniform ${u.type} ${u.id};\n` + shader.fragmentShader;
        }
        shader.vertexShader = snoise3dChunk + shader.vertexShader;
        shader.vertexShader = qinticInOutChunk + shader.vertexShader;
        shader.vertexShader = conesMatrixChunk + shader.vertexShader;
        shader.vertexShader = qinticOutChunk + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_random;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_angle;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute vec2 a_id;\n' + shader.vertexShader;
        shader.vertexShader = 'varying vec2 v_id;\n' + shader.vertexShader;
        shader.vertexShader = 'varying vec3 v_pos;\n' + shader.vertexShader;
        shader.vertexShader = 'varying float v_hover;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute float a_order;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute float a_index;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', conesProjectVert);
        shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', worldposChunk);
        shader.fragmentShader = 'varying vec3 v_pos;\n' + shader.fragmentShader;
        shader.fragmentShader = 'varying vec2 v_id;\n' + shader.fragmentShader;
        shader.fragmentShader = 'varying float v_hover;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <output_fragment>', conesOutputFrag);
      },
    });
    this._material.customUniforms[0].value = store.WebGL.assets.textures.cone_position_exr;
    this._material.customUniforms[1].value = store.WebGL.assets.textures.cone_scale;
    this._material.customUniforms[2].value = store.WebGL.assets.textures.cone_color;
    this._material.customUniforms[0].value.minFilter = this._material.customUniforms[0].value.magFilter = NearestFilter;
    this._material.customUniforms[0].value.flipY = true;
    this._material.customUniforms[0].value.needsUpdate = true;
    this._material.customUniforms[1].value.minFilter = this._material.customUniforms[0].value.magFilter = NearestFilter;
    this._material.customUniforms[1].value.flipY = false;
    this._material.customUniforms[1].value.needsUpdate = true;
    this._material.customUniforms[2].value.minFilter = this._material.customUniforms[0].value.magFilter = NearestFilter;
    this._material.customUniforms[2].value.flipY = false;
    this._material.customUniforms[2].value.needsUpdate = true;
    this._material.needsUpdate = true;
  }

  _setupMesh() {
    this._mesh = new InstancedMesh(this._geometry, this._material, this._nb);
    const mat = new Matrix4();
    const pos = new Vector3();
    const quat = new Quaternion();
    const scale = new Vector3();
    const randoms = new Float32Array(4 * this._nb);
    const angles = new Float32Array(4 * this._nb);
    const ids = new Float32Array(2 * this._nb);
    const indexes = new Float32Array(this._nb);
    const orders = new Float32Array(this._nb);
    let h = 0;
    for (let i = 0; i < this._nb; i++) {
      pos.set(0, 0, 0);
      scale.set(0.1, 0.1, 0.1);
      mat.compose(pos, quat, scale);
      this._mesh.setMatrixAt(i, mat);
      mat.identity();
      ids[2 * i] = (i % 100) / 200 + 0.0025;
      ids[2 * i + 1] = Math.floor(h / 100) / 200 + 0.0025;
      angles[4 * i] = Math.random();
      angles[4 * i + 1] = Math.random();
      angles[4 * i + 2] = Math.random();
      angles[4 * i + 3] = Math.random();
      indexes[i] = i;
      orders[i] = 0;
      randoms[4 * i] = i % 2 === 0 ? Math.random() : -1 * Math.random();
      randoms[4 * i + 1] = 0.8 * Math.random() + 0.2;
      randoms[4 * i + 2] = store.isMobile ? 0.5 * Math.random() : 0.5 * Math.random() + 0.5;
      randoms[4 * i + 3] = 0;
      h++;
    }
    this._geometry.setAttribute('a_index', new InstancedBufferAttribute(indexes, 1));
    this._geometry.setAttribute('a_order', new InstancedBufferAttribute(orders, 1));
    this._geometry.setAttribute('a_id', new InstancedBufferAttribute(ids, 2));
    this._geometry.setAttribute('a_angle', new InstancedBufferAttribute(angles, 4));
    this._geometry.setAttribute('a_random', new InstancedBufferAttribute(randoms, 4));

    this._depthMaterial = new CustomDepthMaterial({
      transparent: true,
      customUniforms: {
        t_position: { type: 'sampler2D', value: this._material.customUniforms[0].value },
        t_scale: { type: 'sampler2D', value: this._material.customUniforms[1].value },
        t_color: { type: 'sampler2D', value: this._material.customUniforms[2].value },
        u_factor: { type: 'float', value: this._factor },
        u_time: { type: 'float', value: 0 },
        u_scale: { type: 'float', value: this._scale },
        u_amplitude: { type: 'float', value: 0.619 },
        u_colorFactor: { type: 'float', value: 1.3 },
        u_show: { type: 'float', value: 0 },
        u_length: { type: 'float', value: this._nb },
        u_mouse: { type: 'vec2', value: new Vector2(0, 0) },
        u_resolution: { type: 'vec2', value: new Vector2(store.window.w, store.window.h) },
        u_offset: { type: 'vec3', value: new Vector3(0, 0, 0) },
        u_explode: { type: 'float', value: 0 },
        u_progress: { type: 'float', value: 0 },
        u_rotation: { type: 'vec3', value: new Vector3() },
        u_amplitude2: { type: 'float', value: 0.5 },
        t_simulation: { type: 'sampler2D', value: null },
        t_fluid: { type: 'sampler2D', value: this._fluid ? this._fluid.density.read.texture : null },
        u_resolution2: { type: 'vec2', value: new Vector2() },
        u_progress2: { type: 'float', value: 0 },
        u_delta: { type: 'vec2', value: new Vector2() },
        u_mobileRotation: { type: 'float', value: store.isDesktop ? 1 * Math.PI : 0 },
      },
      onBeforeCompile: function (shader: any) {
        shader.vertexShader = snoise3dChunk + shader.vertexShader;
        shader.vertexShader = qinticInOutChunk + shader.vertexShader;
        shader.vertexShader = conesMatrixChunk + shader.vertexShader;
        shader.vertexShader = qinticOutChunk + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_random;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute vec4 a_angle;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute vec2 a_id;\n' + shader.vertexShader;
        shader.vertexShader = 'varying vec2 v_id;\n' + shader.vertexShader;
        shader.vertexShader = 'varying vec3 v_pos;\n' + shader.vertexShader;
        shader.vertexShader = 'varying float v_hover;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute float a_order;\n' + shader.vertexShader;
        shader.vertexShader = 'attribute float a_index;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', conesProjectVert);
      },
    });
    this._mesh.customDepthMaterial = this._depthMaterial;
    this.add(this._mesh);
  }

  activate({ delay = 0 }: { delay?: number } = {}) {
    if (!this.active) {
      const dur = 3;
      gsap.killTweensOf(this._simulationPos.material.uniforms.u_show);
      gsap.to(this._simulationPos.material.uniforms.u_show, {
        value: 1,
        duration: dur,
        ease: 'Power0.easeNone',
        delay,
      });
      gsap.killTweensOf(this._simulationSpring.material.uniforms.u_show);
      gsap.to(this._simulationSpring.material.uniforms.u_show, {
        value: 1,
        duration: dur,
        ease: 'Power0.easeNone',
        delay,
      });
      gsap.killTweensOf(this._material.customUniforms[8]);
      gsap.to(this._material.customUniforms[8], {
        value: 1,
        duration: dur,
        ease: 'Power0.easeNone',
        delay,
      });
      gsap.killTweensOf(this._depthMaterial.customUniforms.u_show);
      gsap.to(this._depthMaterial.customUniforms.u_show, {
        value: 1,
        duration: dur,
        ease: 'Power0.easeNone',
        delay,
      });
      gsap.killTweensOf(this._params.baseRotation);
      gsap.to(this._params.baseRotation, {
        y: 0,
        duration: dur,
        ease: 'Power2.easeOut',
        delay,
      });
      this.active = true;
    }
  }

  deactivate({ delay = 0 }: { delay?: number } = {}) {
    if (this.active) {
      gsap.killTweensOf(this._material.customUniforms[8]);
      gsap.to(this._material.customUniforms[8], {
        value: 3,
        duration: 3,
        ease: 'Power0.easeNone',
        delay,
      });
      gsap.killTweensOf(this._depthMaterial.customUniforms.u_show);
      gsap.to(this._depthMaterial.customUniforms.u_show, {
        value: 3,
        duration: 3,
        ease: 'Power0.easeNone',
        delay,
      });
      this.active = false;
    }
  }

  onMousedown(mouse: { x: number; y: number }) {
    this._mTg = mouse;
    this._mPr.x = this._mTg.x;
    this._mPr.y = this._mTg.y;
    this._mDelta.x = 0;
    this._mDelta.y = 0;
  }

  onMousemove(mouse: { x: number; y: number }) {
    this._mTg = mouse;
    if (store.isMobile) {
      this._mDelta.x = clamp(50 * (this._mTg.x - this._mPr.x), -0.1, 0.1);
      this._mDelta.y = clamp(50 * (this._mTg.y - this._mPr.y), -0.1, 0.1);
    } else {
      this._mDelta.x = clamp(50 * (this._mTg.x - this._mPr.x), -2, 2);
      this._mDelta.y = clamp(50 * (this._mTg.y - this._mPr.y), -2, 2);
    }
    this._mPr.x = this._mTg.x;
    this._mPr.y = this._mTg.y;
  }

  onMouseleave() {
    this._mDelta.x = 0;
    this._mDelta.y = 0;
  }

  onAssetsLoaded({ renderTarget }: { renderTarget?: WebGLRenderTarget } = {}) {
    this._posRT = renderTarget || null;
    this._setupFBO();
    this._setupGeometry();
    this._setupMaterial();
    this._setupMesh();
    this._loaded = true;
  }

  resize({ camera }: { camera?: PerspectiveCamera } = {}) {
    if (this._material && camera) {
      this._pSize = calcPerspectiveSize(camera, 10);
      this._pSize2 = calcPerspectiveSize(camera, 6.5);
      this._material.customUniforms[11].value.x = this._pSize.width;
      this._material.customUniforms[11].value.y = this._pSize.height;
      this._depthMaterial.customUniforms.u_resolution.value.x = this._pSize.width;
      this._depthMaterial.customUniforms.u_resolution.value.y = this._pSize.height;
      this._simulationSpring.material.uniforms.u_resolution.value.set(this._pSize.width, this._pSize.height);
      this._material.customUniforms[19].value.x = this._pSize2.width;
      this._material.customUniforms[19].value.y = this._pSize2.height;
      this._depthMaterial.customUniforms.u_resolution2.value.x = this._pSize2.width;
      this._depthMaterial.customUniforms.u_resolution2.value.y = this._pSize2.height;
    }
  }

  update(time: number) {
    if (this._loaded) {
      this._material.customUniforms[4].value = time;
      this._depthMaterial.customUniforms.u_time.value = time;
      this._material.customUniforms[18].value = this._fluid ? this._fluid.density.read.texture : null;
      this._depthMaterial.customUniforms.t_fluid.value = this._fluid ? this._fluid.density.read.texture : null;
      this._updateRotation();
      this._updateMouse();
      if (store.isMobile) this._updateMobilePosition();
      else this._updatePosition();
      this._updateFBO();
    }
  }

  _updateFBO() {
    if (this._hasRendered) {
      this._simulationSpring.material.uniforms.t_oTarget.value = this._fboPos.read.texture;
      store.WebGL.renderer.setRenderTarget(this._fboSpring.write);
      store.WebGL.renderer.render(this._simulationSpring.scene, this._simulationSpring.camera);
      this._fboSpring.swap();
      this._simulationSpring.material.uniforms.t_oVelocity.value = this._fboSpring.read.texture;
      this._simulationSpring.material.uniforms.t_velocity.value = this._fboSpring.write.texture;
      this._simulationPos.material.uniforms.t_velocity.value = this._fboSpring.write.texture;
      store.WebGL.renderer.setRenderTarget(this._fboPos.write);
      store.WebGL.renderer.render(this._simulationPos.scene, this._simulationPos.camera);
      this._fboPos.swap();
      this._simulationPos.material.uniforms.t_oPos.value = this._fboPos.read.texture;
      this._simulationPos.material.uniforms.t_pos.value = this._fboPos.write.texture;
      this._material.customUniforms[17].value = this._fboPos.write.texture;
      this._depthMaterial.customUniforms.t_simulation.value = this._fboPos.write.texture;
    } else {
      store.WebGL.renderer.setRenderTarget(this._fboPos.write);
      store.WebGL.renderer.render(this._simulationPos.scene, this._simulationPos.camera);
      this._fboPos.swap();
      this._simulationPos.material.uniforms.t_oPos.value = this._fboPos.read.texture;
      this._simulationPos.material.uniforms.t_pos.value = this._fboPos.write.texture;
      this._material.customUniforms[17].value = this._fboPos.write.texture;
      this._depthMaterial.customUniforms.t_simulation.value = this._fboPos.write.texture;
      store.WebGL.renderer.setRenderTarget(this._fboSpring.write);
      store.WebGL.renderer.render(this._simulationSpring.scene, this._simulationSpring.camera);
      this._fboSpring.swap();
      this._simulationSpring.material.uniforms.t_oVelocity.value = this._fboSpring.read.texture;
      this._simulationSpring.material.uniforms.t_velocity.value = this._fboSpring.write.texture;
      this._simulationPos.material.uniforms.u_rendered.value = 1;
      this._simulationSpring.material.uniforms.u_rendered.value = 1;
      this._hasRendered = true;
    }
  }

  _updateRotation() {
    const e = store.sectionProgress;
    const t =
      clamp(mapRange(e, 0, 1, 0, 0.5 * -Math.PI), 0.5 * -Math.PI, 0) +
      clamp(mapRange(e, 2.7, 3, 0, 0.5 * Math.PI), 0, 0.5 * Math.PI) +
      clamp(mapRange(e, 3.3, 3.5, 0, 0.25 * Math.PI), 0, 0.25 * Math.PI) -
      clamp(mapRange(e, 4.5, 5, 0, 1.25 * Math.PI), 0, 1.25 * Math.PI) +
      clamp(mapRange(e, 5.7, this.royYEnd, 0, Math.PI), 0, Math.PI);
    const n = clamp(mapRange(e, 2.7, 3, 0, -0.489), -0.489, 0) + clamp(mapRange(e, 3.3, 3.5, 0, 0.6), 0, 0.6);

    this._material.customUniforms[15].value.x +=
      (0 - this._material.customUniforms[15].value.x) * (0.75 * this._easing);
    this._material.customUniforms[15].value.y +=
      (t - this._material.customUniforms[15].value.y) * (0.75 * this._easing);
    this._material.customUniforms[15].value.z +=
      (n - this._material.customUniforms[15].value.z) * (0.75 * this._easing);
    this._depthMaterial.customUniforms.u_rotation.value.x +=
      (0 - this._depthMaterial.customUniforms.u_rotation.value.x) * (0.75 * this._easing);
    this._depthMaterial.customUniforms.u_rotation.value.y +=
      (t - this._depthMaterial.customUniforms.u_rotation.value.y) * (0.75 * this._easing);
    this._depthMaterial.customUniforms.u_rotation.value.z +=
      (n - this._depthMaterial.customUniforms.u_rotation.value.z) * (0.75 * this._easing);
    this.rotation.y = this._params.baseRotation.y;
  }

  _updateMouse() {
    this._mDelta.x += (0 - this._mDelta.x) * this._easing;
    this._mDelta.y += (0 - this._mDelta.y) * this._easing;
    this._material.customUniforms[10].value.x +=
      (this._mTg.x - this._material.customUniforms[10].value.x) * (0.75 * this._easing);
    this._material.customUniforms[10].value.y +=
      (this._mTg.y - this._material.customUniforms[10].value.y) * (0.75 * this._easing);
    this._depthMaterial.customUniforms.u_mouse.value.x +=
      (this._mTg.x - this._depthMaterial.customUniforms.u_mouse.value.x) * (0.75 * this._easing);
    this._depthMaterial.customUniforms.u_mouse.value.y +=
      (this._mTg.y - this._depthMaterial.customUniforms.u_mouse.value.y) * (0.75 * this._easing);
    this._material.customUniforms[21].value.x +=
      (this._mDelta.x - this._material.customUniforms[21].value.x) * (0.75 * this._easing);
    this._material.customUniforms[21].value.y +=
      (this._mDelta.y - this._material.customUniforms[21].value.y) * (0.75 * this._easing);
    this._depthMaterial.customUniforms.u_delta.value.x +=
      (this._mDelta.x - this._depthMaterial.customUniforms.u_delta.value.x) * (0.75 * this._easing);
    this._depthMaterial.customUniforms.u_delta.value.y +=
      (this._mDelta.y - this._depthMaterial.customUniforms.u_delta.value.y) * (0.75 * this._easing);
  }

  _updatePosition() {
    const e = store.sectionProgress;
    const t =
      clamp(mapRange(e, 0, 1, 3, -4.5), -4.5, 3) +
      clamp(mapRange(e, 1.25, 1.5, 0.905, 5), 0.905, 5) -
      clamp(mapRange(e, 2.8, 3, 0.905, 3), 0.905, 3) +
      clamp(mapRange(e, 3.3, 3.5, 0.905, 6), 0.905, 6) -
      clamp(mapRange(e, 4.5, 5, 0.905, 5), 0.905, 4);
    this._params.basePosition.x = t + 0 * this._material.customUniforms[10].value.x;
    const n =
      clamp(mapRange(e, 2.7, 3, 0, 0.5), 0, 0.5) -
      clamp(mapRange(e, 3.3, 3.5, 0, 0.5), 0, 0.5) +
      clamp(mapRange(e, 5.7, 6, 0, 1.75), 0, 1.75);
    this._params.basePosition.y = n + 0 * this._material.customUniforms[10].value.y;
    const i =
      clamp(mapRange(e, 1.1, 2.2, 0, 1), 0, 1) -
      clamp(mapRange(e, 2.8, 3, 0, 1), 0, 1) +
      clamp(mapRange(e, 4.5, 5, 0, 1), 0, 1) -
      clamp(mapRange(e, 5.7, 6, 0, 1), 0, 1);
    this._material.customUniforms[13].value += (i - this._material.customUniforms[13].value) * this._easing;
    this._simulationPos.material.uniforms.u_explode.value +=
      (i - this._simulationPos.material.uniforms.u_explode.value) * this._easing;
    this._simulationSpring.material.uniforms.u_explode.value +=
      (i - this._simulationSpring.material.uniforms.u_explode.value) * this._easing;

    const r =
      this._factor +
      clamp(mapRange(e, 0, 1, 0, 1), 0, 1) -
      clamp(mapRange(e, 1.25, 1.5, 0, 1), 0, 1) +
      clamp(mapRange(e, 3.3, 3.5, 0, 0.3), 0, 0.3) -
      clamp(mapRange(e, 5.7, 6, 0, 1), 0, 1);
    this._material.customUniforms[3].value += (r - this._material.customUniforms[3].value) * this._easing;
    this._simulationPos.material.uniforms.u_factor.value +=
      (r - this._simulationPos.material.uniforms.u_factor.value) * this._easing;
    this._simulationSpring.material.uniforms.u_factor.value +=
      (r - this._simulationPos.material.uniforms.u_factor.value) * this._easing;

    const o =
      clamp(mapRange(e, 2.7, 3, 0, 1), 0, 1) +
      clamp(mapRange(e, 3.3, 3.5, 0, 1), 0, 1) +
      clamp(mapRange(e, 5.7, 6, 0, 1), 0, 1);
    this._material.customUniforms[14].value += (o - this._material.customUniforms[14].value) * this._easing;
    this._simulationPos.material.uniforms.u_progress.value +=
      (o - this._simulationPos.material.uniforms.u_progress.value) * this._easing;
    this._simulationSpring.material.uniforms.u_progress.value +=
      (o - this._simulationSpring.material.uniforms.u_progress.value) * this._easing;

    const s =
      clamp(mapRange(e, 0, 1, 0, 1), 0, 1) -
      clamp(mapRange(e, 2.7, 3, 0, 1), 0, 1) +
      clamp(mapRange(e, 3, 3.5, 0, 1), 0, 1) -
      clamp(mapRange(e, 5.5, 5.5, 0, 1), 0, 1);
    this._material.customUniforms[20].value += (s - this._material.customUniforms[20].value) * this._easing;
    this._depthMaterial.customUniforms.u_progress2.value +=
      (s - this._depthMaterial.customUniforms.u_progress2.value) * this._easing;
    this._material.customUniforms[12].value.x +=
      (this._params.basePosition.x - this._material.customUniforms[12].value.x) * this._easing;
    this._material.customUniforms[12].value.y +=
      (this._params.basePosition.y - this._material.customUniforms[12].value.y) * this._easing;
    this._depthMaterial.customUniforms.u_offset.value.x +=
      (this._params.basePosition.x - this._depthMaterial.customUniforms.u_offset.value.x) * this._easing;
    this._depthMaterial.customUniforms.u_offset.value.y +=
      (this._params.basePosition.y - this._depthMaterial.customUniforms.u_offset.value.y) * this._easing;
  }

  _updateMobilePosition() {
    const e = store.sectionProgress;
    const t =
      clamp(mapRange(e, 0, 1, 1.5, 0), 0, 1.5) +
      clamp(mapRange(e, 1.25, 1.5, 0, 0), 0, 0) -
      clamp(mapRange(e, 2.8, 3, 0, 0), 0, 0) +
      clamp(mapRange(e, 3.3, 3.5, 0, 0), 0, 0) -
      clamp(mapRange(e, 4.5, 5, 0, 0), 0, 0);
    this._params.basePosition.x = t + 0.052 * this._material.customUniforms[10].value.x;
    this._params.basePosition.y = 2 + 0 * this._material.customUniforms[10].value.y;
    const n =
      clamp(mapRange(e, 1.4, 1.7, 0, 1), 0, 1) -
      clamp(mapRange(e, 2.7, 3, 0, 1), 0, 1) +
      clamp(mapRange(e, 4.5, 5, 0, 1), 0, 1) -
      clamp(mapRange(e, 5.7, 5.8, 0, 1), 0, 1);
    this._material.customUniforms[13].value += (n - this._material.customUniforms[13].value) * this._easing;
    this._simulationPos.material.uniforms.u_explode.value +=
      (n - this._simulationPos.material.uniforms.u_explode.value) * this._easing;
    this._simulationSpring.material.uniforms.u_explode.value +=
      (n - this._simulationSpring.material.uniforms.u_explode.value) * this._easing;

    const i =
      clamp(mapRange(e, 2.7, 3, 0, 1), 0, 1) +
      clamp(mapRange(e, 3.3, 3.5, 0, 1), 0, 1) +
      clamp(mapRange(e, 5.7, 5.8, 0, 1), 0, 1);
    this._material.customUniforms[14].value += (i - this._material.customUniforms[14].value) * this._easing;
    this._simulationPos.material.uniforms.u_progress.value +=
      (i - this._simulationPos.material.uniforms.u_progress.value) * this._easing;
    this._simulationSpring.material.uniforms.u_progress.value +=
      (i - this._simulationSpring.material.uniforms.u_progress.value) * this._easing;
    this._material.customUniforms[12].value.x +=
      (this._params.basePosition.x - this._material.customUniforms[12].value.x) * this._easing;
    this._material.customUniforms[12].value.y +=
      (this._params.basePosition.y - this._material.customUniforms[12].value.y) * this._easing;
    this._depthMaterial.customUniforms.u_offset.value.x +=
      (this._params.basePosition.x - this._depthMaterial.customUniforms.u_offset.value.x) * this._easing;
    this._depthMaterial.customUniforms.u_offset.value.y +=
      (this._params.basePosition.y - this._depthMaterial.customUniforms.u_offset.value.y) * this._easing;
  }
}

// Verbatim from theme.pretty.js yn (L5659–5720)
export class GrainLayer extends Object3D {
  objectVisible = true;
  _mesh!: BigTriangle;
  _depthMaterial!: MeshBasicMaterial;

  constructor(_opts?: any) {
    super();
    this._setupMesh();
  }

  _setupMesh() {
    this._mesh = new BigTriangle({
      material: new RawShaderMaterial({
        uniforms: {
          t_noise: { value: null },
          u_show: { value: 0 },
          u_alpha: { value: store.window.dpr >= 2 ? 0.138 : 0.149 },
          u_bright: { value: store.window.dpr >= 2 ? 0.185 : 0.252 },
          u_scale: { value: store.window.dpr >= 2 ? 1.072 : 1.366 },
          u_time: { value: 0 },
        },
        transparent: true,
        vertexShader: grainVert,
        fragmentShader: grainFrag,
      }),
    });
    this._depthMaterial = new MeshBasicMaterial({ opacity: 0, transparent: true });
    this._mesh.customDepthMaterial = this._depthMaterial;
    this.add(this._mesh);
  }

  show({ delay = 0 }: { delay?: number } = {}) {
    if (!this.objectVisible) {
      gsap.killTweensOf(this._mesh.material.uniforms.u_show);
      gsap.to(this._mesh.material.uniforms.u_show, {
        duration: 2,
        value: 0,
        ease: 'Power2.easeInOut',
        delay,
        onComplete: () => {
          this.objectVisible = true;
          this.visible = true;
        },
      });
    }
  }

  hide({ delay = 0 }: { delay?: number } = {}) {
    if (this.objectVisible) {
      gsap.killTweensOf(this._mesh.material.uniforms.u_show);
      gsap.to(this._mesh.material.uniforms.u_show, {
        duration: 2,
        value: 1,
        ease: 'Power2.easeInOut',
        delay,
        onComplete: () => {
          this.objectVisible = false;
        },
      });
    }
  }

  onAssetsLoaded() {
    this._mesh.material.uniforms.t_noise.value = store.WebGL.assets.textures.grain;
    this._mesh.material.uniforms.t_noise.value.needsUpdate = true;
    this._mesh.material.needsUpdate = true;
  }

  resize() {}

  update(time: number) {
    this._mesh.material.uniforms.u_time.value = time;
  }
}
