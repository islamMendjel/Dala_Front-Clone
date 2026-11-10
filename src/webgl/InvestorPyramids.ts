import {
  Box3,
  Color,
  EdgesGeometry,
  Group,
  LinearFilter,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Texture,
  Vector2,
  Vector3,
  VideoTexture,
} from 'three';
import gsap, { Elastic } from 'gsap';
import { store, EventBus, attr, qs } from '../ui/SmoothScroll';
import { clamp, mapRange } from './ParticleSystem';

import searchBarVert from './shaders/searchBar.vert.glsl?raw';
import searchBarFrag from './shaders/searchBar.frag.glsl?raw';
import dom2webglQuadVert from './shaders/dom2webgl.vert.glsl?raw';
import dom2webglQuadFrag from './shaders/dom2webgl.frag.glsl?raw';

export function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Verbatim from theme.pretty.js ze (L3385–3429)
export class ResourceTracker {
  resources = new Set<any>();

  track = (res: any): any => {
    if (!res || this.resources.has(res)) return res;
    if (Array.isArray(res)) {
      res.forEach((r) => this.track(r));
      return res;
    }
    if (res.dispose || res instanceof Object3D) {
      this.resources.add(res);
    }
    if (res instanceof Object3D) {
      this.track((res as any).geometry);
      this.track((res as any).material);
      this.track(res.children);
    } else if (res instanceof Material) {
      for (const val of Object.values(res)) {
        if (val instanceof Texture) this.track(val);
      }
      if ((res as any).uniforms) {
        for (const u of Object.values((res as any).uniforms) as any[]) {
          if (u) {
            const val = u.value;
            if (val instanceof Texture || Array.isArray(val)) this.track(val);
          }
        }
      }
    }
    return res;
  };

  untrack(res: any): any {
    if (!res || !this.resources.has(res)) return res;
    if (Array.isArray(res)) {
      res.forEach((r) => this.untrack(r));
      return res;
    }
    this.resources.delete(res);
    if (res instanceof Object3D) {
      this.untrack((res as any).geometry);
      this.untrack((res as any).material);
      this.untrack(res.children);
    } else if (res instanceof Material) {
      for (const val of Object.values(res)) {
        if (val instanceof Texture) this.untrack(val);
      }
      if ((res as any).uniforms) {
        for (const u of Object.values((res as any).uniforms) as any[]) {
          if (u) {
            const val = u.value;
            if (val instanceof Texture || Array.isArray(val)) this.untrack(val);
          }
        }
      }
    }
  }

  dispose() {
    for (const res of this.resources) {
      if (res instanceof Object3D && res.parent) {
        res.parent.remove(res);
      }
      if (res.dispose) res.dispose();
    }
    this.resources.clear();
  }
}

// Verbatim from theme.pretty.js $e (L3498–3576)
export class Dom2WebglItem extends Group {
  options: any;
  item: any;
  domEl: any;
  assetType: string | null;
  pbbox: Box3;
  bbox: Box3;
  pixelScale: Vector2;
  offsetPosition: Vector3;
  originalPosition: Vector3;
  originalRotation: Vector3;
  animateProps: any;
  widthPx = 0;
  heightPx = 0;

  constructor(opts: any) {
    super();
    this.options = Object.assign({ name: '', domEl: null, targetScene: null, assetType: null }, opts);
    if (this.options.item) {
      this.item = this.options.item;
      this.add(this.item);
    }
    this.name = this.options.name;
    this.domEl = this.options.domEl;
    this.domEl._webGLItem = this;
    this.assetType = this.options.assetType;
    this.pbbox = new Box3();
    this.bbox = new Box3();
    this.pixelScale = new Vector2();
    this.offsetPosition = new Vector3();
    this.originalPosition = new Vector3();
    this.originalRotation = new Vector3();
    this.visible = false;
    this.animateProps = false;
  }

  calcPixelScale() {
    this.bbox.setFromObject(this.item);
    this.pixelScale.set(-this.bbox.min.x + this.bbox.max.x, -this.bbox.min.y + this.bbox.max.y);
  }

