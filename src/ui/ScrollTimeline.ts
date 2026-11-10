import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { store, EventBus, GlobalEvents, BaseComponent, attr, qsa } from './SmoothScroll';
import { gsapEffects } from './TextAnimations';
import { degToRad } from '../webgl/InvestorPyramids';

function parseInlineObject(str: string): any {
  return Function('"use strict";return (' + str + ')')();
}

// Verbatim from theme.pretty.js be (L2993–3157)
export class ScrollAnimations {
  fromAttr = 'animate-from';
  toAttr = 'animate-to';
  mqAttr = 'animate-mq';
  els: { el: HTMLElement; tween: gsap.core.Tween | gsap.core.Timeline }[] = [];
  resizeTweens: { tween: any; preset: string; tweenEl: any; from: any }[] = [];
  mirrorGlProps: Record<string, string> = {
    x: 'position.x',
    y: 'position.y',
    z: 'position.z',
    rotationX: 'rotation.x',
    rotationY: 'rotation.y',
    rotationZ: 'rotation.z',
  };

  constructor() {
    EventBus.on(GlobalEvents.RESIZE, this.onResize);
    this.registerGsapPlugins();
    this.registerGsapEffects();
  }

  onResize = () => {
    for (let i = 0; i < this.resizeTweens.length; i++) {
      const progress = this.resizeTweens[i].tween.progress();
      if (this.resizeTweens[i].tween.scrollTrigger) {
        this.resizeTweens[i].tween.scrollTrigger.kill();
      }
      this.resizeTweens[i].tween.kill();
      if (this.resizeTweens[i].tween._onResize) {
        this.resizeTweens[i].tween._onResize();
      }
      if (progress === 0) {
        this.resizeTweens[i].tween = gsap.effects[this.resizeTweens[i].preset](
          this.resizeTweens[i].tweenEl,
          Object.assign({}, this.resizeTweens[i].from)
        );
      }
    }
  };

  build() {
    const nodes = document.querySelectorAll<HTMLElement>(`[${this.fromAttr}], [${this.toAttr}]`);
    const count = nodes.length;
    for (let i = 0; i < count; i++) {
      const el = nodes[i];
      const mqAttrNode = el.attributes.getNamedItem(this.mqAttr);
      if (mqAttrNode && mqAttrNode.value !== '' && !store.mq[mqAttrNode.value].matches) {
        continue;
      }
      const fromAttrNode = el.attributes.getNamedItem(this.fromAttr);
      const toAttrNode = el.attributes.getNamedItem(this.toAttr);
      if (fromAttrNode && fromAttrNode.value === '' && toAttrNode && toAttrNode.value === '') {
        continue;
      }

      let glProps: any = { uniforms: {} };
      const defaults: any = {
        ease: 'none',
        duration: 1.5,
        scrollTrigger: { trigger: el, horizontal: store.ASS.isHorizontal, once: true },
      };
      const bcr = el.getBoundingClientRect();
      let tween: any;
      let target: any = el;
      let fromVars: any = false;
      let toVars: any = false;

      if (fromAttrNode) {
        fromVars = parseInlineObject(`{${fromAttrNode.value}}`);
        if (el.hasAttribute('dom2webgl')) {
          const parsed = this.parseGlPropsFrom(fromVars, glProps, bcr);
          fromVars = parsed.from;
          glProps = parsed.glProps;
        }
      }

      if (toAttrNode) {
        toVars = Object.assign({}, defaults, parseInlineObject(`{${toAttrNode.value}}`));
        if (el.hasAttribute('dom2webgl')) {
          toVars = this.parseGlPropsTo(toVars, bcr);
        }
      }

      if ((toVars && toVars.stagger) || (fromVars && fromVars.stagger)) {
        target = el.children;
      }

      if (fromVars && fromVars.scrollTrigger) {
        defaults.scrollTrigger = Object.assign(defaults.scrollTrigger, fromVars.scrollTrigger);
        delete fromVars.scrollTrigger;
      }

      if (!target.length && target.hasAttribute('dom2webgl')) {
        if (!target._glProps) target._glProps = glProps;
        if (defaults.scrollTrigger.pin) {
          this.updateGlPropsPinPos(defaults, target);
          defaults.scrollTrigger.onUpdate = () => {
            this.updateGlPropsPinPos(defaults, target);
          };
        }
      }

      if (fromVars && fromVars.preset) {
        const preset = fromVars.preset;
        delete fromVars.preset;
        if (gsapEffects[preset].defaults.scrollTrigger) {
          defaults.scrollTrigger = Object.assign(defaults.scrollTrigger, gsapEffects[preset].defaults.scrollTrigger);
        }
        fromVars.scrollTrigger = defaults.scrollTrigger;
        const savedFrom = Object.assign({}, fromVars);
        tween = gsap.effects[preset](target, fromVars);
        if (gsapEffects[preset].resize) {
          this.resizeTweens.push({ tween, preset, tweenEl: target, from: savedFrom });
        }
      } else if (fromVars && toVars) {
        toVars = Object.assign(defaults, toVars);
        tween = gsap.fromTo(target, fromVars, toVars);
      } else if (!toVars && fromVars) {
        fromVars = Object.assign(defaults, fromVars);
        tween = gsap.from(target, fromVars);
      } else {
        toVars = Object.assign(defaults, toVars);
        tween = gsap.to(target, toVars);
      }

      if (tween.scrollTrigger) tween.scrollTrigger.disable();
      tween.pause();
      this.els.push({ el, tween });
    }
  }

