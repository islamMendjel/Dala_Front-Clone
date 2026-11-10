import { TextureLoader } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import gsap from 'gsap';
import { store, EventBus, qs, qsa } from '../ui/SmoothScroll';

export function getAssetsManifest() {
  return {
    images: [] as any[],
    textures: [
      { id: 'cone_scale', url: '/images/sc-33.png' },
      { id: 'cone_color', url: '/images/cd-33.png' },
      { id: 'cone_position_exr', url: '/images/pos-33.exr' },
      { id: 'sprite', url: '/images/dof-2k-10.jpg' },
      { id: 'noise', url: '/images/gradient-noise.jpg' },
      { id: 'grain', url: '/images/noise.jpg' },
    ],
    sounds: [] as any[],
    videos: [] as any[],
    models: [
      { id: 'piramed_thinner', url: '/models/py-lod7.glb' },
      { id: 'piramed', url: store.isDesktop ? '/models/py-lod7.glb' : '/models/py-monbile.glb' },
      { id: 'piramed_back', url: '/models/py-lod1.glb' },
      { id: 'piramed_medium', url: '/models/py-lod2.glb' },
      { id: 'piramed_front', url: '/models/py-lod3.glb' },
    ],
    jsons: [] as any[],
    fontTextures: [] as any[],
    fonts: [] as any[],
  };
}

// Verbatim from theme.pretty.js Te (L3171–3343)
export class AssetLoader {
  promisesToLoad: Promise<any>[] = [];
  fontsLoaded = false;
  loaded: Promise<void> | false = false;
  progressEventName: string;
  element!: HTMLElement;
  jsons: Record<string, Promise<any>> = {};
  gltfs: Record<string, Promise<any>> = {};
  textures: Record<string, Promise<any>> = {};
  ktxTextures: Record<string, Promise<any>> = {};
  textureLoader: TextureLoader;
  ktxLoader: KTX2Loader;
  exrLoader: EXRLoader;
  gltfLoader: GLTFLoader;
  dracoLoader: DRACOLoader;

  constructor(progressEventName = 'AssetsProgress') {
    this.progressEventName = progressEventName;
    this.textureLoader = new TextureLoader();
    this.ktxLoader = new KTX2Loader();
    this.ktxLoader.setTranscoderPath(`${store.assetsUrl || ''}basis/`);
    this.exrLoader = new EXRLoader();
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath(`${store.assetsUrl || ''}draco/`);
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  load = ({ element = document.body, progress = true }: { element?: HTMLElement; progress?: boolean } = {}) => {
    if (element) {
      this.element = element;
      this.addFonts();
      this.addMedia();
    }
    let completed = 0;
    if (progress) {
      for (let i = 0; i < this.promisesToLoad.length; i++) {
        this.promisesToLoad[i].then(() => {
          completed++;
          this.progressCallback((100 * completed) / this.promisesToLoad.length);
        });
      }
    }
    this.loaded = new Promise<void>((resolve) => {
      Promise.all(this.promisesToLoad).then(() => {
        this.reset();
        resolve();
      });
    });
    return this.loaded;
  };

  progressCallback = (percent: number) => {
    EventBus.emit(this.progressEventName, { percent: Math.ceil(percent) });
  };

  add = <T>(promise: Promise<T>): Promise<T> => {
    this.promisesToLoad.push(promise);
    return promise;
  };

  addMedia = () => {
    const imgs = this.element.querySelectorAll<HTMLImageElement>('img:not([loading="lazy"])');
    for (let i = 0; i < imgs.length; i++) {
      this.addImage(imgs[i]);
    }
    const videos = this.element.querySelectorAll<HTMLVideoElement>('video:not([lazy])');
    for (let i = 0; i < videos.length; i++) {
      this.add(
        new Promise<void>((resolve) => {
          videos[i].crossOrigin = '';
          const onCanPlay = () => {
            videos[i].removeEventListener('canplaythrough', onCanPlay);
            const onTimeUpdate = () => {
              videos[i].removeEventListener('timeupdate', onTimeUpdate);
              videos[i].pause();
              resolve();
            };
            videos[i].addEventListener('timeupdate', onTimeUpdate);
          };
          videos[i].addEventListener('canplaythrough', onCanPlay);
          videos[i].addEventListener('error', () => resolve());
          if (videos[i].src === '' && videos[i].dataset.src) {
            videos[i].src = videos[i].dataset.src!;
          }
          videos[i].load();
          videos[i].play();
        })
      );
    }
  };

  addFonts = () => {
    if ((document as any).fonts) {
      this.add((document as any).fonts.ready);
    }
    if (!this.fontsLoaded && (window as any).Typekit) {
      this.add(
        new Promise<void>((resolve) => {
          (window as any).Typekit.load({
            active: () => {
              this.fontsLoaded = true;
              resolve();
            },
          });
        })
      );
    }
  };

  addImage(img: HTMLImageElement) {
    return this.add(
      new Promise<HTMLImageElement>((resolve) => {
        if (img.complete && img.naturalWidth !== 0) {
          resolve(img);
        } else {
          img.addEventListener('load', () => resolve(img));
          img.addEventListener('error', () => resolve(img));
        }
      })
    );
  }

  reset = () => {
    this.promisesToLoad = [];
  };
}

// Verbatim from theme.pretty.js Tn (L6171–6316)
export class SiteLoader {
  dom: {
    el: HTMLElement;
    spinner: HTMLElement | null;
    spinnerSVG: HTMLElement | null;
    progress: HTMLElement | null;
    progressDigits: HTMLElement[];
    loadingText: HTMLElement | null;
    completedText: HTMLElement | null;
    heading: HTMLElement[];
    ellipsis: HTMLElement[];
    text: HTMLElement[];
  };
  skip: boolean;
  currentProgress = 0;
  criticalAnimationEnded = false;
  counterIsVisible = false;
  slowProgressInterval: any = null;
  revealed!: Promise<void>;
  revealedResolve!: () => void;
  expeditedOutTl!: gsap.core.Timeline;
  standardOutTl!: gsap.core.Timeline;

