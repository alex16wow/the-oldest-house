/**
 * v2: a sector's panels as one screen, a carousel. Arrows at the sides, tabs
 * on top, keys ← →, sideways wheel and swipe. Items swap with a short fade and
 * no page transition; each item's background lives in a pinned layer behind.
 */
import { gsap } from 'gsap';
import * as content from './content';

type Car = HTMLElement & { carGo?: (k: number | HTMLElement, animate?: boolean) => void; carIndex?: number };
const OH = () => (window as any).OH;

function setup(car: Car) {
  const items = [...car.querySelectorAll<HTMLElement>(':scope > .car-item')];
  let tabs: HTMLElement[] = [];
  // Item backgrounds: out of the items into one layer (pinned later like any slide background).
  const layer = document.createElement('div');
  layer.className = 'slide-bg car-bgs';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.backgroundImage = 'none';
  const bgs = items.map((it) => {
    const bg = it.querySelector<HTMLElement>(':scope > .slide-bg');
    if (bg) layer.append(bg);
    return bg;
  });
  car.prepend(layer);
  // Decode every picture up front, so none has to be decoded while it slides in.
  car.querySelectorAll('img').forEach((i) => (i as HTMLImageElement).decode?.().catch(() => {}));
  car.querySelectorAll('img[loading="lazy"]').forEach((i) => i.setAttribute('loading', 'eager'));
  car.classList.add('has-bg');
  // The bar that fills per picture: inside the picture's frame.
  items.forEach((it) => {
    const bar = it.querySelector('.drift-bar');
    const media = it.querySelector('.figure .media');
    if (bar && media) media.append(bar);
  });
  // Each item carries its own copy of the tabs above its picture, so they slide with it.
  const bar0 = car.querySelector<HTMLElement>('.car-tabs')!;
  const bars = items.map((it, n) => {
    const b = n ? (bar0.cloneNode(true) as HTMLElement) : bar0;
    it.querySelector('.figure')?.prepend(b);
    return b;
  });
  const bar = bar0;
  const place = (_: HTMLElement) => {};
  // While the heading's letters scramble its lines can rewrap: the text block keeps its resting
  // height (and the heading its lines' height) until the effect is over, so nothing around it jumps.
  const timers = new WeakMap<HTMLElement, number>();
  function playItem(it: HTMLElement, delay: number) {
    const text = it.querySelector<HTMLElement>('.text');
    const h3 = it.querySelector<HTMLElement>('h3');
    if (h3) fixLines(h3);
    if (text && h3) {
      clearTimeout(timers.get(it));
      text.style.height = h3.style.height = '';
      text.style.height = text.offsetHeight + 'px';
      h3.style.height = h3.offsetHeight + 'px';
      h3.style.overflow = 'hidden';
      timers.set(it, window.setTimeout(() => { text.style.height = h3.style.height = h3.style.overflow = ''; }, (delay + 3.2) * 1000));
    }
    content.replay(it, delay);
  }
  let index = 0;
  car.carIndex = 0;

  const isCur = () => OH()?.current === car;
  let anim: gsap.core.Timeline | null = null;
  function go(k: number | HTMLElement, animate = true) {
    let i = typeof k === 'number' ? k : items.indexOf(k);
    const dir = Math.sign(i - index) || 1;
    i = (i + items.length) % items.length;
    if (i === index && animate) return;
    anim?.progress(1);
    const old = items[index]!;
    const next = items[i]!;
    const oldBg = bgs[index];
    const nextBg = bgs[i];
    content.release(old);
    const top = old.offsetTop;
    place(next);
    next.classList.add('on');
    bars.forEach((b) => b.querySelectorAll('.car-tab').forEach((t, n) => t.classList.toggle('on', n === i)));
    index = i;
    car.carIndex = i;
    car.scrollLeft = 0;
    nextBg?.classList.add('on');
    document.dispatchEvent(new CustomEvent('oh:car', { detail: car }));
    if (isCur()) playItem(next, animate ? 0.75 : 0.35); // the heading's effect starts once the slide has landed
    try { history.replaceState(null, '', '#' + next.id); } catch {} // a sandboxed frame may refuse it
    const done = () => {
      if (old !== next) old.classList.remove('on');
      old.style.cssText = '';
      if (oldBg && oldBg !== nextBg) oldBg.classList.remove('on');
      gsap.set([old, next, oldBg, nextBg].filter(Boolean), { clearProps: 'transform' });
      anim = null;
      document.dispatchEvent(new CustomEvent('oh:car', { detail: car }));
    };
    if (!animate || old === next) { car.scrollTop = 0; done(); return; }
    // The old one leaves where it stood; the new one comes in from the other side.
    Object.assign(old.style, { position: 'absolute', top: top - car.scrollTop + 'px', left: '0', right: '0' });
    car.scrollTop = 0;
    const W = car.clientWidth;
    // The newcomer waits off screen until its pictures are decoded and painted (phones paint
    // late otherwise: the picture pops in mid-slide), then everything moves on the GPU.
    const moving = [old, next, oldBg, nextBg].filter(Boolean) as HTMLElement[];
    moving.forEach((el) => (el.style.willChange = 'transform'));
    gsap.set(next, { x: dir * W, force3D: true });
    if (nextBg && nextBg !== oldBg) gsap.set(nextBg, { xPercent: dir * 100, force3D: true });
    anim = gsap.timeline({ paused: true, onComplete: () => { moving.forEach((el) => (el.style.willChange = '')); done(); }, defaults: { ease: 'power3.inOut', force3D: true } });
    const imgs = [...next.querySelectorAll('img'), ...(nextBg ? [nextBg] : [])].filter((x): x is HTMLImageElement => x instanceof HTMLImageElement);
    const ready = Promise.race([Promise.all(imgs.map((i) => i.decode?.().catch(() => {}))), new Promise((r) => setTimeout(r, 250))]);
    const tl = anim;
    ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => tl.play())));
    anim.fromTo(old, { x: 0 }, { x: -dir * W, duration: 0.8 }, 0)
      .fromTo(next, { x: dir * W }, { x: 0, duration: 0.8 }, 0);
    if (oldBg && nextBg && oldBg !== nextBg)
      anim.fromTo(oldBg, { xPercent: 0 }, { xPercent: -dir * 100, duration: 1.15 }, 0)
        .fromTo(nextBg, { xPercent: dir * 100 }, { xPercent: 0, duration: 1.15 }, 0);
  }
  car.carGo = go;
  bgs[0]?.classList.add('on');

  car.querySelectorAll('.car-arrow.prev').forEach((x) => x.addEventListener('click', () => go(index - 1)));
  car.querySelectorAll('.car-arrow.next').forEach((x) => x.addEventListener('click', () => go(index + 1)));
  bars.forEach((b) => b.querySelectorAll('.car-tab').forEach((t, n) => t.addEventListener('click', () => go(n))));

  // Entering the screen: the shown item plays its text effect.
  let was = false;
  document.addEventListener('oh:slide', () => {
    const now = isCur();
    if (now && !was) playItem(items[index]!, 0.35);
    if (!now && was) content.release(items[index]!);
    was = now;
  });

  window.addEventListener('keydown', (e) => {
    if (!isCur() || e.altKey || e.ctrlKey || e.metaKey) return;
    if ((e.target as Element)?.closest?.('input, textarea, select, .mlab')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
  });

  let acc = 0, last = 0, spent = false;
  window.addEventListener('wheel', (e) => {
    if (!isCur() || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const now = performance.now();
    if (now - last > 250) { acc = 0; spent = false; }
    last = now;
    if (spent) return;
    acc += e.deltaX;
    if (Math.abs(acc) > 50) { spent = true; go(index + Math.sign(acc)); }
  }, { passive: true });

  let sx: number | null = null, sy = 0;
  car.addEventListener('touchstart', (e) => { sx = e.touches[0]!.clientX; sy = e.touches[0]!.clientY; }, { passive: true });
  car.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0]!.clientX - sx, dy = e.changedTouches[0]!.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(index + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

/**
 * The heading's lines as the browser balances them at rest, written in as line breaks, so the
 * scramble's own line split (which can't see the balancing) breaks exactly where the rest does.
 */
function fixLines(h: HTMLElement) {
  const text = h.dataset.text ?? (h.dataset.text = h.textContent ?? '');
  h.textContent = text;
  const words = text.split(/\s+/).filter(Boolean);
  h.innerHTML = words.map((w) => `<span>${w.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</span>`).join(' ');
  const lines: string[][] = [];
  let top = -Infinity;
  h.querySelectorAll('span').forEach((sp, i) => {
    const t = (sp as HTMLElement).offsetTop;
    if (t > top + 2) { lines.push([]); top = t; }
    lines[lines.length - 1]!.push(words[i]!);
  });
  h.textContent = '';
  lines.forEach((l, i) => {
    if (i) h.append(document.createElement('br'));
    h.append(l.join(' '));
  });
}

export function startCarousels() {
  document.querySelectorAll<HTMLElement>('#page .carousel').forEach((c) => setup(c as Car));
}
