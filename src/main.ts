import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  store,
  EventBus,
  GlobalEvents,
  RAFCollection,
  ManagedObserver,
  ComponentCollection,
  SmoothScroll,
} from './ui/SmoothScroll';
import { AssetLoader, SiteLoader } from './webgl/AssetManager';
import { Dom2Webgl } from './webgl/InvestorPyramids';
import { WebGLController } from './webgl/PostProcessing';
import { ScrollAnimations, SectionManager } from './ui/ScrollTimeline';
import {
  ExampleComponent,
  Header,
  Navigation,
  CookieNotice,
  FocusManager,
} from './ui/TextAnimations';
import { TeamSlider } from './ui/TeamSlider';

history.scrollRestoration = 'manual';

function initApp() {
  GlobalEvents.detectTouchDevice();
  GlobalEvents.enableMousemove();
  GlobalEvents.enableRAF(true);
  GlobalEvents.enableResize();
  GlobalEvents.enableDrag();

  store.html.style.setProperty('--vh', `${0.01 * store.window.h}px`);
  store.RAFCollection = new RAFCollection();
  store.ASS = SmoothScroll.config({
    scrollbarStyles: false,
    disableRaf: true,
    touchScrollType: 'scrollTop',
  })
    .withScrollTrigger(ScrollTrigger, gsap)
    .create();
  store.RAFCollection.add(store.ASS.update, 0);

  store.ScrollAnimations = new ScrollAnimations();
  store.AssetLoader = new AssetLoader();
  store.WebGL = new WebGLController();

  if (store.mq.sm.matches) {
    store.Dom2WebglObserver = new ManagedObserver({ rootMargin: '0% 0% 0% 0%' }, 'dom2webgl', true);
    store.Dom2Webgl = new Dom2Webgl();
  }

  store.sectionObserver = new ManagedObserver({ rootMargin: '0% 0% -99.999% 0%' }, false, false);
  store.SiteLoader = new SiteLoader();

  store.components = Object.assign(store.components, {
    examples: new ComponentCollection(ExampleComponent).init(),
    headers: new ComponentCollection(Header).init(),
    sliders: new ComponentCollection(TeamSlider).init(),
    navigations: new ComponentCollection(Navigation).init(),
    cookieNotice: new ComponentCollection(CookieNotice).init(),
  });

  store.sectionManager = new SectionManager();

  store.AssetLoader.load().then(() => {
    if (store.mq.sm.matches) {
      store.Dom2Webgl.enable();
    }
    store.ScrollAnimations.build();
    store.SiteLoader.enterSite().then(() => {
      store.ScrollAnimations.enable();
      store.ASS.enable();
      store.ASS.controller.ease = 0.075;
      store.WebGL.onEnterSite();
      document
        .querySelectorAll('img[loading="lazy"]')
        .forEach((img) => img.removeAttribute('loading'));
    });
  });

  if (store.mq.sm.matches) {
    store.Dom2Webgl.build();
  }
  FocusManager.init();
}

if (document.readyState === 'loading') {
  EventBus.on('DOMContentLoaded', window, initApp);
} else {
  initApp();
}