  constructor() {
    const el = document.querySelector('.js-site-loader') as HTMLElement;
    this.dom = {
      el,
      spinner: qs('.js-site-loader-spinner', el),
      spinnerSVG: qs('.js-site-loader-spinner-svg', el),
      progress: qs('.js-site-loader-progress', el),
      progressDigits: qsa('.js-site-loader-progress-digit', el),
      loadingText: qs('.js-site-loader-loading-text', el),
      completedText: qs('.js-site-loader-completed-text span', el),
      heading: qsa('.js-site-loader-heading-text', el),
      ellipsis: qsa('.js-site-loader-ellipses-wrapper', el),
      text: qsa('.js-site-loader-text span', el),
    };
    this.skip = new URLSearchParams(window.location.search).has('skiploader');
    if (this.skip || (window.location.pathname !== '/' && window.location.pathname !== '/index.html')) {
      gsap.set(this.dom.el, { autoAlpha: 0, pointerEvents: 'none' });
    } else {
      this.build();
    }
    this.currentProgress = 0;
  }

  onCriticalAnimationEnd = () => {
    this.criticalAnimationEnded = true;
    if (this.currentProgress === 100) {
      this.expeditedOutTl.play();
    } else if (this.dom.progress) {
      this.dom.progress.style.visibility = 'visible';
      this.dom.progress.style.opacity = '1';
      this.counterIsVisible = true;
    }
  };

  onAssetsProgress = ({ percent }: { percent: number }) => {
    this.currentProgress = percent;
    let ticks = 0;
    if (this.slowProgressInterval) clearInterval(this.slowProgressInterval);
    this.slowProgressInterval = setInterval(() => {
      if (ticks >= 3 || this.currentProgress === 100) {
        clearInterval(this.slowProgressInterval);
      } else {
        this.currentProgress += 1;
        this.updateProgressCounter();
        ticks++;
      }
    }, 250);
    if (this.currentProgress === 100 && this.criticalAnimationEnded) {
      clearInterval(this.slowProgressInterval);
      this.standardOutTl.play();
    }
    if (this.counterIsVisible) this.updateProgressCounter();
  };

  enterSite = () => {
    this.revealed = new Promise<void>((resolve) => {
      this.revealedResolve = resolve;
    });
    if (this.skip || (window.location.pathname !== '/' && window.location.pathname !== '/index.html')) {
      this.revealedResolve();
    }
    return this.revealed;
  };

