import { Vector2 } from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ua = window.navigator.userAgent;
const isIpad = Boolean(ua.match(/(iPad)/) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const isMobileUA = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);

export const store: any = {
  html: document.documentElement,
  body: document.body,
  window: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
  mq: {
    smMax: window.matchMedia('(max-width: 767px)'),
    xs: window.matchMedia('(min-width: 415px)'),
    sm: window.matchMedia('(min-width: 768px)'),
    md: window.matchMedia('(min-width: 1024px)'),
    lg: window.matchMedia('(min-width: 1366px)'),
    xlg: window.matchMedia('(min-width: 1921px)'),
    '4k': window.matchMedia('(min-width: 3840px)'),
  },
  pointer: { default: new Vector2(), gl: new Vector2(), glNormalized: new Vector2(), isDragging: false },
  components: {},
  keys: { UP: 38, DOWN: 40, ENTER: 13, ESC: 27, HOME: 36, END: 35 },
  cookieNoticeAccepted: false,
  sectionName: 'home',
  sectionIndex: 0,
  sectionProgress: 0,
  isTablet: isIpad,
  isMobile: isMobileUA && !isIpad,
  isDesktop: !isMobileUA && !isIpad,
  isTouch: false,
  ASS: null,
  AssetLoader: null,
  WebGL: null,
  Dom2Webgl: null,
  Dom2WebglObserver: null,
  sectionObserver: null,
  sectionManager: null,
  ScrollAnimations: null,
  SiteLoader: null,
  RAFCollection: null,
  enableLogs: new URLSearchParams(window.location.search).has('logs'),
};

export function qs<T extends Element = HTMLElement>(selector: string, scope: ParentNode = document): T | null {
  return scope.querySelector(selector) as T | null;
}

export function qsa<T extends Element = HTMLElement>(selector: string, scope: ParentNode = document): T[] {
  return Array.prototype.slice.call(scope.querySelectorAll(selector));
}

function updateClassList(el: Element, cls: any) {
  if (Array.isArray(cls)) {
    el.classList.add(...cls);
  } else if (typeof cls !== 'string') {
    if (cls.add) updateClassList(el, cls.add);
    if (cls.remove) {
      if (Array.isArray(cls.remove)) el.classList.remove(...cls.remove);
      else if (typeof cls.remove === 'string') el.classList.remove(...cls.remove.split(' '));
    }
  } else {
    el.classList.add(...cls.split(' '));
  }
}

export function attr(el: HTMLElement, nameOrObj: any, val?: any): any {
  const apply = (k: string, v: any) => {
    if (k === 'style') Object.assign(el.style, v);
    else if (k === 'classList') updateClassList(el, v);
    else el.setAttribute(k, v === true ? k : v);
  };
  if (typeof nameOrObj === 'object') {
    for (const k in nameOrObj) {
      if (nameOrObj[k] !== false) apply(k, nameOrObj[k]);
      else el.removeAttribute(k);
    }
  } else {
    if (val === undefined) return el.getAttribute(nameOrObj);
    if (val === false) return void el.removeAttribute(nameOrObj);
    apply(nameOrObj, val);
  }
}

// SelectorSet & EventBus (verbatim from theme.pretty.js L1905–2216)
class SelectorSet {
  size = 0;
  uid = 0;
  selectors: string[] = [];
  selectorObjects: Record<number, any> = {};
  activeIndexes: any[] = [];
  matchesSelector(el: Element, selector: string) {
    return el.matches(selector);
  }
  add(selector: string, data: any) {
    if (typeof selector === 'string') {
      const obj = { id: this.uid++, selector, data };
      this.selectorObjects[obj.id] = obj;
      this.size++;
      this.selectors.push(selector);
    }
  }
  remove(selector: string, data?: any) {
    if (typeof selector === 'string') {
      const matchAll = arguments.length === 1;
      for (const id in this.selectorObjects) {
        const obj = this.selectorObjects[id];
        if (obj.selector === selector && (matchAll || obj.data === data)) {
          delete this.selectorObjects[id];
          this.size--;
        }
      }
      this.selectors = Object.values(this.selectorObjects).map((o: any) => o.selector);
    }
  }
  matches(el: Element | null) {
    if (!el) return [];
    const res: any[] = [];
    for (const id in this.selectorObjects) {
      const obj = this.selectorObjects[id];
      if (this.matchesSelector(el, obj.selector)) res.push(obj);
    }
    return res.sort((a, b) => a.id - b.id);
  }
}