  syncDomSize() {
    this.widthPx = this.domEl.clientWidth;
    this.heightPx = this.domEl.clientHeight;
    this.item.scale.set(this.widthPx, this.heightPx, 1);
    if (this.assetType === 'image') {
      if (this.item.material.uniforms.u_size) {
        this.item.material.uniforms.u_size.value = [this.widthPx, this.heightPx];
      }
      if (this.item.material.uniforms.u_imageSize) {
        this.item.material.uniforms.u_imageSize.value = [this.domEl.naturalWidth, this.domEl.naturalHeight];
      }
    }
  }

  build() {
    if (this.assetType === 'image') {
      this.item.material.uniforms.u_texture.value.needsUpdate = true;
      store.WebGL.renderer.initTexture(this.item.material.uniforms.u_texture.value);
    }
  }

  mapAnimateProps() {
    if (this.domEl._glProps) {
      this.animateProps = Object.assign({}, this.domEl._glProps);
      for (const key in this.animateProps) {
        this.animateProps[key] = {};
        if (key === 'uniforms') {
          for (const uKey in this.domEl._glProps.uniforms) {
            this.animateProps[key][uKey] = {
              target: this.item.material.uniforms[uKey],
              property: 'value',
            };
          }
        } else {
          const parts = key.split('.');
          this.animateProps[key].target = parts.length > 1 ? this.item[parts[0]] : this.item;
          this.animateProps[key].property = parts[1] || parts[0];
        }
      }
    }
  }

  animate(scrollPos: number, _time: number) {
    const axis = store.Dom2Webgl.axis as 'x' | 'y';
    this.position[axis] = store.Dom2Webgl.operations[store.Dom2Webgl.operator](this.originalPosition[axis], scrollPos);
    if (this.animateProps) {
      for (const key in this.animateProps) {
        if (key !== 'uniforms') {
          if (key === 'position.' + axis) {
            this.position[axis] = store.Dom2Webgl.operations[store.Dom2Webgl.operator](
              this.originalPosition[axis],
              scrollPos,
              this.domEl._glProps[key]
            );
          } else {
            this.animateProps[key].target[this.animateProps[key].property] = this.domEl._glProps[key];
          }
        } else {
          for (const uKey in this.animateProps[key]) {
            this.animateProps[key][uKey].target[this.animateProps[key][uKey].property] =
              this.domEl._glProps[key][uKey];
          }
        }
      }
    }
  }

  onAfterPositionSync() {}
  enter() {}
  leave() {}
  dispose() {}
  destroy() {
    this.domEl._webGLItem = null;
  }
}

const sineIn = (t: number) => -1 * Math.cos(t * (Math.PI / 2)) + 1;
const sineInOut = (t: number) => -0.5 * (Math.cos(Math.PI * t) - 1);

// Verbatim from theme.pretty.js st.Pyramid (L3590–3685)
export class InvestorPyramid extends Dom2WebglItem {
  color: string;
  assets = { textures: {} };
  dom: { text: HTMLElement };
  speed: number;
  parallax = 200;
  entered = false;
  enterComplete = false;
  randFlipA = 1;
  randFlipB = 1;
  material!: MeshBasicMaterial;
  animPos!: { x: number; y: number; z: number; scalar: number };
  rotationSpeed!: { x: number; y: number; z: number };
  textTl: any;

  constructor(opts: any) {
    super(opts);
    this.options = opts;
    this.color = attr(this.domEl, 'material-color');
    this.dom = { text: this.domEl.nextElementSibling as HTMLElement };
    this.speed = parseInt(attr(this.domEl, 'parallax-speed'));
  }

  enter = () => {
    if (this.entered) return;
    this.entered = true;
    const dur = randFloat(2, 2.5);
    gsap
      .timeline({
        onComplete: () => {
          this.enterComplete = true;
        },
      })
      .to(this.animPos, {
        x: 0,
        y: 0,
        z: 0,
        scalar: 0,
        duration: dur,
        delay: 0.2,
        ease: Elastic.easeOut.config(0.8, 1.2),
      })
      .call(
        () => {
          this.textTl.play();
        },
        undefined,
        0.8 * dur
      );
  };