  build() {
    this.buildTimelines();
    this.addEvents();
  }

  addEvents() {
    EventBus.on('AssetsProgress', this.onAssetsProgress);
    if (this.dom.loadingText && getComputedStyle(this.dom.loadingText).getPropertyValue('transform') === 'matrix(1, 0, 0, 1, 0, 0)') {
      this.onCriticalAnimationEnd();
    } else if (this.dom.heading[0]) {
      this.dom.heading[0].addEventListener('animationend', this.onCriticalAnimationEnd);
    }
  }

  updateProgressCounter() {
    const digits = Array.from(this.currentProgress.toString()).map(Number).reverse();
    if (this.dom.progressDigits[2]) this.dom.progressDigits[2].textContent = digits[0] !== undefined ? String(digits[0]) : '';
    if (this.dom.progressDigits[1]) this.dom.progressDigits[1].textContent = digits[1] !== undefined ? String(digits[1]) : '';
    if (this.dom.progressDigits[0]) this.dom.progressDigits[0].textContent = digits[2] !== undefined ? String(digits[2]) : '';
  }

  buildTimelines() {
    this.expeditedOutTl = gsap
      .timeline({
        paused: true,
        immediateRender: true,
        delay: 0.5,
        onStart: () => {
          if (this.dom.heading[0]) this.dom.heading[0].removeEventListener('animationend', this.onCriticalAnimationEnd);
          EventBus.off('AssetsProgress', this.onAssetsProgress);
          this.dom.el.classList.add('loaded');
        },
        onComplete: () => {
          this.expeditedOutTl.kill();
          this.standardOutTl.kill();
        },
      })
      .to(this.dom.loadingText, { yPercent: -110, rotate: 5, ease: 'expo.out', duration: 2 }, 0)
      .set(this.dom.ellipsis, { autoAlpha: 0 }, 0)
      .to(this.dom.heading, { yPercent: -120, rotate: 2, ease: 'expo.out', duration: 2, stagger: 0.1 }, 0)
      .set(
        this.dom.spinnerSVG,
        {
          transform: 'scale(1)',
          animationName: 'scaleDown',
          animationFillMode: 'forwards',
          animationDirection: 'normal',
          animationDuration: '0.4s',
          animationDelay: '0',
        },
        0
      )
      .to(this.dom.completedText, { y: 0, rotate: 0, duration: 0.5, ease: 'power1.out' }, 0)
      .to(this.dom.el, { autoAlpha: 0, ease: 'none', duration: 0.5 }, 0.5)
      .call(
        () => {
          this.revealedResolve();
          EventBus.emit('siteloader:hide');
        },
        undefined,
        '<'
      );

    this.standardOutTl = gsap
      .timeline({
        paused: true,
        immediateRender: true,
        onStart: () => {
          if (this.dom.heading[0]) this.dom.heading[0].removeEventListener('animationend', this.onCriticalAnimationEnd);
          EventBus.off('AssetsProgress', this.onAssetsProgress);
          this.dom.el.classList.add('loaded');
        },
        onComplete: () => {
          this.expeditedOutTl.kill();
          this.standardOutTl.kill();
        },
      })
      .to(this.dom.loadingText, { yPercent: -110, rotate: 5, ease: 'expo.out', duration: 2 }, 0)
      .set(this.dom.ellipsis, { autoAlpha: 0 }, 0)
      .to(this.dom.heading, { yPercent: -120, rotate: 2, ease: 'expo.out', duration: 2, stagger: 0.15 }, 0)
      .set(
        this.dom.spinnerSVG,
        {
          transform: 'scale(1)',
          animationName: 'scaleDown',
          animationFillMode: 'forwards',
          animationDirection: 'normal',
          animationDuration: '0.4s',
          animationDelay: '0',
        },
        0
      )
      .to(this.dom.progress, { autoAlpha: 0, duration: 0.5, ease: 'power1.out' }, 0.2)
      .to(this.dom.completedText, { y: 0, rotate: 0, duration: 0.5, ease: 'power1.out' }, 0.2)
      .to(this.dom.el, { autoAlpha: 0, ease: 'none', duration: 0.5 }, 1)
      .call(
        () => {
          this.revealedResolve();
          EventBus.emit('siteloader:hide');
        },
        undefined,
        '<'
      );
  }
}
