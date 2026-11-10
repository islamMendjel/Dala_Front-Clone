import {
  Color,
  CubeTextureLoader,
  LinearFilter,
  MeshDepthMaterial,
  NearestFilter,
  NoBlending,
  PerspectiveCamera,
  RGBADepthPacking,
  Scene,
  ShaderMaterial,
  TextureLoader,
  UniformsUtils,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { store, EventBus, GlobalEvents } from '../ui/SmoothScroll';
import { getAssetsManifest } from './AssetManager';
import { BigTriangle, Cones, FrontCones, GrainLayer, SingleFBO } from './ParticleSystem';

import bokehVert from './shaders/bokeh.vert.glsl?raw';
import bokehFrag from './shaders/bokeh.frag.glsl?raw';

// Verbatim from theme.pretty.js dn (L5431–5462)
export const BokehShader = {
  defines: { RINGS: 4, SAMPLES: 6 },
  uniforms: {
    textureWidth: { value: 1 },
    textureHeight: { value: 1 },
    focalDepth: { value: 1.2 },
    focalLength: { value: 35 },
    fstop: { value: 0.9 },
    tColor: { value: null },
    tDepth: { value: null },
    maxblur: { value: 1 },
    showFocus: { value: 0 },
    manualdof: { value: 0 },
    vignetting: { value: 0 },
    depthblur: { value: 0 },
    threshold: { value: 0.5 },
    gain: { value: 2 },
    bias: { value: 0.5 },
    fringe: { value: 0.7 },
    znear: { value: 0.1 },
    zfar: { value: 100 },
    noise: { value: 1 },
    dithering: { value: 0.0001 },
    pentagon: { value: 0 },
    shaderFocus: { value: 0 },
    focusCoords: { value: new Vector2() },
  },
  vertexShader: bokehVert,
  fragmentShader: bokehFrag,
};

// Verbatim from theme.pretty.js fn (L5463–5567)
export class BokehPass extends Pass {
  scene: Scene;
  camera: PerspectiveCamera;
  renderTargetDepth: WebGLRenderTarget;
  materialDepth: MeshDepthMaterial;
  materialBokeh: ShaderMaterial;
  uniforms: Record<string, any>;
  fsQuad: FullScreenQuad;
  _oldClearColor: Color;

  constructor(
    scene: Scene,
    camera: PerspectiveCamera,
    {
      focalDepth = 1,
      focalLength = 35,
      fstop = 0.9,
      maxblur = 1,
      showFocus = 0,
      manualdof = 0,
      vignetting = 0,
      depthblur = 0,
      threshold = 0.5,
      gain = 2,
      bias = 0.5,
      fringe = 0.7,
      znear = 0.1,
      zfar = 100,
      noise = 1,
      dithering = 0.0001,
      pentagon = 0,
      shaderFocus = 0,
      focusCoords = new Vector2(),
      width = window.innerWidth,
      height = window.innerHeight,
    }: any = {}
  ) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.renderTargetDepth = new WebGLRenderTarget(width, height, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    });
    this.renderTargetDepth.texture.name = 'BokehPass.depth';
    this.materialDepth = new MeshDepthMaterial();
    this.materialDepth.depthPacking = RGBADepthPacking;
    this.materialDepth.blending = NoBlending;

    const shader = BokehShader;
    const uniforms = UniformsUtils.clone(shader.uniforms);
    uniforms.tDepth.value = this.renderTargetDepth.texture;
    uniforms.textureWidth.value = width;
    uniforms.textureHeight.value = height;
    uniforms.focalDepth.value = focalDepth;
    uniforms.focalLength.value = focalLength;
    uniforms.fstop.value = fstop;
    uniforms.maxblur.value = maxblur;
    uniforms.showFocus.value = showFocus;
    uniforms.manualdof.value = manualdof;
    uniforms.vignetting.value = vignetting;
    uniforms.depthblur.value = depthblur;
    uniforms.threshold.value = threshold;
    uniforms.gain.value = gain;
    uniforms.bias.value = bias;
    uniforms.fringe.value = fringe;
    uniforms.znear.value = znear;
    uniforms.zfar.value = zfar;
    uniforms.noise.value = noise;
    uniforms.dithering.value = dithering;
    uniforms.pentagon.value = pentagon;
    uniforms.shaderFocus.value = shaderFocus;
    uniforms.focusCoords.value = focusCoords;

    this.materialBokeh = new ShaderMaterial({
      defines: Object.assign({}, shader.defines),
      uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
    });
    this.uniforms = uniforms;
    this.needsSwap = true;
    this.fsQuad = new FullScreenQuad(this.materialBokeh);
    this._oldClearColor = new Color();
  }

  setSize(width: number, height: number) {
    this.uniforms.textureWidth.value = width;
    this.uniforms.textureHeight.value = height;
  }

  render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget) {
    this.scene.traverse((child: any) => {
      if (child.type === 'Mesh') {
        if (child.customDepthMaterial !== undefined) {
          child._material = child.material;
          child.material = child.customDepthMaterial;
        } else {
          child._material = child.material;
          child.material = this.materialDepth;
        }
      }
    });

    renderer.getClearColor(this._oldClearColor);
    const oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(0);
    renderer.setClearAlpha(1);
    renderer.setRenderTarget(this.renderTargetDepth);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.uniforms.tColor.value = readBuffer.texture;
    this.uniforms.znear.value = this.camera.near;
    this.uniforms.zfar.value = this.camera.far;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      renderer.clear();
      this.fsQuad.render(renderer);
    }

    this.scene.traverse((child: any) => {
      if (child.type === 'Mesh') {
        child.material = child._material;
        child._material = null;
      }
    });

    renderer.setClearColor(this._oldClearColor);
    renderer.setClearAlpha(oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }
}