  build() {
    const flips = [-1, 1];
    this.randFlipA = flips[randInt(0, 1)];
    this.randFlipB = flips[randInt(0, 1)];
    this.material = new MeshBasicMaterial({ color: Number(this.color) });
    this.item = store.WebGL.assets.models.piramed_thinner.scene.children[0].clone();
    this.item.material = this.material;
    this.item.rotation.set(
      randFloat(degToRad(0), degToRad(45)),
      randFloat(degToRad(0), degToRad(45)),
      randFloat(degToRad(0), degToRad(45))
    );
    this.animPos = { x: Number(attr(this.domEl, 'start-x')), y: 3000, z: -10000, scalar: 1 };
    this.rotationSpeed = {
      x: randFloat(0.0005, 0.0015),
      y: randFloat(0.0005, 0.0015),
      z: randFloat(0.0005, 0.0015),
    };
    this.textTl = (gsap.timeline({ immediateRender: true, paused: true }) as any).splitTextRotateIn(
      this.dom.text,
      { duration: 1, children: 'div' },
      0
    );
    this.add(this.item);
  }

  syncDomSize() {
    super.syncDomSize();
    this.item.scale.setScalar(Math.min(this.widthPx / this.pixelScale.x, this.heightPx / this.pixelScale.y));
  }

  animate(scrollPos: number, time: number) {
    super.animate(scrollPos, time);
    const n = mapRange(clamp(store.sectionProgress, 5.2, 6.5), 5.2, 6.5, 0, 1);
    const i = -this.speed * this.parallax * n;
    if (this.item) {
      this.item.rotation.x += this.rotationSpeed.x + 0.04 * this.animPos.scalar;
      this.item.rotation.y += this.rotationSpeed.y + 0.04 * this.animPos.scalar;
      this.item.rotation.z += this.rotationSpeed.z + 0.04 * this.animPos.scalar;
      if (this.enterComplete) {
        this.item.position.y = i;
        this.dom.text.style.transform = `translateY(${this.speed * this.parallax * n}px)`;
      } else {
        this.item.position.x =
          Number(this.animPos.x) +
          1200 * Math.cos(-1 * (this.animPos.scalar - 1) * 2 * this.animPos.scalar + 1000) * this.animPos.scalar;
        this.item.position.y =
          i +
          this.animPos.y +
          1000 * Math.sin(-1 * (this.animPos.scalar - 1) * 2 * this.animPos.scalar + 1000) * this.animPos.scalar;
        this.item.position.z = this.animPos.z;
        this.dom.text.style.transform = `translateY(${this.speed * this.parallax * n}px)`;
      }
    }
  }
}

// Verbatim from theme.pretty.js st.SearchBar (L3686–3824)
export class SearchBar extends Dom2WebglItem {
  dom: {
    startBar: HTMLElement | null;
    endBar: HTMLElement | null;
    section: HTMLElement | null;
    startHead: HTMLElement | null;
    endHead: HTMLElement | null;
    endCta: HTMLElement | null;
  };
  startMin = 4.9;
  startMax = 5.2;
  endMin = 9.6;
  endMax = 10;
  isFullScreenSize = false;
  assets = { textures: {} };
  edges!: EdgesGeometry;
  outline!: LineSegments;
  screenToHeightRatio = 1;
  scaleBase = 1;
  maxScreenScalar = 1;
  sectionHeight = 0;
  startBarTop = 0;
  endBarTop = 0;
  endBarScrollOffset = 0;

  constructor(opts: any) {
    super(opts);
    this.options = opts;
    this.dom = {
      startBar: qs('.js-search-bar-start'),
      endBar: qs('.js-search-bar-end'),
      section: qs('.js-search-bar-section'),
      startHead: qs('.js-search-bar-start-head'),
      endHead: qs('.js-search-bar-end-head'),
      endCta: qs('.js-search-bar-end-cta'),
    };
  }