function createEventBus(hoverEvents: string[]) {
  const delegated: Record<string, SelectorSet> = {};
  const bus: Record<string, Function[]> = {};

  function ensureBus(evt: string) {
    if (bus[evt] === undefined) bus[evt] = [];
  }
  function resolveTargets(target: any) {
    return typeof target === 'string' ? document.querySelectorAll(target) : target;
  }
  function setCurrentTarget(e: Event, target: Element) {
    Object.defineProperty(e, 'currentTarget', { configurable: true, enumerable: true, get: () => target });
  }
  function handleDelegated(e: Event) {
    const set = delegated[e.type];
    if (!set) return;
    const matches: { delegatedTarget: Element; stack: any[] }[] = [];
    let cur = e.target as Element | null;
    while (cur && cur.nodeType === 1) {
      const stack = set.matches(cur);
      if (stack.length) matches.push({ delegatedTarget: cur, stack });
      cur = cur.parentElement;
    }
    for (let n = 0; n < matches.length; n++) {
      for (let i = 0; i < matches[n].stack.length; i++) {
        if (hoverEvents.indexOf(e.type) !== -1) {
          setCurrentTarget(e, matches[n].delegatedTarget);
          if (e.target === matches[n].delegatedTarget) matches[n].stack[i].data(e);
        } else {
          setCurrentTarget(e, matches[n].delegatedTarget);
          matches[n].stack[i].data(e);
        }
      }
    }
  }

  return {
    bindAll(ctx: any, methods?: string[]) {
      if (methods === undefined) methods = Object.getOwnPropertyNames(Object.getPrototypeOf(ctx));
      for (let n = 0; n < methods.length; n++) ctx[methods[n]] = ctx[methods[n]].bind(ctx);
    },
    on(events: string, target: any, cb?: any, opts?: any) {
      const list = events.split(' ');
      for (let i = 0; i < list.length; i++) {
        const evt = list[i];
        if (typeof target === 'function' && cb === undefined) {
          ensureBus(evt);
          bus[evt].push(target);
        } else if ((target.nodeType && target.nodeType === 1) || target === window || target === document) {
          target.addEventListener(evt, cb, opts);
        } else {
          const els = resolveTargets(target);
          for (let o = 0; o < els.length; o++) els[o].addEventListener(evt, cb, opts);
        }
      }
    },
    delegate(events: string, selector: string, cb: any) {
      const list = events.split(' ');
      for (let i = 0; i < list.length; i++) {
        const evt = list[i];
        let set = delegated[evt];
        if (set === undefined) {
          set = new SelectorSet();
          delegated[evt] = set;
          if (hoverEvents.indexOf(evt) !== -1) document.addEventListener(evt, handleDelegated, true);
          else document.addEventListener(evt, handleDelegated);
        }
        set.add(selector, cb);
      }
    },
    off(events: string, target?: any, cb?: any, opts?: any) {
      const list = events.split(' ');
      for (let i = 0; i < list.length; i++) {
        const evt = list[i];
        if (target === undefined) {
          bus[evt] = [];
          continue;
        }
        if (typeof target === 'function') {
          ensureBus(evt);
          for (let n = 0; n < bus[evt].length; n++) {
            if (bus[evt][n] === target) bus[evt].splice(n, 1);
          }
          continue;
        }
        const set = delegated[evt];
        if (set === undefined || (set.remove(target, cb), set.size !== 0)) {
          if (target.removeEventListener === undefined) {
            const els = resolveTargets(target);
            for (let o = 0; o < els.length; o++) els[o].removeEventListener(evt, cb, opts);
          } else {
            target.removeEventListener(evt, cb, opts);
          }
        } else {
          delete delegated[evt];
          if (hoverEvents.indexOf(evt) !== -1) document.removeEventListener(evt, handleDelegated, true);
          else document.removeEventListener(evt, handleDelegated);
        }
      }
    },
    emit(evt: string, ...args: any[]) {
      if (bus[evt]) {
        for (let n = 0; n < bus[evt].length; n++) bus[evt][n](...args);
      }
    },
  };
}

export const EventBus = createEventBus(['mouseenter', 'mouseleave', 'pointerenter', 'pointerleave']);

