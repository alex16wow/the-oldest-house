/**
 * The slide controller (desktop): one full-screen slide at a time. Wheel,
 * trackpad, keys, the pyramid cues, the menu and the Motion Lab all call
 * `go()`. Each swap runs Interlude's sequence on one page: cover the old slide
 * (`leave`), switch slides under the cover, set the new slide's starting state
 * (`prepare`), reveal it (`enter`), then give input back.
 *
 * On narrow screens the deck is off and the page scrolls as before.
 */
import { gsap } from 'gsap';
import type { Direction, Transition, TransitionContext } from './interlude/types';
import { mediaReady } from './interlude/media';
import { CUSTOM, NONE, loadTransition } from './registry';
import { motionOf } from './settings';
import * as content from './content';

// The deck runs at every width: on phones too, each block is a slide that scrolls inside itself
// and swaps to the next with its transition. (A media query, so it could be limited again.)
const DESKTOP = window.matchMedia('all');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
/** Wheel distance (px) that counts as one deliberate step. */
const WHEEL_STEP = 40;
/** A gap this long (ms) between wheel events ends a gesture: until then, momentum is ignored. */
const GESTURE_GAP = 220;
const MEDIA_TIMEOUT = 900;

type Go = { trigger?: Element; preview?: boolean; direction?: Direction };

const OH = (window as any).OH as {
  syncUI: (slide: HTMLElement) => void;
  slideAtCenter: () => HTMLElement;
  observeReveal: () => void;
  revealIO: () => IntersectionObserver | null;
  fitTitles: () => void;
  deck?: Deck;
};

const stage = document.getElementById('page') as HTMLElement;
const root = document.querySelector<HTMLElement>('[data-interlude]')!;

class Deck {
  active = false;
  index = 0;
  busy = false;
  #slides: HTMLElement[] = [];
  #run = 0;
  #playing: gsap.core.Animation | null = null;
  #wheelAcc = 0;
  #lastWheel = 0;
  #gestureSpent = false;
  #scrolledInSlide = false;
  /** Whether the slide's text was already at the edge when the finger went down. */
  #edgeAtStart = { top: true, bottom: true };
  #touchY: number | null = null;
  #pointer = { x: innerWidth / 2, y: innerHeight / 2, time: -Infinity };

  get slides() {
    return this.#slides;
  }
  get current() {
    return this.#slides[this.index];
  }