  build() {
    this.widthPx = this.domEl.clientWidth;
    this.heightPx = this.domEl.clientHeight;
    this.item = new Mesh(
      this.roundedRect((-this.widthPx / this.heightPx) * 0.5, -0.5, this.widthPx / this.heightPx, 1, 0.2),
      new ShaderMaterial({
        uniforms: {
          uResolution: { value: new Vector2(store.window.w * store.window.dpr, store.window.h * store.window.dpr) },
          uBlurScale: { value: 0.7 },
          uNoiseScale: { value: 0.001 },
          uTime: { value: 0 },
          uPosA: { value: { x: -0.5, y: -0.5 } },
          uColorA: { value: new Color(272673) },
          uScaleA: { value: 0.5 },
          uPosB: { value: { x: 0.5, y: 0.5 } },
          uColorB: { value: new Color(1313075) },
          uScaleB: { value: 0.5 },
          uNoiseTexture: { value: store.WebGL.assets.textures.noise },
          uAlpha: { value: 0 },
          uCoordScale: { value: 1 },
        },
        vertexShader: searchBarVert,
        fragmentShader: searchBarFrag,
      })
    );
    this.edges = new EdgesGeometry(this.item.geometry);
    this.outline = new LineSegments(this.edges, new LineBasicMaterial({ color: 16777215 }));
    this.item.add(this.outline);
    this.add(this.item);
    if (this.dom.endHead) {
      this.dom.endHead.style.transform = `translateY(-${store.window.h}%)`;
      this.dom.endHead.style.opacity = '0';
    }
    if (this.dom.endCta) {
      this.dom.endCta.style.transform = `translateY(${store.window.h}%)`;
      this.dom.endCta.style.opacity = '0';
    }
  }

  syncDomSize() {
    this.widthPx = this.domEl.clientWidth;
    this.heightPx = this.domEl.clientHeight;
    this.screenToHeightRatio = (store.window.h / this.heightPx) * 1.1;
    this.scaleBase = this.heightPx / this.pixelScale.y;
    this.maxScreenScalar = this.scaleBase * (this.screenToHeightRatio + 1);
    this.item.scale.set(this.heightPx / this.pixelScale.y, this.heightPx / this.pixelScale.y, 1);
    if (this.dom.section) this.sectionHeight = this.dom.section.getBoundingClientRect().height;
    if (this.dom.startBar) this.startBarTop = this.dom.startBar.getBoundingClientRect().top - store.ASS.currentPos;
    if (this.dom.endBar) this.endBarTop = this.dom.endBar.getBoundingClientRect().top - store.ASS.currentPos;
    this.endBarScrollOffset = this.startBarTop - this.endBarTop;
  }

  roundedRect(x: number, y: number, w: number, h: number, r: number) {
    const shape = new Shape();
    shape.moveTo(x, y + r);
    shape.lineTo(x, y + h - r);
    shape.quadraticCurveTo(x, y + h, x + r, y + h);
    shape.lineTo(x + w - r, y + h);
    shape.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    shape.lineTo(x + w, y + r);
    shape.quadraticCurveTo(x + w, y, x + w - r, y);
    shape.lineTo(x + r, y);
    shape.quadraticCurveTo(x, y, x, y + r);
    return new ShapeGeometry(shape);
  }

  round(val: number) {
    return Number(Math.round((val + 'e4') as any) + 'e-4');
  }

  animate(scrollPos: number, time: number) {
    if (!this.item) return;
    this.item.material.uniforms.uTime.value = time;
    const n = store.sectionProgress >= this.startMin;
    const i = store.sectionProgress >= this.endMax;
    const r = this.round(
      sineIn(mapRange(clamp(store.sectionProgress, this.startMin, this.startMax), this.startMin, this.startMax, 0, 1))
    );
    if (r < 1) {
      this.isFullScreenSize = false;
      this.item.material.uniforms.uCoordScale.value = r * (this.heightPx / store.window.w + 1);
      this.item.material.uniforms.uAlpha.value = clamp(r, 0, 1);
      const scaleMult = this.screenToHeightRatio * r + 1;
      const sVal = this.scaleBase * scaleMult;
      this.item.scale.set(sVal, sVal, 1);
      const opacity = mapRange(1 - r, 0.1, 1, 0, 1);
      const offset = this.sectionHeight * (0.5 * (this.startMax - this.startMin)) * r;
      if (this.dom.startHead) {
        this.dom.startHead.style.transform = `translateY(-${offset}%) scale(${scaleMult})`;
        this.dom.startHead.style.opacity = String(opacity);
      }
      super.animate(scrollPos + offset, time);
      return;
    }
    const o = this.round(
      sineInOut(mapRange(clamp(store.sectionProgress, this.endMin, this.endMax), this.endMin, this.endMax, 1, 0))
    );
    if (o < 1) {
      this.isFullScreenSize = false;
      this.item.material.uniforms.uCoordScale.value = o * (this.heightPx / store.window.w + 1);
      this.item.material.uniforms.uAlpha.value = clamp(o, 0, 1);
      const scaleMult = this.screenToHeightRatio * o + 1;
      const sVal = this.scaleBase * scaleMult;
      this.item.scale.set(sVal, sVal, 1);
      const opacity = mapRange(1 - o, 0.5, 1, 0, 1);
      const offset = -0.5 * this.sectionHeight * o;
      if (this.dom.endHead) {
        this.dom.endHead.style.transform = `translateY(${offset}%) scale(${scaleMult})`;
        this.dom.endHead.style.opacity = `${opacity}`;
        (this.dom.endHead.style as any).backdropFilter = `blur(${20 * o}px)`;
      }
      if (this.dom.endCta) {
        this.dom.endCta.style.transform = `translateY(${offset}%) scale(${scaleMult})`;
        this.dom.endCta.style.opacity = `${opacity}`;
        (this.dom.endCta.style as any).backdropFilter = `blur(${20 * o}px)`;
      }
      super.animate(scrollPos - this.endBarScrollOffset + offset, time);
      return;
    }
    if (n && !i && !this.isFullScreenSize) {
      this.item.scale.set(this.maxScreenScalar, this.maxScreenScalar, 1);
      this.isFullScreenSize = true;
    }
  }
}

