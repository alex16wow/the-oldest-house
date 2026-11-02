/**
 * A slide whose background is several pictures in turn (`bgs` on its .slide-bg):
 * each pans slowly sideways behind the text, a parallax drift, then crossfades
 * to the next, round and round. The pictures are wider than the screen, so the
 * pan never shows an edge.
 */
import { gsap } from 'gsap';

const HOLD = 6; // seconds each picture shows
const FADE = 0.9; // crossfade, inside the hold
const PAN = 6; // % of the screen's width each picture drifts (the layer is 16% wider)

function setup(bg: HTMLElement & { bgs?: string[] }) {
  const slide = bg.closest<HTMLElement>('.slide');
  const pair = [slide, bg.dataset.shared ? slide?.previousElementSibling : null].filter(Boolean);
  const urls = bg.bgs;
  if (!slide || !urls || urls.length < 2) return;
  bg.style.backgroundImage = 'none';
  const layers = urls.map((url) => {
    const el = document.createElement('div');
    el.className = 'bg-pan';
    el.style.backgroundImage = `url("${url}")`;
    bg.append(el);
    return el;
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Not one repeating timeline: its loop point would jump the first picture back to its
  // start. Each turn brings the next picture in on top, fading in while it starts its own
  // drift, and the one beneath keeps drifting until it is covered.
  let index = 0;
  let z = 1;
  let timer: gsap.core.Tween | null = null;
  const tweens: gsap.core.Tween[] = [];

  function show(i: number, fade: boolean) {
    const el = layers[i]!;
    const dir = i % 2 ? -1 : 1;
    el.style.zIndex = String(++z);
    tweens.push(gsap.fromTo(el, { xPercent: (-PAN / 2) * dir, force3D: true }, { xPercent: (PAN / 2) * dir, duration: HOLD + FADE * 2, ease: 'none' }));
    if (fade) tweens.push(gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: FADE, ease: 'power1.inOut' }));
    else gsap.set(el, { opacity: 1 });
    // The one beneath fades out once covered, ready to come back later.
    const below = layers.filter((l) => l !== el);
    timer = gsap.delayedCall(FADE, () => {
      gsap.set(below, { opacity: 0 });
      timer = gsap.delayedCall(HOLD - FADE, () => {
        index = (i + 1) % layers.length;
        show(index, true);
      });
    });
  }
  function stop() {
    timer?.kill();
    tweens.splice(0).forEach((t) => t.kill());
  }

  let on = false;
  const sync = () => {
    const now = pair.includes((window as any).OH?.current) && !document.hidden;
    if (now === on) return;
    on = now;
    stop();
    if (!on) return;
    gsap.set(layers, { opacity: 0, xPercent: 0 });
    index = 0;
    if (reduced) return void gsap.set(layers[0]!, { opacity: 1 });
    show(0, false);
  };
  document.addEventListener('oh:slide', sync);
  document.addEventListener('visibilitychange', sync);
  gsap.set(layers, { opacity: (i: number) => (i ? 0 : 1) });
  sync();
}

export function startBgCycles() {
  document.querySelectorAll<HTMLElement>('#page .slide-bg').forEach((bg) => setup(bg as any));
}