  enable() {
    for (let i = 0; i < this.els.length; i++) {
      const st = this.els[i].tween.scrollTrigger;
      if (st) {
        st.enable();
        if (st.isActive && !st.vars.scrub) {
          this.els[i].tween.restart(true);
        }
      }
    }
  }

  parseGlPropsFrom(fromVars: any, glProps: any, bcr: DOMRect) {
    fromVars.glProps = {};
    if (Object.prototype.hasOwnProperty.call(fromVars, 'uniforms')) {
      fromVars.glProps.uniforms = Object.assign({}, fromVars.uniforms);
      glProps.uniforms = Object.assign({}, fromVars.uniforms);
      delete fromVars.uniforms;
    }
    for (const key in fromVars) {
      if (Object.prototype.hasOwnProperty.call(this.mirrorGlProps, key)) {
        const val = this.parseMirroredValue(key, fromVars[key], bcr);
        fromVars.glProps[this.mirrorGlProps[key]] = val;
        glProps[this.mirrorGlProps[key]] = val;
      }
    }
    return { from: fromVars, glProps };
  }

  parseGlPropsTo(toVars: any, bcr: DOMRect) {
    toVars.glProps = {};
    if (Object.prototype.hasOwnProperty.call(toVars, 'uniforms')) {
      toVars.glProps.uniforms = Object.assign({}, toVars.uniforms);
      delete toVars.uniforms;
    }
    for (const key in toVars) {
      if (Object.prototype.hasOwnProperty.call(this.mirrorGlProps, key)) {
        const val = this.parseMirroredValue(key, toVars[key], bcr);
        toVars.glProps[this.mirrorGlProps[key]] = val;
      }
    }
    return toVars;
  }

  parseMirroredValue(key: string, val: any, bcr: DOMRect) {
    if (typeof val === 'string' && val.includes('%')) {
      val = (key === 'x' ? bcr.width : bcr.height) * parseFloat(val) * 0.01;
    }
    if (key.includes('rotation')) {
      val = degToRad(val);
    }
    return val;
  }

  updateGlPropsPinPos(defaults: any, target: any) {
    if (defaults.scrollTrigger.horizontal) {
      target._glProps['position.x'] = gsap.getProperty(target, 'x');
    } else {
      target._glProps['position.y'] = gsap.getProperty(target, 'y');
    }
  }