// Verbatim from theme.pretty.js gn (L5571–5618)
export class PostProcessing {
  _scene: Scene;
  _camera: PerspectiveCamera;
  _scene2: Scene;
  _camera2: PerspectiveCamera;
  _renderer: WebGLRenderer;
  _renderScene: RenderPass;
  _renderScene2: RenderPass;
  _bloomPass: UnrealBloomPass;
  _bokehApertureF: number;
  _bokehPass: BokehPass;
  _vignettePass: ShaderPass;
  _composer: EffectComposer;

  constructor({
    scene,
    camera,
    scene2,
    camera2,
    renderer,
  }: {
    scene: Scene;
    camera: PerspectiveCamera;
    scene2: Scene;
    camera2: PerspectiveCamera;
    renderer: WebGLRenderer;
    texture?: any;
  }) {
    this._scene = scene;
    this._camera = camera;
    this._scene2 = scene2;
    this._camera2 = camera2;
    this._renderer = renderer;
    this._renderScene = new RenderPass(scene, camera);
    this._renderScene2 = new RenderPass(scene2, camera2);
    this._renderScene2.clear = false;
    this._renderScene2.clearDepth = true;
    this._bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    this._bloomPass.threshold = Number(0.159);
    this._bloomPass.strength = Number(0.4);
    this._bloomPass.radius = Number(1);
    this._bokehApertureF = 0.00001;
    this._bokehPass = new BokehPass(scene, camera, {
      focalDepth: 0.125,
      focalLength: 27,
      fstop: 2509,
      maxblur: 10,
      gain: 0,
      bias: 0,
      rings: 4,
      samples: 6,
      znear: camera.near,
      zfar: camera.far,
      width: store.window.w,
      height: store.window.h,
    });
    this._vignettePass = new ShaderPass(VignetteShader);
    this._vignettePass.uniforms.offset.value = 0.3;
    this._vignettePass.uniforms.darkness.value = 4;
    this._renderer.toneMappingExposure = Math.pow(1, 5);
    this._composer = new EffectComposer(renderer);
    this._composer.addPass(this._renderScene);
    this._composer.addPass(this._renderScene2);
    this._composer.addPass(this._bloomPass);
    if (store.isDesktop) this._composer.addPass(this._bokehPass);
    this._composer.addPass(this._vignettePass);
  }

  resize(width: number, height: number) {
    this._composer.setSize(width, height);
  }

  update({ delta }: { delta?: number | null } = {}) {
    this._renderScene2.clear = false;
    this._renderScene2.clearDepth = true;
    this._composer.render(delta as any);
  }
}