function debounce(fn: Function, wait: number) {
  let timer: any = null;
  return function (this: any, ...args: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

// GlobalEvents (verbatim from theme.pretty.js O L2226–2333)
export class GlobalEvents {
  static MOUSEMOVE = 'global:mousemove';
  static TOUCHMOVE = 'global:touchmove';
  static MOUSEDRAG = 'global:mousedrag';
  static TOUCHDRAG = 'global:touchdrag';
  static POINTERMOVE = 'global:mousemove global:touchmove';
  static POINTERDRAG = 'global:touchdrag global:mousedrag';
  static POINTERDOWN = 'global:pointerdown';
  static POINTERUP = 'global:pointerup';
  static RAF = 'global:raf';
  static RESIZE = 'global:resize';
  static currentRafId: number | null = null;
  static currentTime: number | null = null;
  static previousTime: number | null = null;
  static deltaTime: number | null = null;
  static enabled: Record<string, boolean> = {};
  static dragInfo = { x: 0, y: 0, px: 0, py: 0 };

  static detectTouchDevice() {
    if ('ontouchstart' in document.documentElement) {
      store.isTouch = true;
      store.html.classList.add('is-touch');
    }
  }
  static enableMousemove() {
    if (GlobalEvents.enabled.mousemove === undefined) {
      GlobalEvents.enabled.mousemove = true;
      EventBus.on('mousemove touchmove', window, GlobalEvents.handleMousemove, { passive: true });
    }
  }
  static enableResize(wait: number | false = false) {
    if (GlobalEvents.enabled.resize === undefined) {
      GlobalEvents.enabled.resize = true;
      if (wait) {
        EventBus.on('resize', window, debounce((e: Event) => GlobalEvents.handleResize(e), wait));
      } else {
        EventBus.on('resize', window, GlobalEvents.handleResize);
      }
    }
  }
  static enableRAF(useGsapTicker = false) {
    if (GlobalEvents.enabled.raf === undefined) {
      GlobalEvents.enabled.raf = true;
      if (useGsapTicker) {
        GlobalEvents.currentRafId = null;
        gsap.ticker.add(GlobalEvents.handleRaf);
      } else {
        GlobalEvents.currentRafId = window.requestAnimationFrame(GlobalEvents.handleRaf);
      }
    }
  }
  static enableDrag() {
    if (GlobalEvents.enabled.drag === undefined) {
      GlobalEvents.enabled.drag = true;
      EventBus.on('mousedown touchstart', window, GlobalEvents.handleMousedown);
      EventBus.on('mouseup touchend', window, GlobalEvents.handleMouseup);
    }
  }
  static handleMousemove(e: any) {
    store.pointer.default.x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    store.pointer.default.y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    store.pointer.gl.set(store.pointer.default.x - store.window.w / 2, -store.pointer.default.y + store.window.h / 2);
    store.pointer.glNormalized.set(
      (store.pointer.default.x / store.window.w) * 2 - 1,
      (-store.pointer.default.y / store.window.h) * 2 + 1
    );
    if (e.changedTouches) EventBus.emit(GlobalEvents.TOUCHMOVE, e);
    else EventBus.emit(GlobalEvents.MOUSEMOVE, e);
    if (store.pointer.isDragging) {
      const info = {
        deltaX: store.pointer.default.x - GlobalEvents.dragInfo.px,
        deltaY: store.pointer.default.y - GlobalEvents.dragInfo.py,
        startX: GlobalEvents.dragInfo.x,
        startY: GlobalEvents.dragInfo.y,
      };
      EventBus.emit(e.changedTouches ? GlobalEvents.TOUCHDRAG : GlobalEvents.MOUSEDRAG, e, info);
      GlobalEvents.dragInfo.px = store.pointer.default.x;
      GlobalEvents.dragInfo.py = store.pointer.default.y;
    }
  }
  static handleMousedown(e: any) {
    GlobalEvents.handleMousemove(e);
    store.pointer.isDragging = true;
    GlobalEvents.dragInfo.x = GlobalEvents.dragInfo.px = store.pointer.default.x;
    GlobalEvents.dragInfo.y = GlobalEvents.dragInfo.py = store.pointer.default.y;
    EventBus.emit(GlobalEvents.POINTERDOWN, e);
  }
  static handleMouseup(e: any) {
    store.pointer.isDragging = false;
    GlobalEvents.handleMousemove(e);
    GlobalEvents.dragInfo = { x: 0, y: 0, px: 0, py: 0 };
    EventBus.emit(GlobalEvents.POINTERUP, e);
  }
  static handleResize(e?: any) {
    store.window.w = window.innerWidth;
    store.window.h = window.innerHeight;
    store.html.style.setProperty('--vh', `${0.01 * store.window.h}px`);
    EventBus.emit(GlobalEvents.RESIZE, e);
  }
  static handleRaf(time: number) {
    GlobalEvents.previousTime = GlobalEvents.currentTime;
    GlobalEvents.currentTime = time;
    GlobalEvents.deltaTime = GlobalEvents.currentTime - (GlobalEvents.previousTime || 0);
    EventBus.emit(GlobalEvents.RAF, time);
    if (GlobalEvents.currentRafId !== null) {
      GlobalEvents.currentRafId = window.requestAnimationFrame(GlobalEvents.handleRaf);
    }
  }
}

// RAFCollection (verbatim from theme.pretty.js L L2334–2357)
export class RAFCollection {
  callbacks: { index: number; cb: Function }[] = [];
  fire = (time: number) => {
    for (let i = 0; i < this.callbacks.length; i++) {
      this.callbacks[i].cb(time);
    }
  };
  constructor() {
    EventBus.on('global:raf', this.fire);
  }
  add(cb: Function, index: number) {
    this.callbacks.push({ index, cb });
    this.callbacks.sort(this.sort);
  }
  remove(cb: Function) {
    for (let i = 0; i < this.callbacks.length; i++) {
      if (this.callbacks[i].cb === cb) this.callbacks.splice(i, 1);
    }
  }
  sort(a: { index: number }, b: { index: number }) {
    return a.index > b.index ? 1 : -1;
  }
}

// Observer (verbatim from theme.pretty.js Ae L3353–3378)
export class ManagedObserver extends IntersectionObserver {
  eventName: string | false;
  fireFirstObservation: boolean;
  firstObservationFired = false;
  els: any[] = [];
  visibleEls: any[] = [];

  constructor(options: IntersectionObserverInit = {}, eventName: string | false = false, fireFirstObservation = false) {
    super((entries) => this.handler(entries), options);
    this.eventName = eventName;
    this.fireFirstObservation = fireFirstObservation;
  }
  handler = (entries: IntersectionObserverEntry[]) => {
    for (let t = 0; t < entries.length; t++) {
      for (let n = 0; n < this.els.length; n++) {
        if (this.els[n].el === entries[t].target) {
          this.els[n].bcr = entries[t].boundingClientRect;
          if (this.eventName) EventBus.emit(this.eventName, this.els[n]);
          if (entries[t].isIntersecting) {
            if (this.els[n].enter) this.els[n].enter(this.els[n].el, this.els[n].params || null);
            this.visibleEls[n] = this.els[n];
          } else {
            if (this.els[n].leave) this.els[n].leave(this.els[n].el, this.els[n].params || null);
            this.visibleEls[n] = false;
          }
        }
      }
    }
    if (this.fireFirstObservation) {
      this.firstObservationFired = true;
      EventBus.emit('firstObservation', this.els);
    }
  };
  reset = () => {
    this.disconnect();
    this.els = [];
    this.visibleEls = [];
    this.firstObservationFired = false;
  };
}

// BaseComponent & ComponentCollection (verbatim from theme.pretty.js bt L4105, mt L3984)
export class BaseComponent {
  static selector: string | null = null;
  el: HTMLElement;
  constructor(el: HTMLElement) {
    this.el = el;
  }
  destroy() {}
}

export class ComponentCollection {
  Component: any;
  components: any[] = [];
  args: any[] = [];
  negationSelector: string | null = null;
  constructor(Component: any) {
    this.Component = Component;
  }
  init(scope: ParentNode = document) {
    const els = qsa(this.Component.selector, scope);
    this.components = [];
    for (let i = 0; i < els.length; i++) {
      if (this.negationSelector === null || !els[i].matches(this.negationSelector)) {
        this.components.push(new this.Component(els[i], ...this.args));
      }
    }
    return this;
  }
  destroy() {
    for (let i = 0; i < this.components.length; i++) this.components[i].destroy();
    return this;
  }
}

// ASScroll implementation (verbatim from module 4212 in theme.pretty.js L1259–1865)
const assBus = createEventBus(['mouseenter', 'mouseleave']);
const assStore = {
  html: document.documentElement,
  body: document.body,
  window: { w: window.innerWidth, h: window.innerHeight },
  isTouch: false,
};

class ASScrollEvents {
  static INTERNALRAF = 'raf:internal';
  static EXTERNALRAF = 'raf:external';
  static WHEEL = 'wheel';
  static INTERNALSCROLL = 'scroll:internal';
  static EXTERNALSCROLL = 'scroll:external';
  static RESIZE = 'resize';
  static MOUSEDETECTED = 'mouseDetected';
  static SCROLLEND = 'scrollEnd';

  options: any;
  onRaf = () => {
    assBus.emit(ASScrollEvents.INTERNALRAF);
    if (!this.options.disableRaf) requestAnimationFrame(this.onRaf);
  };
  constructor(options: any = {}) {
    this.options = options;
    this.addEvents();
  }
  addEvents() {
    if (!this.options.disableRaf) requestAnimationFrame(this.onRaf);
    if (!this.options.disableResize) {
      assBus.on(
        'resize',
        window,
        debounce(() => {
          this.onResize();
        }, 150)
      );
    }
    this.onScroll();
    if ('ontouchstart' in document.documentElement) {
      assStore.isTouch = true;
      this.detectMouse();
    }
  }
  onScroll() {
    assBus.on(
      'wheel',
      window,
      (e: WheelEvent) => {
        assBus.emit(ASScrollEvents.WHEEL, { event: e });
      },
      { passive: false }
    );
    assBus.on(
      'scroll',
      window,
      (e: Event) => {
        assBus.emit(ASScrollEvents.INTERNALSCROLL, { event: e });
      },
      { passive: true }
    );
  }
  onResize({ width, height }: { width?: number; height?: number } = {}) {
    assStore.window.w = width || window.innerWidth;
    assStore.window.h = height || window.innerHeight;
    assBus.emit(ASScrollEvents.RESIZE);
  }
  detectMouse() {
    window.addEventListener('mousemove', function handler(e: MouseEvent) {
      if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
        assStore.isTouch = false;
        assBus.emit(ASScrollEvents.MOUSEDETECTED);
        window.removeEventListener('mousemove', handler);
      }
    });
  }
}

class ASScrollbar {
  controller: ASScrollController;
  el!: HTMLElement;
  handle!: HTMLElement;
  position = 0;
  mousePos = 0;
  prevMousePos = 0;
  mouseDown = false;
  scale = 1;
  trueSize = 0;
  handleHeight = 0;
  maxY = 0;

  onMouseMove = (e: MouseEvent) => {
    if (this.mouseDown) {
      this.mousePos = e.clientY;
      this.position -= this.prevMousePos - this.mousePos;
      this.position = Math.min(Math.max(this.position, 0), this.maxY);
      this.prevMousePos = this.mousePos;
      this.controller.targetPos = (this.position / this.maxY) * this.controller.maxScroll;
      this.controller.clamp();
      this.controller.syncScroll = true;
      this.transform();
      assBus.emit(ASScrollEvents.EXTERNALSCROLL, -this.controller.targetPos);
    }
  };
  onMouseDown = (e: MouseEvent) => {
    this.mousePos = this.prevMousePos = e.clientY;
    this.mouseDown = true;
    assStore.body.style.userSelect = 'none';
    this.el.classList.add('active');
  };
  onMouseUp = () => {
    this.mouseDown = false;
    assStore.body.style.removeProperty('user-select');
    this.el.classList.remove('active');
  };

  constructor(controller: ASScrollController) {
    this.controller = controller;
    this.addHTML();
    this.el = document.querySelector(this.controller.options.scrollbarEl)!;
    this.handle = document.querySelector(this.controller.options.scrollbarHandleEl)!;
    this.addStyles();
    this.addEvents();
  }
  transform() {
    let y: number;
    if (this.mouseDown) {
      y = this.position;
    } else {
      y = (-this.controller.targetPos / -this.controller.maxScroll) * (assStore.window.h - this.handleHeight);
      this.position = y;
    }
    this.handle.style.transform = `translate3d(0, ${y}px, 0)`;
  }
  show() {
    this.el.classList.add('show');
  }
  hide() {
    this.el.classList.remove('show');
  }
  addEvents() {
    assBus.on('mousedown', this.handle, this.onMouseDown);
    assBus.on('mousemove', window, this.onMouseMove);
    assBus.on('mouseup', window, this.onMouseUp);
  }
  onResize() {
    this.scale = (-this.controller.maxScroll + assStore.window.h) / assStore.window.h;
    if (this.scale <= 1) {
      this.handle.style.height = '0';
    } else {
      this.trueSize = assStore.window.h / this.scale;
      this.handleHeight = Math.max(this.trueSize, 40);
      this.handle.style.height = `${this.handleHeight}px`;
      this.maxY = assStore.window.h - this.handleHeight;
    }
  }
  addHTML() {
    if (document.querySelector(this.controller.options.scrollbarEl)) return;
    const el = document.createElement('div');
    el.classList.add(this.controller.options.scrollbarEl.substring(1));
    el.innerHTML = `<div class="${this.controller.options.scrollbarHandleEl.substring(1)}"><div></div></div>`;
    document.body.appendChild(el);
  }
  addStyles() {
    if (!this.controller.options.disableNativeScrollbar && !this.controller.options.scrollbarStyles) return;
    let css = '';
    if (this.controller.options.disableNativeScrollbar) {
      css += 'html{scrollbar-width:none;}body{-ms-overflow-style:none;}body::-webkit-scrollbar{width:0;height:0;}';
    }
    if (this.controller.options.scrollbarStyles) {
      const s = this.controller.options.scrollbarEl;
      css += `${s} {position:fixed;top:0;right:0;width:20px;height:100%;z-index:900;}.is-touch ${s} {display:none;}${s} > div {padding:6px 0;width:10px;height:0;margin:0 auto;visibility:hidden;}${s} > div > div {width:100%;height:100%;border-radius:10px;opacity:0.3;background-color:#000;}${s} > div > div:hover {opacity:0.9;}${s}:hover > div, ${s}.show > div, ${s}.active > div {visibility:visible;}${s}.active > div > div {opacity:0.9;}`;
    }
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.getElementsByTagName('head')[0].appendChild(style);
  }
  destroy() {
    assBus.off('mousedown', this.handle, this.onMouseDown);
    assBus.off('mousemove', window, this.onMouseMove);
    assBus.off('mouseup', window, this.onMouseUp);
  }
}

class ASScrollController {
  options: any;
  targetPos = 0;
  currentPos = 0;
  prevScrollPos = 0;
  maxScroll = 0;
  scrollLength = 0;
  enabled = false;
  render = false;
  scrolling = false;
  syncScroll = false;
  horizontalScroll = false;
  firstResize = true;
  preventResizeScroll = false;
  ease: number;
  originalScrollbarSetting: boolean;
  testFps = true;
  delta = 1;
  time: number;
  startTime: number;
  containerElement!: HTMLElement;
  scrollElements!: HTMLElement[];
  scrollElementsLength = 0;
  scrollbar!: ASScrollbar;
  iframes: NodeListOf<HTMLIFrameElement> | HTMLIFrameElement[] = [];

  onScroll = ({ event: e }: { event: any }) => {
    if (!this.scrolling) {
      if (this.options.customScrollbar) this.scrollbar.show();
      this.toggleIframes();
      this.scrolling = true;
    }
    if (assStore.isTouch || e.type !== 'wheel') {
      if (this.preventResizeScroll) {
        this.preventResizeScroll = false;
        return;
      }
      if (assStore.isTouch && this.options.touchScrollType === 'scrollTop') {
        this.targetPos = this.horizontalScroll ? -this.containerElement.scrollLeft : -this.containerElement.scrollTop;
      } else {
        this.targetPos = -window.scrollY;
      }
      if (assStore.isTouch && this.options.touchScrollType !== 'transform') {
        this.currentPos = this.targetPos;
      }
    } else {
      e.preventDefault();
      this.syncScroll = true;
      this.targetPos += -1 * e.deltaY;
    }
    this.clamp();
    if (this.options.customScrollbar) this.scrollbar.transform();
    assBus.emit(ASScrollEvents.EXTERNALSCROLL, -this.targetPos);
  };

  onRAF = () => {
    if (this.testFps && this.options.limitLerpRate) {
      this.time = 0.001 * performance.now();
      this.delta = Math.min(60 * (this.time - this.startTime), 1);
      this.startTime = this.time;
    }
    if (!this.render) return;
    if (Math.abs(this.targetPos - this.currentPos) < 0.5) {
      this.currentPos = this.targetPos;
      if (this.scrolling && !this.syncScroll) {
        this.scrolling = false;
        if (this.options.customScrollbar) this.scrollbar.hide();
        this.toggleIframes(true);
        assBus.emit(ASScrollEvents.SCROLLEND, -this.targetPos);
      }
      if (this.syncScroll) {
        window.scrollTo(0, -this.targetPos);
        this.syncScroll = false;
      }
    } else {
      this.currentPos += (this.targetPos - this.currentPos) * this.ease * this.delta;
    }
    const x = this.horizontalScroll ? this.currentPos : 0;
    const y = this.horizontalScroll ? 0 : this.currentPos;
    this.applyTransform(x, y);
    assBus.emit(ASScrollEvents.EXTERNALRAF, { targetPos: -this.targetPos, currentPos: -this.currentPos });
  };

  onResize = () => {
    if (this.scrollElementsLength > 1) {
      const last = this.scrollElements[this.scrollElementsLength - 1];
      const cs = window.getComputedStyle(last);
      const margin = parseFloat(this.horizontalScroll ? cs.marginRight : cs.marginBottom);
      const bcr = last.getBoundingClientRect();
      const edge = this.horizontalScroll ? bcr.right : bcr.bottom;
      this.scrollLength = edge + margin - this.currentPos;
    } else {
      this.scrollLength = this.horizontalScroll
        ? this.scrollElements[0].scrollWidth
        : this.scrollElements[0].scrollHeight;
    }
    const winSize = this.horizontalScroll ? assStore.window.w : assStore.window.h;
    this.maxScroll = this.scrollLength > winSize ? -(this.scrollLength - winSize) : 0;
    this.clamp();
    if (!this.firstResize) this.preventResizeScroll = true;
    assStore.body.style.height = `${this.scrollLength}px`;
    if (this.options.customScrollbar) this.scrollbar.onResize();
    this.firstResize = false;
  };

  toggleFixedContainer = () => {
    this.containerElement.style.position = 'static';
    const pos = this.currentPos;
    this.applyTransform(0, 0);
    requestAnimationFrame(() => {
      this.containerElement.style.position = 'fixed';
      const x = this.horizontalScroll ? pos : 0;
      const y = this.horizontalScroll ? 0 : pos;
      this.applyTransform(x, y);
    });
  };

  constructor(options: any = {}) {
    this.options = options;
    this.ease = assStore.isTouch ? this.options.touchEase : this.options.ease;
    this.originalScrollbarSetting = this.options.customScrollbar;
    this.time = this.startTime = performance.now();
    this.setElements();
    if (assStore.isTouch) {
      this.options.customScrollbar = false;
      if (this.options.touchScrollType === 'transform') {
        this.setupSmoothScroll();
      } else if (this.options.touchScrollType === 'scrollTop') {
        document.documentElement.classList.add('asscroll-touch');
        this.addTouchStyles();
        assBus.on(
          'scroll',
          this.containerElement,
          (e: Event) => {
            assBus.emit(ASScrollEvents.INTERNALSCROLL, { event: e });
          },
          { passive: true }
        );
      }
    } else {
      this.setupSmoothScroll();
    }
    this.addEvents();
  }

  setElements() {
    this.containerElement =
      typeof this.options.containerElement === 'string'
        ? document.querySelector(this.options.containerElement)
        : this.options.containerElement;
    if (this.containerElement === null) console.error('ASScroll: could not find container element');
    this.containerElement.setAttribute('asscroll-container', '');
    const found =
      typeof this.options.scrollElements === 'string'
        ? document.querySelectorAll(this.options.scrollElements)
        : this.options.scrollElements;
    const arr = found && found.length ? [...found] : [];
    this.scrollElements = arr.length ? arr : [this.containerElement.firstElementChild as HTMLElement];
    this.scrollElementsLength = this.scrollElements.length;
    this.scrollElements.forEach((el) => el.setAttribute('asscroll', ''));
  }

  setupSmoothScroll() {
    Object.assign(this.containerElement.style, {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '100%',
      height: '100%',
      contain: 'content',
    });
    if (this.options.customScrollbar) this.scrollbar = new ASScrollbar(this);
    assBus.on(ASScrollEvents.INTERNALRAF, this.onRAF);
    assBus.on(ASScrollEvents.RESIZE, this.onResize);
    if (this.options.limitLerpRate) {
      setTimeout(() => {
        this.testFps = false;
        this.delta = 0.1 * Math.round(10 * this.delta);
      }, 2000);
    }
  }

  applyTransform(x: number, y: number) {
    for (let i = 0; i < this.scrollElementsLength; i++) {
      this.scrollElements[i].style.transform = `translate3d(${x}px, ${y}px, 0px)`;
    }
  }

  enable({ newScrollElements = false, reset = false, restore = false, horizontalScroll = false }: any = {}) {
    if (!this.enabled) {
      this.enabled = true;
      this.render = true;
      this.horizontalScroll = horizontalScroll;
      if (newScrollElements) {
        this.scrollElements = newScrollElements.length ? [...newScrollElements] : [newScrollElements];
        this.scrollElementsLength = this.scrollElements.length;
        this.scrollElements.forEach((el) => el.setAttribute('asscroll', ''));
      }
      this.iframes = this.containerElement.querySelectorAll('iframe');
      if (assStore.isTouch && this.options.touchScrollType !== 'transform') {
        assStore.body.style.removeProperty('height');
        this.maxScroll = -this.containerElement.scrollHeight;
        if (reset) {
          this.targetPos = this.currentPos = 0;
          this.scrollTo(0, false);
        }
      } else {
        this.firstResize = true;
        if (reset) {
          this.targetPos = this.currentPos = 0;
          this.applyTransform(0, 0);
        }
        this.onResize();
      }
      if (restore) this.scrollTo(this.prevScrollPos, false);
      assBus.on(ASScrollEvents.WHEEL, this.onScroll);
      assBus.on(ASScrollEvents.INTERNALSCROLL, this.onScroll);
    }
  }

  disable({ inputOnly = false }: any = {}) {
    if (this.enabled) {
      this.enabled = false;
      if (!inputOnly) this.render = false;
      assBus.off(ASScrollEvents.WHEEL, this.onScroll);
      assBus.off(ASScrollEvents.INTERNALSCROLL, this.onScroll);
      this.prevScrollPos = this.targetPos;
      assStore.body.style.height = '0px';
    }
  }

  clamp() {
    this.targetPos = Math.max(Math.min(this.targetPos, 0), this.maxScroll);
  }

  scrollTo(pos: number, emit = true) {
    this.targetPos = pos;
    if (assStore.isTouch && this.options.touchScrollType !== 'transform') {
      if (this.horizontalScroll) this.containerElement.scrollTo(-this.targetPos, 0);
      else this.containerElement.scrollTo(0, -this.targetPos);
    }
    this.clamp();
    this.syncScroll = true;
    if (emit) assBus.emit(ASScrollEvents.EXTERNALSCROLL, -this.targetPos);
  }

  toggleIframes(enable?: boolean) {
    for (let i = 0; i < this.iframes.length; i++) {
      this.iframes[i].style.pointerEvents = enable ? 'auto' : 'none';
    }
  }

  blockScrollEvent(e: Event) {
    e.stopPropagation();
  }

  addEvents() {
    assBus.on(ASScrollEvents.MOUSEDETECTED, () => {
      if (this.options.touchScrollType !== 'transform') {
        this.options.customScrollbar = this.originalScrollbarSetting;
        this.ease = this.options.ease;
        this.setupSmoothScroll();
        this.onResize();
      }
    });
    if (!assStore.isTouch) {
      assBus.on('mouseleave', document, () => {
        window.scrollTo(0, -this.targetPos);
      });
      assBus.on('keydown', window, (e: KeyboardEvent) => {
        if (
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown' ||
          e.key === 'PageUp' ||
          e.key === 'PageDown' ||
          e.key === 'Home' ||
          e.key === 'End' ||
          e.key === 'Tab'
        ) {
          window.scrollTo(0, -this.targetPos);
        }
        if (e.key === 'Tab') this.toggleFixedContainer();
      });
      assBus.delegate('click', 'a[href^="#"]', this.toggleFixedContainer);
      assBus.delegate('wheel', this.options.blockScrollClass, this.blockScrollEvent);
    }
  }

  addTouchStyles() {
    const css =
      '.asscroll-touch [asscroll-container] {position:absolute;top:0;left:0;right:0;bottom:-0.1px;overflow-y: auto;} .asscroll-touch [asscroll] {margin-bottom:0.1px;}';
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(css));
    document.getElementsByTagName('head')[0].appendChild(style);
  }
}

