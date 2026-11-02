/**
 * The first screen's background: the building slowly zooms in and out, and
 * now and then it glitches apart, the red-ink video showing through the gaps
 * for a moment, like a nightmare flashing past.
 *
 * The break-up follows Museum of Motion's Glitch stage (split-entrances'
 * glitchIn): clipped copies of the picture in a grid of bands and blocks,
 * jumping in steps at twelve a second, then snapping clean. Here some copies
 * also drop out, so the video underneath shows.
 *
 * The video is a ping-pong loop (played forward, then backward, in the file
 * itself), so it never jumps from its end to its start, and it starts from a
 * random point before each glitch.
 */
import { gsap } from 'gsap';

import { NIGHTMARE as VIDEO } from './nightmare';
/** One zoom: the building closes in for this long (s), then the last glitch snaps it back and it starts again. */
const ZOOM = 18;
/** How close it comes, as a scale. */
const ZOOM_TO = 1.3;
/** Glitches per zoom, evenly spaced; the last one hides the snap back. */
const GLITCHES = 3;
const STEPS = 13; // steps in one glitch, at RATE a second: about a second
const RATE = 12; // steps a second, as in the Glitch stage
const SHIFT = 0.035; // largest jump, as a share of the screen's width

type Cell = [number, number, number, number]; // inset: top, right, bottom, left (%)
/** From the Glitch stage: a grid of clipped cells. */
const cellGrid = (rows: number, cols: number): Cell[] =>
  Array.from({ length: rows * cols }, (_, k) => {
    const r = Math.floor(k / cols);
    const c = k % cols;
    return [(r / rows) * 100, 100 - ((c + 1) / cols) * 100, 100 - ((r + 1) / rows) * 100, (c / cols) * 100];
  });
const rnd = gsap.utils.random;

export function startHomeGlitch() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const section = document.getElementById('home');
  const media = section?.querySelector<HTMLElement>('.sector-bg .media');
  const img = media?.querySelector<HTMLImageElement>('img');
  if (!section || !media || !img) return;

  // The video, under the picture.
  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto', src: VIDEO });
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.className = 'home-nightmare';
  media.prepend(video);

  // The picture and its glitch copies zoom together.
  const zoom = document.createElement('div');
  zoom.className = 'home-zoom';
  img.replaceWith(zoom);
  zoom.append(img);

  const position = getComputedStyle(img).objectPosition || '50% 50%';
  const src = img.currentSrc || img.src;
  const cells = [...cellGrid(7, 1), ...cellGrid(3, 5)]; // bands and blocks

  // The copies are built once and kept hidden: building twenty-odd full-screen layers
  // on every glitch would cost a dropped frame just as it starts.
  const layers = cells.map(([t, r, b, l]) => {
    const el = document.createElement('div');
    el.className = 'home-cell';
    Object.assign(el.style, {
      backgroundImage: `url("${src}")`,
      backgroundPosition: position,
      clipPath: `inset(calc(${t}% - 0.5px) calc(${r}% - 0.5px) calc(${b}% - 0.5px) calc(${l}% - 0.5px))`,
      visibility: 'hidden',
    });
    zoom.append(el);
    return el;
  });

  let running: gsap.core.Timeline | null = null;
  // Only while the title card itself is on screen (the intro covers this background with its own).
  const onHome = () => (window as any).OH?.current?.id === 'home-title';

  /** One glitch. `reset` runs at its height, when the picture is most broken. */
  function glitch(reset?: () => void) {
    if (running) running.progress(1);
    const width = media!.clientWidth;
    const jump = (scale: number) => rnd(-1, 1) * SHIFT * width * scale;
    if (video.duration) video.currentTime = rnd(0, video.duration - 2);
    video.play().catch(() => {});

    layers.forEach((el) => (el.style.visibility = 'visible'));

    const at = (i: number) => i / RATE;
    const tl = gsap.timeline({
      onComplete: () => {
        layers.forEach((el) => (el.style.visibility = 'hidden'));
        img.style.opacity = '';
        running = null;
      },
    });
    tl.set(img, { opacity: 0 }, 0); // the copies stand in for it
    for (let i = 0; i < STEPS; i++) {
      // Builds up, breaks open in the middle, settles at the end.
      const phase = Math.sin((i / (STEPS - 1)) * Math.PI);
      layers.forEach((el) => {
        const moved = Math.random() < 0.25 + phase * 0.45;
        const gone = Math.random() < phase * 0.55; // a hole: the video shows here
        tl.set(
          el,
          {
            x: moved ? jump(phase + 0.15) : 0,
            y: moved ? jump(0.15) : 0,
            opacity: gone ? 0 : 1,
            filter: moved && Math.random() < 0.3 ? 'saturate(0) contrast(1.6)' : 'none',
          },
          at(i)
        );
      });
    }
    if (reset) tl.add(reset, at(Math.floor(STEPS / 2)));
    tl.set(layers, { x: 0, y: 0, opacity: 1, filter: 'none' }, at(STEPS));
    running = tl;
  }

  // The zoom only ever closes in. Glitches are tied to it: one every third, and the
  // last lands on the end of the zoom, where the building snaps back and closes in again.
  const half = STEPS / RATE / 2;
  const cycle = gsap.timeline({ repeat: -1, paused: true });
  // force3D keeps it on the GPU at sub-pixel precision: a slow zoom otherwise crawls in pixel steps.
  cycle.fromTo(zoom, { scale: 1, force3D: true }, { scale: ZOOM_TO, duration: ZOOM, ease: 'none', force3D: true }, 0);
  for (let k = 1; k < GLITCHES; k++) cycle.call(() => glitch(), [], (ZOOM * k) / GLITCHES - half);
  cycle.call(() => glitch(() => gsap.set(zoom, { scale: 1, force3D: true })), [], ZOOM - half);

  // The video only runs while the first screen can be seen.
  const sync = () => {
    if (onHome() && !document.hidden) {
      video.play().catch(() => {});
      cycle.play();
    } else {
      video.pause();
      cycle.pause();
    }
  };
  document.addEventListener('oh:slide', sync);
  document.addEventListener('visibilitychange', sync);
  video.addEventListener('loadedmetadata', () => (video.currentTime = rnd(0, video.duration)), { once: true });
  sync();
}