// Verbatim from theme.pretty.js bn (L5729–5912)
export class WebGLController {
  dom: { canvas: HTMLCanvasElement };
  textureLoader: TextureLoader;
  cubeTextureLoader: CubeTextureLoader;
  _m = { x: 0, y: 0 };
  renderer!: WebGLRenderer;
  camera!: PerspectiveCamera;
  scene!: Scene;
  particleCamera!: PerspectiveCamera;
  particleScene!: Scene;
  materialDepth!: MeshDepthMaterial;
  _fboMain!: SingleFBO;
  _composer!: PostProcessing;
  globalUniforms!: { uTime: { value: number }; uResolution: { value: Vector2 } };
  _fbo!: SingleFBO;
  _layer!: GrainLayer;
  _cones!: Cones;
  _frontCones!: FrontCones;
  _bigTriangle!: BigTriangle;
  assets: { models: Record<string, any>; textures: Record<string, any>; cubeTextures: Record<string, any> } = {
    models: {},
    textures: {},
    cubeTextures: {},
  };

  constructor() {
    this.dom = { canvas: document.getElementById('canvas') as HTMLCanvasElement };
    this.textureLoader = new TextureLoader();
    this.cubeTextureLoader = new CubeTextureLoader();
    this.setup();
    this.loadGlobalAssets();
    this.addEvents();
    this.particleSceneTest();
  }

  onResize = () => {
    this.resize();
  };

  onRaf = (time: number) => {
    this.globalUniforms.uTime.value = time;
    this._updateCamera();
    this._layer.update(time);
    this._cones.update(time);
    this._frontCones.update(time);
    this._composer.update({ delta: GlobalEvents.deltaTime });
  };