export class ASScroll {
  events: ASScrollEvents;
  controller: ASScrollController;
  update = () => {
    this.events.onRaf();
  };
  resize = (dims?: { width?: number; height?: number }) => {
    this.events.onResize(dims);
  };
  constructor(params: any = {}) {
    const {
      containerElement = '[asscroll-container]',
      scrollElements = '[asscroll]',
      ease = 0.075,
      touchEase = 1,
      touchScrollType = 'none',
      scrollbarEl = '.asscrollbar',
      scrollbarHandleEl = '.asscrollbar__handle',
      customScrollbar = true,
      scrollbarStyles = true,
      disableNativeScrollbar = true,
      disableRaf = false,
      disableResize = false,
      limitLerpRate = true,
      blockScrollClass = '.asscroll-block',
    } = params;
    this.events = new ASScrollEvents({ disableRaf, disableResize });
    this.controller = new ASScrollController({
      containerElement,
      scrollElements,
      ease,
      touchEase,
      customScrollbar,
      scrollbarEl,
      scrollbarHandleEl,
      scrollbarStyles,
      disableNativeScrollbar,
      touchScrollType,
      limitLerpRate,
      blockScrollClass,
    });
  }
  enable(opts?: any) {
    this.controller.enable(opts);
  }
  disable(opts?: any) {
    this.controller.disable(opts);
  }
  on(eventName: string, cb: Function) {
    if (typeof cb !== 'function') return;
    if (eventName === 'scroll') assBus.on(ASScrollEvents.EXTERNALSCROLL, cb);
    else if (eventName === 'update') assBus.on(ASScrollEvents.EXTERNALRAF, cb);
    else if (eventName === 'scrollEnd') assBus.on(ASScrollEvents.SCROLLEND, cb);
  }
  off(eventName: string, cb: Function) {
    if (typeof cb !== 'function') return;
    if (eventName === 'scroll') assBus.off(ASScrollEvents.EXTERNALSCROLL, cb);
    else if (eventName === 'update') assBus.off(ASScrollEvents.EXTERNALRAF, cb);
    else if (eventName === 'scrollEnd') assBus.off(ASScrollEvents.SCROLLEND, cb);
  }
  scrollTo(pos: number, emit = true) {
    this.controller.scrollTo(-pos, emit);
  }
  get targetPos() {
    return -this.controller.targetPos;
  }
  get currentPos() {
    return -this.controller.currentPos;
  }
  set currentPos(val: number) {
    this.controller.targetPos = this.controller.currentPos = -val;
  }
  get maxScroll() {
    return -this.controller.maxScroll;
  }
  get containerElement() {
    return this.controller.containerElement;
  }
  get scrollElements() {
    return this.controller.scrollElements;
  }
  get isHorizontal() {
    return this.controller.horizontalScroll;
  }
}

