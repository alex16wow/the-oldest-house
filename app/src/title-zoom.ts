/**
 * Every sector's title card (but the first screen, which has its own, in
 * home-glitch.ts): the background closes in at the first screen's pace, and
 * at the end of each zoom one glitch breaks it apart, snaps it back to the
 * start, and it closes in again. No video under it: the pieces just jump.
 *
 * The glitch is the first screen's, from Museum of Motion's Glitch stage:
 * clipped copies in bands and blocks, jumping in steps at twelve a second.
 */
import { gsap } from 'gsap';

const ZOOM = 18; // seconds, as on the first screen
const ZOOM_TO = 1.3;
const STEPS = 13;
const RATE = 12;
const SHIFT = 0.035;

type Cell = [number, number, number, number];
const cellGrid = (rows: number, cols: number): Cell[] =>
  Array.from({ length: rows * cols }, (_, k) => {
    const r = Math.floor(k / cols);
    const c = k % cols;
    return [(r / rows) * 100, 100 - ((c + 1) / cols) * 100, 100 - ((r + 1) / rows) * 100, (c / cols) * 100];
  });
const rnd = gsap.utils.random;

function setup(card: HTMLElement) {
  // The card's own background, or its sector's (shared with the sector's other slides).
  const target =
    card.querySelector<HTMLElement>(':scope > .slide-bg') ??
    card.closest('#page > section')?.querySelector<HTMLElement>('.sector-bg .media');
  if (!target) return;

  // The background and its glitch copies zoom together, inside one box.
  const zoom = document.createElement('div');
  zoom.className = 'title-zoom';
  // A still box around it clips the zoom: a scaled layer would otherwise make the slide scroll.
  const clip = document.createElement('div');
  clip.className = 'title-clip';
  target.replaceWith(clip);
  clip.append(zoom);
  zoom.append(target);
  const layers = [...cellGrid(7, 1), ...cellGrid(3, 5)].map(([t, r, b, l]) => {
    const el = target.cloneNode(true) as HTMLElement;
    el.removeAttribute('id');
    el.setAttribute('aria-hidden', 'true');
    el.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    el.querySelectorAll('button, a').forEach((n) => n.remove());
    el.classList.add('title-cell');
    Object.assign(el.style, {
      clipPath: `inset(calc(${t}% - 0.5px) calc(${r}% - 0.5px) calc(${b}% - 0.5px) calc(${l}% - 0.5px))`,
      visibility: 'hidden',
    });
    zoom.append(el);
    return el;
  });

  let running: gsap.core.Timeline | null = null;
  function glitch() {
    if (running) running.progress(1);
    const width = zoom.clientWidth;
    const jump = (scale: number) => rnd(-1, 1) * SHIFT * width * scale;
    layers.forEach((el) => (el.style.visibility = 'visible'));
    const at = (i: number) => i / RATE;
    const tl = gsap.timeline({
      onComplete: () => {
        layers.forEach((el) => (el.style.visibility = 'hidden'));
        running = null;
      },
    });
    for (let i = 0; i < STEPS; i++) {
      const phase = Math.sin((i / (STEPS - 1)) * Math.PI);
      layers.forEach((el) => {
        const moved = Math.random() < 0.25 + phase * 0.45;
        tl.set(
          el,
          {
            x: moved ? jump(phase + 0.15) : 0,
            y: moved ? jump(0.15) : 0,
            filter: moved && Math.random() < 0.3 ? 'saturate(0) contrast(1.6)' : 'none',
          },
          at(i)
        );
      });
    }
    // At its height, when the picture is most broken, the zoom snaps back.
    tl.add(() => gsap.set(zoom, { scale: 1, force3D: true }), at(Math.floor(STEPS / 2)));
    tl.set(layers, { x: 0, y: 0, filter: 'none' }, at(STEPS));
    running = tl;
  }

  const half = STEPS / RATE / 2;
  const cycle = gsap.timeline({ repeat: -1, paused: true });
  cycle.fromTo(zoom, { scale: 1, force3D: true }, { scale: ZOOM_TO, duration: ZOOM, ease: 'none', force3D: true }, 0);
  cycle.call(glitch, [], ZOOM - half);

  let on = false;
  const sync = () => {
    const now = (window as any).OH?.current === card && !document.hidden;
    if (now === on) return;
    on = now;
    if (on) cycle.restart();
    else {
      // The background may be the sector's, seen on its other slides: back to rest.
      cycle.pause();
      running?.progress(1);
      gsap.set(zoom, { scale: 1, force3D: true });
    }
  };
  document.addEventListener('oh:slide', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
}

export function startTitleZooms() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll<HTMLElement>('#page .card.slide').forEach((card) => {
    if (card.id !== 'home-title') setup(card);
  });
}