  constructor() {
    this.#slides = [...stage.querySelectorAll<HTMLElement>('.slide')];
    for (const slide of this.#slides) slide.addEventListener('scroll', () => this.#markEnd(slide), { passive: true });
    window.addEventListener('resize', () => this.current && this.#markEnd(this.current));
    DESKTOP.addEventListener('change', () => this.#mode());
    window.addEventListener('wheel', this.#onWheel, { passive: false });
    window.addEventListener('keydown', this.#onKey);
    window.addEventListener('touchstart', this.#onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.#onTouchMove, { passive: false });
    window.addEventListener('touchend', this.#onTouchEnd, { passive: true });
    window.addEventListener('pointerdown', (e) => Object.assign(this.#pointer, { x: e.clientX, y: e.clientY, time: performance.now() }), { capture: true, passive: true });
    document.addEventListener('click', this.#onLink, { capture: true });
    this.#mode();
  }

  /* ---------- Modes ---------- */

  #mode() {
    if (DESKTOP.matches && !this.active) this.#enter();
    else if (!DESKTOP.matches && this.active) this.#exit();
  }

  #enter() {
    // The deck opens on the first slide, or on the one the address names (#executive-2).
    // The page's own scroll position is ignored: a reload may restore it, but the deck doesn't scroll.
    const named = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    const namedItem = named?.closest<HTMLElement>('.car-item');
    if (namedItem) (namedItem.closest('.carousel') as any)?.carGo?.(namedItem, false);
    const from = (namedItem?.closest<HTMLElement>('.slide') ?? null) ??
      (named?.classList.contains('slide') ? named : named?.querySelector<HTMLElement>('.slide')) ?? this.#slides[0]!;
    try {
      history.scrollRestoration = 'manual';
    } catch {}
    window.scrollTo(0, 0);
    this.active = true;
    document.documentElement.classList.add('deck');
    stage.classList.add('deck-stage');
    OH.revealIO()?.disconnect(); // the deck plays content itself
    this.#show(Math.max(0, this.#slides.indexOf(from)));
    for (const slide of this.#slides) if (slide !== this.current) content.release(slide);
    content.prepare(this.current);
    content.play(this.current);
    OH.fitTitles();
  }

  #exit() {
    this.#stop();
    const slide = this.current;
    this.active = false;
    document.documentElement.classList.remove('deck');
    stage.classList.remove('deck-stage');
    for (const s of this.#slides) {
      s.classList.remove('cur');
      s.inert = false;
      content.release(s);
      if (s.classList.contains('panel')) s.classList.add('in');
    }
    stage.querySelectorAll(':scope > section').forEach((s) => s.classList.remove('cur'));
    slide?.scrollIntoView({ behavior: 'auto' });
    OH.observeReveal();
    OH.fitTitles();
    this.#emit();
  }

  /** Makes slide `i` the visible one: its sector and itself. */
  #show(i: number) {
    this.index = i;
    const slide = this.#slides[i]!;
    const sector = slide.closest<HTMLElement>('#page > section');
    stage.querySelectorAll<HTMLElement>(':scope > section').forEach((s) => s.classList.toggle('cur', s === sector));
    for (const s of this.#slides) {
      const on = s === slide;
      s.classList.toggle('cur', on);
      s.inert = !on; // hidden slides take no focus
    }
    slide.scrollTop = 0;
    this.#markEnd(slide);
    OH.fitTitles(); // a title card sizes its heading to the width it has once shown
    OH.syncUI(slide);
    this.#emit();
  }

  /** Marks a slide whose text has been scrolled to its end (or doesn't scroll): its pyramid shows then. */
  #markEnd = (slide: HTMLElement) => {
    slide.classList.toggle('at-end', slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 24);
  };

  #emit() {
    (window as any).OH.current = this.active ? this.current : OH.slideAtCenter();
    document.dispatchEvent(new CustomEvent('oh:slide', { detail: (window as any).OH.current }));
  }

  /* ---------- Swapping ---------- */

  /**
   * Goes to slide `target` (an index). The transition is the page swap of the
   * slide further down the pair: going down it plays forward, coming back up the
   * same one plays mirrored. `preview` replays the current slide's own swap.
   */
  async go(target: number, { trigger, preview = false, direction }: Go = {}) {
    if (this.busy) return; // no queue: one swap at a time
    target = Math.max(0, Math.min(this.#slides.length - 1, target));
    // On a phone (the hybrid): only moves into another sector play a swap; the rest is plain scrolling.
    const fromIndex = this.active ? this.index : this.#slides.indexOf(OH.slideAtCenter());
    if (!this.active && !preview && !this.crossesSector(fromIndex, target)) return;
    if (target === fromIndex && !preview) return;
    const dir: Direction = direction ?? (target < fromIndex ? 'back' : 'forward');
    const owner = this.#slides[dir === 'forward' ? target : fromIndex]!;
    const requested = motionOf(owner.id).pageSwap;
    const a = this.#slides[fromIndex], b = this.#slides[target];
    const sameHead = a && b && !preview && a.closest('section') === b.closest('section') && a.closest('section')?.id !== 'home' &&
      [a, b].some((x) => x.classList.contains('card')) && [a, b].some((x) => x.classList.contains('intro'));
    const name = REDUCED.matches ? NONE : requested;

    const run = ++this.#run;
    this.busy = true;
    this.#lock();
    const to = this.#slides[target]!;
    const context: TransitionContext = {
      root,
      content: stage,
      transition: name,
      from: new URL('/' + this.#slides[fromIndex]!.id, 'https://deck.local'),
      to: new URL('/' + to.id, 'https://deck.local'),
      direction: dir,
      trigger,
      origin: this.#origin(trigger),
      reducedMotion: REDUCED.matches,
      initial: false,
      entrance: false,
    };
    let swapped = false;
    try {
      if (false && sameHead) {
        // Title card <-> its intro: no cover, the shared background stays; the two slide past each other.
        const old = this.#slides[fromIndex]!;
        this.#swap(fromIndex, target);
        swapped = true;
        old.style.display = 'block';
        stage.classList.add('sliding');
        const sign = dir === 'forward' ? 1 : -1;
        const tl = gsap.timeline({ defaults: { duration: 0.9, ease: 'power3.inOut' } });
        tl.fromTo(old, { yPercent: 0 }, { yPercent: -sign * 100 }, 0).fromTo(to, { yPercent: sign * 100 }, { yPercent: 0 }, 0);
        this.#playing = tl;
        content.play(to, 0.35);
        await tl;
        old.style.display = '';
        stage.classList.remove('sliding');
        gsap.set([old, to], { clearProps: 'transform' });
        return;
      }
      const transition = name === NONE ? undefined : await loadTransition(name);
      if (run !== this.#run) return;
      if (!transition) {
        this.#swap(fromIndex, target);
        swapped = true;
        content.play(to);
        return;
      }
      context.transition = transition.name;
      root.dataset.transition = transition.name;
      root.dataset.direction = dir;
      root.dataset.state = 'leaving';
      await this.#play(transition, 'leave', context);
      if (run !== this.#run) return;
      // Covered.
      const solid = transition.solidCover !== false;
      if (solid) root.replaceChildren();
      root.dataset.cover = solid ? 'solid' : 'custom';
      root.dataset.state = 'covered';
      this.#swap(fromIndex, target);
      swapped = true;
      try {
        transition.prepare?.(context);
      } catch (error) {
        console.error(`[deck] "${transition.name}" failed in prepare().`, error);
      }
      await mediaReady(to, { timeout: MEDIA_TIMEOUT });
      if (run !== this.#run) return;
      // Reveal, with the content coming in at the transition's `entrance`
      // (or once it is over, when the transition brings the page in whole).
      const entrance = transition.entrance ?? 0;
      root.dataset.state = 'entering';
      const done = this.#play(transition, 'enter', context);
      if (entrance !== false) content.play(to, entrance);
      await done;
      if (entrance === false) content.play(to);
    } catch (error) {
      console.error('[deck] swap failed', error);
    } finally {
      if (run === this.#run) {
        if (!swapped) this.#swap(fromIndex, target);
        this.#finish();
      }
    }
  }

  /** Under the cover: the old slide goes, the new one is set up at its starting state. */
  #swap(from: number, to: number) {
    const old = this.#slides[from]!;
    const next = this.#slides[to]!;
    if (old !== next) content.release(old);
    if (this.active) this.#show(to);
    else {
      // Hybrid: jump the page to the new sector's slide while it is covered.
      window.scrollTo({ top: next.getBoundingClientRect().top + window.scrollY, behavior: 'instant' as ScrollBehavior });
      next.dataset.played = '1'; // the phone's scroll-in trigger leaves this entrance to the swap
      OH.syncUI(next);
      this.#emit();
    }
    content.prepare(next);
  }

  /** Whether slides `a` and `b` are in different sectors. */
  crossesSector(a: number, b: number) {
    const sector = (i: number) => this.#slides[i]?.closest('#page > section');
    return a >= 0 && b >= 0 && sector(a) !== sector(b);
  }

  async #play(transition: Transition, step: 'leave' | 'enter', context: TransitionContext) {
    try {
      const result = transition[step](context);
      this.#playing = result instanceof gsap.core.Animation ? result : null;
      await result;
    } catch (error) {
      console.error(`[deck] "${transition.name}" failed in ${step}().`, error);
    }
  }

  #stop() {
    this.#run++;
    this.#playing?.kill();
    this.#playing = null;
    gsap.killTweensOf([...root.querySelectorAll('*'), stage]);
    gsap.set(stage, { clearProps: 'transform,opacity,clipPath' });
    this.#finish();
  }

  #finish() {
    root.replaceChildren();
    root.dataset.state = 'idle';
    delete root.dataset.cover;
    delete root.dataset.transition;
    delete root.dataset.direction;
    this.#playing = null;
    gsap.set(stage, { clearProps: 'transform,opacity,clipPath,filter' });
    this.#unlock();
    this.busy = false;
    const slide = this.current;
    const shown = this.active ? slide : OH.slideAtCenter();
    if (shown) {
      if (!shown.hasAttribute('tabindex')) shown.tabIndex = -1;
      shown.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent('oh:idle'));
  }

  #lock() {
    stage.inert = true;
    document.querySelector('.hdr')?.setAttribute('inert', '');
  }
  #unlock() {
    stage.inert = false;
    document.querySelector('.hdr')?.removeAttribute('inert');
  }

  #origin(trigger?: Element) {
    if (performance.now() - this.#pointer.time < 1000) return { x: this.#pointer.x, y: this.#pointer.y };
    if (trigger) {
      const r = trigger.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: innerWidth / 2, y: innerHeight / 2 };
  }

  /* ---------- Input ---------- */

  /** Inside the Motion Lab, an open menu or the lightbox: input belongs to them. */
  #foreign(target: EventTarget | null) {
    const el = target as Element | null;
    return Boolean(el?.closest?.('.mlab, .nav.open, .sub, .lb'));
  }

  /** Whether the current slide can still scroll its own text that way: then the wheel scrolls it first. */
  #canScroll(dy: number) {
    const slide = this.current;
    if (!slide) return false;
    if (dy > 0) return slide.scrollTop + slide.clientHeight < slide.scrollHeight - 1;
    return slide.scrollTop > 0;
  }

  #onWheel = (event: WheelEvent) => {
    if (!this.active || event.ctrlKey || this.#foreign(event.target)) return;
    const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * innerHeight : event.deltaY;
    if (Math.abs(dy) < Math.abs(event.deltaX)) return; // sideways
    const now = performance.now();
    const gap = now - this.#lastWheel;
    this.#lastWheel = now;
    if (!this.busy && !this.#gestureSpent && this.#canScroll(dy)) {
      this.#scrolledInSlide = true; // read the slide first
      return;
    }
    event.preventDefault();
    // The wheel that just scrolled the slide's text to its edge doesn't also turn the slide:
    // that takes a new gesture, after the wheel goes quiet.
    if (this.#scrolledInSlide && gap < GESTURE_GAP) return;
    this.#scrolledInSlide = false;
    if (this.#gestureSpent) {
      if (gap < GESTURE_GAP) return; // the same gesture's momentum
      this.#gestureSpent = false;
      this.#wheelAcc = 0;
    }
    if (this.busy) return;
    if (gap > GESTURE_GAP) this.#wheelAcc = 0;
    this.#wheelAcc += dy;
    if (Math.abs(this.#wheelAcc) >= WHEEL_STEP) {
      const step = Math.sign(this.#wheelAcc);
      this.#wheelAcc = 0;
      this.#gestureSpent = true; // until the wheel goes quiet
      this.go(this.index + step);
    }
  };

  #onKey = (event: KeyboardEvent) => {
    if (!this.active || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (this.#foreign(event.target)) return;
    const el = event.target as Element | null;
    if (el?.closest?.('input, textarea, select, [contenteditable]')) return;
    const onControl = Boolean(el?.closest?.('a, button'));
    let step = 0;
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey && !onControl)) step = 1;
    else if (event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey && !onControl)) step = -1;
    else if (event.key === 'Home') step = -Infinity;
    else if (event.key === 'End') step = Infinity;
    if (!step) return;
    if (Math.abs(step) === 1 && (event.key.startsWith('Arrow') || event.key === ' ') && this.#canScroll(step)) return;
    event.preventDefault();
    if (this.busy) return;
    this.go(step === -Infinity ? 0 : step === Infinity ? this.#slides.length - 1 : this.index + step);
  };

  #onTouchStart = (event: TouchEvent) => {
    this.#touchY = null;
    this.#touchSpent = false;
    if (!this.active || this.#foreign(event.target)) return;
    this.#touchY = event.touches[0]?.clientY ?? null;
    this.#edgeAtStart = { top: !this.#canScroll(-1), bottom: !this.#canScroll(1) };
  };

  /**
   * Touch: the slide's own text scrolls natively; a swipe that starts with the
   * text already at its edge turns to the next (or previous) slide instead.
   */
  #onTouchMove = (event: TouchEvent) => {
    if (!this.active || this.#touchY === null) return;
    if (this.busy || this.#touchSpent) {
      event.preventDefault();
      return;
    }
    const dy = this.#touchY - (event.touches[0]?.clientY ?? this.#touchY);
    if (Math.abs(dy) < 8) return;
    const step = dy > 0 ? 1 : -1;
    const atEdge = step > 0 ? this.#edgeAtStart.bottom : this.#edgeAtStart.top;
    if (!atEdge || this.#canScroll(step)) return; // scroll the text
    const target = this.index + step;
    if (target < 0 || target >= this.#slides.length) return;
    event.preventDefault();
    this.#touchSpent = true;
    this.go(target);
  };
  #touchSpent = false;
  #onTouchEnd = () => {
    this.#touchY = null;
  };

  /** Menu links and in-page anchors: to the slide (or a sector's first slide). */
  #onLink = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
    if (!link || link.classList.contains('cue')) return;
    // Phone menu: a sector's name opens its list, the menu's own script handles it.
    if (link.matches('.nav-item > a:first-child') && window.matchMedia('(max-width: 900px)').matches) return;
    const id = link.getAttribute('href')!.slice(1);
    const el = id && document.getElementById(id);
    if (!el) return;
    const item = el.closest<HTMLElement>('.car-item');
    if (item) event.preventDefault();
    if (item) { const car = item.closest<HTMLElement>('.carousel') as any; car?.carGo?.(item, car === this.current && this.active); }
    const slide = item ? item.closest<HTMLElement>('.slide') : el.classList.contains('slide') ? el : el.querySelector<HTMLElement>('.slide');
    const i = slide ? this.#slides.indexOf(slide as HTMLElement) : -1;
    if (i < 0) return;
    // Phone: only a link into another sector plays a swap; others scroll as before.
    if (!this.active && !this.crossesSector(this.#slides.indexOf(OH.slideAtCenter()), i)) return;
    event.preventDefault();
    document.getElementById('nav')?.classList.remove('open');
    this.go(i, { trigger: link });
  };
}

export function startDeck() {
  const deck = new Deck();
  OH.deck = deck;
  return deck;
}

export { CUSTOM };