const quadPlane = new PlaneGeometry();
const quadMaterial = new ShaderMaterial({
  uniforms: { u_texture: { value: null } },
  vertexShader: dom2webglQuadVert,
  fragmentShader: dom2webglQuadFrag,
});

// Verbatim from theme.pretty.js ht (L3843–3972)
export class Dom2Webgl {
  selector = 'dom2webgl';
  resourceTracker = new ResourceTracker();
  components: Record<string, any> = {
    Pyramid: InvestorPyramid,
    SearchBar: SearchBar,
  };
  currentPos = 0;
  firstObservation = true;
  els: HTMLElement[] = [];
  visibleEls: any[] = [];
  webGLItems: Record<string, Dom2WebglItem> = {};
  componentIds: Record<string, number> = {};
  operator = '-';
  axis = 'y';
  operations: Record<string, (a: number, b: number, c?: number) => number> = {
    '+': (a, b, c) => a + b + (c || 0),
    '-': (a, b, c) => a - b - (c || 0),
  };

  constructor() {
    this.updateAxis();
    EventBus.on('global:resize', this.onResize);
    EventBus.on('dom2webgl', this.onElIntersect);
    EventBus.on('firstObservation', this.onFirstObservation);
    store.RAFCollection.add(this.onRaf, 3);
  }

  onRaf = (time: number) => {
    this.currentPos = -store.ASS.currentPos;
    this.animateDomEls(time);
  };

  onElIntersect = (entry: any) => {
    if (!this.firstObservation && entry.updateSize) {
      entry.updateSize = false;
      this.updateDom2Webgl(entry);
    }
  };

  onFirstObservation = (entries: any[]) => {
    if (this.firstObservation) {
      this.firstObservation = false;
      for (let i = 0; i < entries.length; i++) {
        this.webGLItems[entries[i].params.webglEl].mapAnimateProps();
        this.webGLItems[entries[i].params.webglEl].visible = true;
        this.updateDom2Webgl(entries[i]);
        entries[i].updateSize = false;
      }
    }
  };

  onResize = () => {
    for (let i = 0; i < store.Dom2WebglObserver.els.length; i++) {
      store.Dom2WebglObserver.unobserve(store.Dom2WebglObserver.els[i].el);
      this.webGLItems[store.Dom2WebglObserver.els[i].params.webglEl].syncDomSize();
      store.Dom2WebglObserver.observe(store.Dom2WebglObserver.els[i].el);
    }
    this.firstObservation = true;
    store.Dom2WebglObserver.firstObservationFired = true;
    this.updateAxis();
  };