// SmoothScroll adapter (verbatim from theme.pretty.js z L2368–2413)
export class SmoothScroll {
  static params: any = {};
  static gsap: any = null;
  static usesGsapRaf = false;
  static scrollTrigger: any = null;

  static withScrollTrigger(st: any, gsapInstance: any) {
    this.scrollTrigger = st;
    if (!this.gsap) this.gsap = gsapInstance;
    if (this.gsap) this.gsap.registerPlugin(st);
    return this;
  }
  static useGsapRaf(gsapInstance: any) {
    this.params.disableRaf = true;
    this.usesGsapRaf = true;
    if (!this.gsap) this.gsap = gsapInstance;
    return this;
  }
  static config(params: any) {
    Object.assign(this.params, params);
    return this;
  }
  static create() {
    if (this.params.disableResize === undefined && (GlobalEvents.enabled.resize || this.scrollTrigger)) {
      this.params.disableResize = true;
    }
    const instance = new ASScroll(this.params);
    if (this.usesGsapRaf) this.gsap.ticker.add(instance.update);
    if (this.params.disableResize === true && GlobalEvents.enabled.resize && !this.scrollTrigger) {
      EventBus.on(GlobalEvents.RESIZE, () => {
        instance.resize({ width: store.window.w, height: store.window.h });
      });
    }
    if (this.scrollTrigger) this.configureScrollTrigger(instance);
    return instance;
  }
  static configureScrollTrigger(instance: ASScroll) {
    this.scrollTrigger.addEventListener('refresh', () => {
      instance.resize({ width: store.window.w, height: store.window.h });
    });
    this.scrollTrigger.defaults({ scroller: instance.containerElement });
    this.scrollTrigger.scrollerProxy(instance.containerElement, {
      scrollTop(val?: number) {
        return arguments.length ? instance.scrollTo(val!) : instance.currentPos;
      },
      getBoundingClientRect: () => ({ top: 0, left: 0, width: store.window.w, height: store.window.h }),
    });
  }
}