  registerGsapEffects() {
    for (const name in gsapEffects) {
      gsap.registerEffect(gsapEffects[name]);
    }
  }

  registerGsapPlugins() {
    gsap.registerPlugin(ScrollTrigger);
    gsap.registerPlugin({
      name: 'glProps',
      init(target: any, vars: any) {
        for (const key in vars) {
          if (typeof vars[key] !== 'object') {
            (this as any).add(target._glProps, key, target._glProps[key], vars[key]);
          } else {
            for (const subKey in vars[key]) {
              (this as any).add(target._glProps[key], subKey, target._glProps[key][subKey], vars[key][subKey]);
              (this as any)._props.push(subKey);
            }
          }
        }
      },
    } as any);
  }

  destroy() {
    for (let i = 0; i < this.els.length; i++) {
      if (this.els[i].tween.scrollTrigger) {
        this.els[i].tween.scrollTrigger!.kill(false);
      }
      if (this.els[i].tween) {
        this.els[i].tween.kill();
      }
    }
    this.els = [];
    this.resizeTweens = [];
  }
}

// Verbatim from theme.pretty.js wn (L5921–5971)
export class Section extends BaseComponent {
  static selector = '.js-section';
  id: number;
  name: string;
  bcr: DOMRect;
  bcrTop = 0;
  entered = false;
  elObj: any;

  constructor(el: HTMLElement, id: number) {
    super(el);
    this.id = id;
    this.name = attr(this.el, 'section-name');
    this.bcr = this.el.getBoundingClientRect();
    this.onResize();
    this.observe();
  }

  onResize = () => {
    this.bcr = this.el.getBoundingClientRect();
    this.bcrTop = this.bcr.top + store.ASS.currentPos;
  };

  onRaf = () => {
    if (store.sectionIndex === this.id) {
      store.sectionProgress = store.sectionIndex + Math.abs((store.ASS.currentPos - this.bcrTop) / this.bcr.height);
    }
  };

  enter = () => {
    if (!this.entered) this.entered = true;
    store.sectionIndex = this.id;
    store.sectionName = this.name;
    this.addEvents();
    EventBus.emit('section:enter');
  };

  leave = () => {
    if (this.entered) {
      this.entered = true;
      this.removeEvents();
    }
  };

  destroy = () => {
    this.removeEvents();
  };

  observe() {
    store.sectionObserver.observe(this.el);
    this.elObj = {
      el: this.el,
      enter: this.enter,
      leave: this.leave,
      destroy: this.destroy,
      bcr: this.bcr,
    };
    store.sectionObserver.els.push(this.elObj);
  }

  addEvents() {
    EventBus.on(GlobalEvents.RAF, this.onRaf);
    EventBus.on(GlobalEvents.RESIZE, this.onResize);
  }

  removeEvents() {
    EventBus.off(GlobalEvents.RAF, this.onRaf);
    EventBus.off(GlobalEvents.RESIZE, this.onResize);
  }

  ease(t: number) {
    return t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  }
}

// Verbatim from theme.pretty.js Sn (L5972–5997)
export class SectionManager {
  sections: HTMLElement[] = [];
  components: Section[] = [];

  constructor() {
    this.build();
    this.addEvents();
  }

  onResize = () => {
    for (let i = 0; i < store.sectionObserver.els.length; i++) {
      store.sectionObserver.unobserve(store.sectionObserver.els[i].el);
      store.sectionObserver.els[i].destroy();
    }
    store.sectionObserver.els = [];
    this.build();
  };

  build() {
    this.sections = qsa('.js-section');
    this.components = [];
    this.sections.forEach((el, idx) => {
      this.components.push(new Section(el, idx));
    });
    Object.assign(store.components, { sections: this.components });
  }

  addEvents() {
    EventBus.on(GlobalEvents.RESIZE, this.onResize);
  }
}
