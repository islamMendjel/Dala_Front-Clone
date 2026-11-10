import gsap from 'gsap';
import { store, EventBus, GlobalEvents, BaseComponent, attr, qs, qsa } from './SmoothScroll';

// Verbatim from theme.pretty.js Pn (L6006–6170)
export class TeamSlider extends BaseComponent {
  static selector = '.js-slider';
  dom: {
    slideContainer: HTMLElement | null;
    slides: HTMLElement[];
    prevBtn: HTMLElement | null;
    prevBtnHover: HTMLElement | null;
    prevBtnBg?: HTMLElement | null;
    nextBtn: HTMLElement | null;
    nextBtnHover: HTMLElement | null;
    nextBtnBg?: HTMLElement | null;
    contentEls: HTMLElement[];
  };
  itemCount = 3;
  activeIndex = 0;
  allowAnimation = true;
  contentTimelines: Record<string, { inTl: any; outTl: any }> = {};
  slides: { slide: HTMLElement; image: HTMLElement | null; content: { el: HTMLElement; inTl: any; outTl: any } }[] = [];
  content: Record<string, HTMLElement> = {};
  itemBcr!: DOMRect;
  imageBcr!: DOMRect;
  centerIndexOffset = 2;
  centerPositionOffset = 0;
  translateIncriment = 0;
  translateBase = 0;
  activeSlide: any = null;
  activeContentInTl: any = null;
  activeContentOuTl: any = null;
  setActiveTl: any = null;
  previousTl: any = null;

  constructor(el: HTMLElement) {
    super(el);
    this.dom = {
      slideContainer: qs('.js-slides', this.el),
      slides: qsa('.js-slide', this.el),
      prevBtn: qs('.js-slider-prev'),
      prevBtnHover: qs('.js-slider-prev-hover', this.el),
      nextBtn: qs('.js-slider-next'),
      nextBtnHover: qs('.js-slider-next-hover', this.el),
      contentEls: qsa('.js-slide-content'),
    };
    this.reset();
    this.addEvents();
  }

  previous = () => {
    if (!this.allowAnimation) return;
    if (store.isTouch) {
      gsap
        .timeline({ yoyo: true, repeat: 1 })
        .fromTo(this.dom.prevBtnBg as any, { scale: 1 }, { scale: 1.1, ease: 'expo.inOut', duration: 0.6 }, 0)
        .fromTo(this.dom.prevBtnHover, { scale: 0 }, { scale: 1.1, ease: 'expo.inOut', duration: 0.6 }, 0);
    }
    this.allowAnimation = false;
    this.activeIndex--;
    if (this.activeIndex === -this.itemCount) {
      this.activeIndex = 0;
      this.setActiveSlide(this.itemCount + this.centerIndexOffset + 1, true);
      gsap.set(this.dom.slideContainer, {
        x: this.translateBase - this.translateIncriment * (this.activeIndex + 1),
      });
    }
    this.previousTl = gsap.timeline().to(this.dom.slideContainer, {
      x: this.translateBase - this.translateIncriment * this.activeIndex,
    });
    this.setActiveSlide(this.activeIndex + (this.itemCount + this.centerIndexOffset));
  };

  next = () => {
    if (!this.allowAnimation) return;
    if (store.isTouch) {
      gsap
        .timeline({ yoyo: true, repeat: 1 })
        .fromTo(this.dom.nextBtnBg as any, { scale: 1 }, { scale: 1.1, ease: 'expo.inOut', duration: 0.6 }, 0)
        .fromTo(this.dom.nextBtnHover, { scale: 0 }, { scale: 1.1, ease: 'expo.inOut', duration: 0.6 }, 0);
    }
    this.allowAnimation = false;
    this.activeIndex++;
    if (this.activeIndex === this.itemCount) {
      this.activeIndex = 0;
      this.setActiveSlide(this.itemCount + this.centerIndexOffset - 1, true);
      gsap.set(this.dom.slideContainer, {
        x: this.translateBase - this.translateIncriment * (this.activeIndex - 1),
      });
    }
    this.previousTl = gsap.timeline().to(this.dom.slideContainer, {
      x: this.translateBase - this.translateIncriment * this.activeIndex,
    });
    this.setActiveSlide(this.activeIndex + (this.itemCount + this.centerIndexOffset));
  };

  onResize = () => {
    this.reset();
  };

  addEvents() {
    EventBus.on('click', this.dom.prevBtn, this.previous);
    EventBus.on('click', this.dom.nextBtn, this.next);
    EventBus.on(GlobalEvents.RESIZE, this.onResize);
  }