  setup() {
    const pixelRatio = store.isMobile ? 2 : 1;
    this.renderer = new WebGLRenderer({
      alpha: false,
      antialias: false,
      canvas: this.dom.canvas,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(store.window.w, store.window.h);

    const fov = (2 * Math.atan(store.window.h / 2 / 2000) * 180) / Math.PI;
    this.camera = new PerspectiveCamera(fov, store.window.w / store.window.h, 1, 10000);
    this.camera.position.set(0, 0, 2000);
    this.camera.aspect = store.window.w / store.window.h;
    this.camera.updateProjectionMatrix();
    this.scene = new Scene();

    this.particleCamera = new PerspectiveCamera(50, store.window.w / store.window.h, 0.1, 30);
    this.particleCamera.position.set(0, 0, 10);
    this.particleCamera.aspect = store.window.w / store.window.h;
    this.particleCamera.setFocalLength(35);
    this.particleCamera.updateProjectionMatrix();
    this.particleScene = new Scene();

    this.materialDepth = new MeshDepthMaterial();
    this.materialDepth.depthPacking = RGBADepthPacking;
    this.materialDepth.blending = NoBlending;

    store.AssetLoader.ktxLoader.detectSupport(this.renderer);
    this._fboMain = new SingleFBO({ width: window.innerWidth, height: window.innerHeight });
    this._composer = new PostProcessing({
      scene: this.particleScene,
      camera: this.particleCamera,
      scene2: this.scene,
      camera2: this.camera,
      renderer: this.renderer,
      texture: this._fboMain.texture,
    });
    this.globalUniforms = {
      uTime: { value: 0 },
      uResolution: {
        value: new Vector2(
          store.window.w * this.renderer.getPixelRatio(),
          store.window.h * this.renderer.getPixelRatio()
        ),
      },
    };
  }

  particleSceneTest() {
    this._fbo = new SingleFBO({
      width: 200,
      height: 200,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      depthBuffer: false,
    });
    this._layer = new GrainLayer({ texture: this._fboMain.texture });
    this._layer.position.set(0, 0, 9.6);
    this.particleScene.add(this._layer);

    this._cones = new Cones();
    this.particleScene.add(this._cones);

    this._frontCones = new FrontCones();
    this._frontCones.position.set(0, 0, 0.1);
    this.particleScene.add(this._frontCones);

    this.resize();
  }

  loadGlobalAssets() {
    this.assets = { models: {}, textures: {}, cubeTextures: {} };
    const manifest = getAssetsManifest();
    const total = manifest.textures.length + manifest.models.length;
    let loadedCount = 0;

    for (let i = 0; i < manifest.textures.length; i++) {
      const item = manifest.textures[i];
      const ext = item.url.split('.').pop();
      store.AssetLoader.add(
        new Promise<void>((resolve) => {
          if (ext === 'png' || ext === 'jpg') {
            this.textureLoader.load(item.url, (tex) => {
              this.renderer.initTexture(tex);
              this.assets.textures[item.id] = tex;
              loadedCount++;
              if (loadedCount === total) this.onAssetsLoaded();
              resolve();
            });
          } else if (ext === 'exr') {
            store.AssetLoader.exrLoader.load(item.url, (tex) => {
              this.renderer.initTexture(tex);
              this.assets.textures[item.id] = tex;
              loadedCount++;
              if (loadedCount === total) this.onAssetsLoaded();
              resolve();
            });
          }
        })
      );
    }

    for (let i = 0; i < manifest.models.length; i++) {
      const item = manifest.models[i];
      store.AssetLoader.add(
        new Promise<void>((resolve) => {
          store.AssetLoader.gltfLoader.load(item.url, (gltf) => {
            this.assets.models[item.id] = gltf;
            loadedCount++;
            if (loadedCount === total) this.onAssetsLoaded();
            resolve();
          });
        })
      );
    }
  }

  addEvents() {
    EventBus.on(GlobalEvents.RESIZE, this.onResize);
    EventBus.on(GlobalEvents.POINTERDOWN, this.onMousedown.bind(this));
    EventBus.on(GlobalEvents.POINTERMOVE, this.onMousemove.bind(this));
    store.RAFCollection.add(this.onRaf, 99);
  }

  resize() {
    const w = store.window.w;
    const h = store.window.h;
    this.renderer.setSize(w, h);
    this.camera.fov = (2 * Math.atan(store.window.h / 2 / this.camera.position.z) * 180) / Math.PI;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.particleCamera.fov = 50;
    this.particleCamera.aspect = w / h;
    this.particleCamera.updateProjectionMatrix();
    this.globalUniforms.uResolution.value.set(
      store.window.w * this.renderer.getPixelRatio(),
      store.window.h * this.renderer.getPixelRatio()
    );
    this._layer.resize();
    this._cones.resize({ camera: this.particleCamera });
    this._composer.resize(w, h);
    this._frontCones.resize({ camera: this.particleCamera });
  }

  onMousedown(e: any) {
    const pt = e.changedTouches ? e.targetTouches[0] : e;
    if (pt !== undefined && pt.clientX !== undefined) {
      this._m.x = 2 * (pt.clientX / window.innerWidth - 0.5);
      this._m.y = -2 * (pt.clientY / window.innerHeight - 0.5);
      this._cones.onMousedown(this._m);
    }
  }

  onMousemove(e: any) {
    const pt = e.changedTouches ? e.targetTouches[0] : e;
    if (pt !== undefined && pt.clientX !== undefined) {
      this._m.x = 2 * (pt.clientX / window.innerWidth - 0.5);
      this._m.y = -2 * (pt.clientY / window.innerHeight - 0.5);
      this._cones.onMousemove(this._m);
      this._frontCones.onMousemove(this._m);
    }
  }

  onMouseleave() {
    this._cones.onMouseleave();
  }

  onAssetsLoaded() {
    store.WebGL.assets.textures.cone_position_exr.minFilter =
      store.WebGL.assets.textures.cone_position_exr.magFilter = NearestFilter;
    store.WebGL.assets.textures.cone_position_exr.flipY = true;
    store.WebGL.assets.textures.cone_position_exr.needsUpdate = true;
    this._bigTriangle = new BigTriangle({
      texture: store.WebGL.assets.textures.cone_position_exr,
      scene: true,
    });
    this.renderer.setRenderTarget(this._fbo.renderTarget);
    this.renderer.render(this._bigTriangle.scene, this._bigTriangle.camera);
    this._cones.onAssetsLoaded({ renderTarget: this._fbo.renderTarget });
    this._frontCones.onAssetsLoaded();
    this._layer.onAssetsLoaded();
    this.resize();
  }

  onEnterSite() {
    this._layer.hide({ delay: 0 });
    this._cones.activate({ delay: 0 });
  }

  _updateCamera() {
    const rx = -0.075 * this._m.x;
    const ry = 0.05 * this._m.y;
    this.particleCamera.rotation.y += 0.1 * (rx - this.particleCamera.rotation.y);
    this.particleCamera.rotation.x += 0.1 * (ry - this.particleCamera.rotation.x);
  }
}