  build() {
    this.els = [];
    const nodes = document.querySelectorAll<HTMLElement>(`[${this.selector}]`);
    this.visibleEls = store.Dom2WebglObserver.visibleEls;
    this.webGLItems = {};
    this.componentIds = {};
    this.firstObservation = true;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) continue;
      let id: string;
      const attrVal = el.attributes.getNamedItem(this.selector)!.value;
      const obsItem: any = { el, updateSize: true, params: {} };
      if (el instanceof HTMLImageElement || el instanceof HTMLVideoElement) {
        id = this.addImage(el);
      } else {
        if (!attrVal.includes('c:')) continue;
        const compName = attrVal.substring(2);
        if (!this.components[compName]) continue;
        id = this.addComponent(compName, attrVal, obsItem);
      }
      obsItem.params.webglEl = id;
      this.els.push(el);
      if (this.webGLItems[id].enter) obsItem.enter = this.webGLItems[id].enter;
      if (this.webGLItems[id].leave) obsItem.leave = this.webGLItems[id].leave;
      store.Dom2WebglObserver.els.push(obsItem);
    }
  }

  addComponent(compName: string, attrVal: string, obsItem: any) {
    const id = attrVal + this.componentIdGen(compName);
    this.webGLItems[id] = new this.components[compName]({
      name: id,
      domEl: obsItem.el,
      assetType: 'component',
      elObj: obsItem,
    });
    this.resourceTracker.track(this.webGLItems[id]);
    return id;
  }

  componentIdGen(compName: string) {
    if (!this.componentIds[compName]) this.componentIds[compName] = 0;
    return this.componentIds[compName]++;
  }

  addImage(el: HTMLImageElement | HTMLVideoElement) {
    const id = el.getAttribute('dom2webgl')!;
    const tex = el instanceof HTMLVideoElement ? new VideoTexture(el) : new Texture(el);
    tex.generateMipmaps = false;
    tex.minFilter = tex.magFilter = LinearFilter;
    const mat = quadMaterial.clone();
    mat.uniforms.u_texture.value = tex;
    const mesh = new Mesh(quadPlane, mat);
    this.webGLItems[id] = new Dom2WebglItem({
      item: mesh,
      name: id,
      domEl: el,
      assetType: 'image',
    });
    this.resourceTracker.track(this.webGLItems[id]);
    return id;
  }

  enable() {
    for (const id in this.webGLItems) {
      store.Dom2WebglObserver.observe(this.webGLItems[id].domEl);
      if (this.webGLItems[id].build) this.webGLItems[id].build();
      this.webGLItems[id].calcPixelScale();
      this.webGLItems[id].syncDomSize();
      if (this.webGLItems[id].options.scene) {
        this.webGLItems[id].options.scene.add(this.webGLItems[id]);
        this.webGLItems[id].frustumCulled = false;
      } else {
        store.WebGL.scene.add(this.webGLItems[id]);
      }
    }
  }

  animateDomEls(time: number) {
    for (const id in this.webGLItems) {
      this.webGLItems[id].animate(this.currentPos, time);
    }
  }

  updateDom2Webgl(entry: any) {
    const gx = entry.el._glProps && entry.el._glProps['position.x'] ? parseFloat(entry.el._glProps['position.x']) : 0;
    const gy = entry.el._glProps && entry.el._glProps['position.y'] ? parseFloat(entry.el._glProps['position.y']) : 0;
    const x =
      -store.window.w / 2 +
      (entry.bcr.x + entry.bcr.width / 2) -
      gx -
      (store.ASS.isHorizontal ? this.currentPos : 0) +
      this.webGLItems[entry.params.webglEl].offsetPosition.x;
    const y =
      store.window.h / 2 -
      entry.bcr.y -
      entry.bcr.height / 2 +
      gy +
      (store.ASS.isHorizontal ? 0 : this.currentPos) +
      this.webGLItems[entry.params.webglEl].offsetPosition.y;
    this.webGLItems[entry.params.webglEl].position.x = x;
    this.webGLItems[entry.params.webglEl].position.y = y;
    this.webGLItems[entry.params.webglEl].originalPosition.copy(
      this.webGLItems[entry.params.webglEl].position.clone()
    );
    this.webGLItems[entry.params.webglEl].onAfterPositionSync();
  }

  updateAxis() {
    [this.operator, this.axis] = store.isHorizontalScroll ? ['+', 'x'] : ['-', 'y'];
    this.operations = {
      '+': (a, b, c) => a + b + (c || 0),
      '-': (a, b, c) => a - b - (c || 0),
    };
  }

  reset() {
    this.resourceTracker.dispose();
    for (const id in this.webGLItems) {
      this.webGLItems[id].destroy();
    }
  }
}