  reset() {
    this.slides = [];
    this.content = {};
    this.dom.contentEls.forEach((el) => {
      this.content[attr(el, 'slide-id')] = el;
    });
    this.dom.slides.forEach((slide) => {
      const id = attr(slide, 'slide-id');
      const contentEl = this.content[id];
      const tls = this.contentTimelines[id] ? this.contentTimelines[id] : this.buildContentTimelines(contentEl);
      this.slides.push({
        slide,
        image: qs('.js-slide-image', slide),
        content: { el: contentEl, inTl: tls.inTl, outTl: tls.outTl },
      });
    });
    this.itemBcr = this.slides[0].slide.getBoundingClientRect();
    this.imageBcr = this.slides[0].image!.getBoundingClientRect();
    this.centerIndexOffset = store.mq.md.matches ? 2 : 1;
    this.centerPositionOffset = store.mq.md.matches ? 0.5 * this.imageBcr.width : 0.18 * store.window.w;
    this.translateIncriment = this.itemBcr.width;
    this.translateBase = -(this.translateIncriment * this.itemCount + this.centerPositionOffset);
    this.dom.slideContainer!.style.transform = `translateX(${this.translateBase}px)`;
    this.setActiveSlide(this.itemCount + this.centerIndexOffset);
    this.activeIndex = 0;
    if (store.isTouch) {
      this.dom.prevBtn!.classList.remove('hover-enabled');
      this.dom.nextBtn!.classList.remove('hover-enabled');
    } else {
      this.dom.prevBtn!.classList.add('hover-enabled');
      this.dom.nextBtn!.classList.add('hover-enabled');
    }
  }

  setActiveSlide(idx: number, immediate = false) {
    const target = this.slides[idx];
    const method = immediate ? 'set' : 'to';
    this.activeContentInTl?.kill();
    this.activeContentOuTl?.kill();
    this.setActiveTl = gsap.timeline();
    if (this.activeSlide) {
      this.setActiveTl[method](
        this.activeSlide.image,
        { scale: 1, filter: 'grayscale(1) brightness(0.1)', duration: 0.5, ease: 'quad.out' },
        0
      )[method](this.activeSlide.slide, { autoAlpha: 0.9, duration: 0.5, ease: 'quad.out' }, 0);
      if (!immediate) {
        this.activeContentInTl.outTl = this.activeSlide.content.outTl;
        this.activeSlide.content.outTl.progress(0);
        this.activeSlide.content.outTl.paused(false);
        this.setActiveTl.add(this.activeSlide.content.outTl, 0);
      }
    }
    this.activeSlide = target;
    this.setActiveTl[method](target.slide, { autoAlpha: 1, duration: 0.5, ease: 'quad.out' }, 0)
      .call(
        () => {
          this.allowAnimation = true;
        },
        undefined,
        0.5
      )
      [method](target.image, { scale: 1.2, filter: 'grayscale(0) brightness(1)', duration: 0.5, ease: 'quad.out' }, 0);
    if (!immediate) {
      this.activeContentInTl = target.content.inTl;
      target.content.inTl.progress(0);
      target.content.inTl.paused(false);
      this.setActiveTl.add(target.content.inTl, 0.2);
    }
  }

  buildContentTimelines(el: HTMLElement) {
    const role = qs('.js-role', el);
    const name = qs('.js-name', el);
    const icons = qsa('.js-social-icon', el);
    const inTl = (gsap.timeline({ immediateRender: true, paused: true }) as any)
      .splitCharsWipeUpIn(role, { duration: 0.7 }, 0)
      .splitCharsWipeUpIn(name, { duration: 0.7 }, 0.5);
    const charTargets: any[] = [];
    inTl.getChildren().forEach((child: any) => {
      charTargets.push(child.targets());
    });
    inTl
      .set(el.parentElement, { pointerEvents: 'auto' }, 0)
      .to(icons, { scale: 1, duration: 0.7, stagger: 0.2, ease: 'expo.out' }, 1);

    const tls = {
      inTl,
      outTl: gsap
        .timeline({ immediateRender: true, paused: true })
        .set(el.parentElement, { pointerEvents: 'none' })
        .to(charTargets, { y: '-110%', ease: 'expo.out', duration: 0.7 }, 0)
        .to(icons, { scale: 0, stagger: 0.1, duration: 0.7, ease: 'expo.out' }, 0),
    };
    this.contentTimelines[attr(el, 'slide-id')] = tls;
    return tls;
  }
}
