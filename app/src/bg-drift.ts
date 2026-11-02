/**
 * "Double zoom" (as it's called in this project): a material slide whose
 * background and framed picture move against each other.
 *
 * - The background photo slowly zooms away from you and back (yoyo).
 * - The frame next to the text is a two-picture slider: the picture zooms in to
 *   its limit, then the other one crossfades in over it, starting from rest and
 *   zooming in, and so on, alternating. The frame itself never moves (it clips).
 * - A blurred, faint copy of the framed picture lies over the background and
 *   follows it exactly: same zoom, same crossfade.
 * - Faint vertical lines lie still over it all.
 * Runs only while the slide is shown; each visit starts from the first picture.
 */
import { gsap } from 'gsap';

const SWING = 9; // seconds: the background's zoom one way; also one picture's turn
const FADE = 1.2; // crossfade between the two pictures
const BASE: [number, number] = [1.22, 1]; // the photo: from close to further away, and back
const GHOST: [number, number] = [1, 1.3]; // each blurred copy: zooms in through its turn
const FRAME: [number, number] = [1, 1.18]; // each framed picture: with its copy
const GHOST_OPACITY = 0.33;

type Bg = HTMLElement & { ghost?: string; second?: string };

/**
 * The ghost's blur, baked into a small copy of the picture once, instead of a live CSS blur:
 * a blurred full-screen layer that fades and zooms flickers on phones. Drawn small and
 * stretched back up, it reads as the same soft blur and costs nothing to animate.
 */
function blurInto(el: HTMLElement, url: string) {
  const img = new Image();
  img.onload = () => {
    try {
      const w = 160;
      const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.filter = 'blur(1.2px)';
      ctx.drawImage(img, 0, 0, w, h);
      el.style.backgroundImage = `url("${c.toDataURL('image/jpeg', 0.85)}")`;
      el.classList.add('baked');
    } catch {
      // Left as is: the CSS blur stays on.
    }
  };
  img.src = url;
}

function setup(bg: Bg) {
  const slide = bg.closest<HTMLElement>('.slide');
  if (!slide || !bg.ghost) return;
  const base = document.createElement('div');
  base.className = 'drift-base';
  base.style.backgroundImage = bg.style.backgroundImage;
  bg.style.backgroundImage = 'none';
  const urls = [bg.ghost, bg.second].filter(Boolean) as string[];
  const ghosts = urls.map((url) => {
    const g = document.createElement('div');
    g.className = 'drift-ghost';
    g.style.backgroundImage = `url("${url}")`;
    blurInto(g, url);
    return g;
  });
  // Faint vertical lines over it, still while the pictures move: the sector backgrounds' grid.
  const lines = document.createElement('div');
  lines.className = 'drift-lines';
  bg.append(base, ...ghosts, lines);

  // The frame: its picture, and the second one stacked on it.
  const scope = bg.closest<HTMLElement>('.car-item') ?? slide;
  const first = scope.querySelector<HTMLImageElement>('.figure .media img');
  const frames: HTMLImageElement[] = [];
  if (first) {
    first.classList.add('drift-frame');
    frames.push(first);
    if (urls[1]) {
      const img = first.cloneNode() as HTMLImageElement;
      img.src = urls[1];
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      first.after(img);
      frames.push(img);
    }
  }

  // The caption under the frame names the picture shown (EX-01.1, EX-01.2), retyped at each change,
  // and a bar on its other side fills until the next change.
  const caption = scope.querySelector<HTMLElement>('.figcap > span');
  const code = caption?.textContent?.trim() ?? '';
  let fill: HTMLElement | null = null;
  if (caption && frames.length > 1) {
    caption.textContent = `${code}.1`;
    const bar = document.createElement('span');
    bar.className = 'drift-bar';
    bar.setAttribute('aria-hidden', 'true');
    fill = document.createElement('i');
    bar.append(fill);
    caption.parentElement!.append(bar);
  }
  let typing: gsap.core.Timeline | null = null;
  function retype(text: string) {
    if (!caption) return;
    typing?.kill();
    const from = caption.textContent ?? '';
    // Erase it all, then type the new label.
    const keep = 0; // the whole label is erased and typed again
    typing = gsap.timeline();
    for (let n = from.length - 1; n >= keep; n--) typing.add(() => (caption.textContent = from.slice(0, n) || '\u200b'), `+=0.035`);
    for (let n = keep + 1; n <= text.length; n++) typing.add(() => (caption.textContent = text.slice(0, n)), `+=0.055`);
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baseTl = gsap.timeline({ repeat: -1, yoyo: true, paused: true });
  baseTl.fromTo(base, { scale: BASE[0], force3D: true }, { scale: BASE[1], duration: SWING, ease: 'sine.inOut' });

  let z = 1;
  let timer: gsap.core.Tween | null = null;
  const tweens: gsap.core.Tween[] = [];
  const count = Math.max(ghosts.length, frames.length);

  /** Picture `i` takes its turn: on top, fading in (unless first), zooming in from rest. */
  function turn(i: number, fade: boolean) {
    const pair = [ghosts[i], frames[i]].filter(Boolean) as HTMLElement[];
    const others = [...ghosts, ...frames].filter((el) => !pair.includes(el));
    z += 1;
    pair.forEach((el) => (el.style.zIndex = String(z)));
    const length = SWING + FADE; // it keeps zooming while the next one fades in over it
    if (fill) tweens.push(gsap.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: SWING, ease: 'none' }));
    if (frames.length > 1 && fade) retype(`${code}.${i + 1}`);
    if (ghosts[i]) tweens.push(gsap.fromTo(ghosts[i]!, { scale: GHOST[0], force3D: true }, { scale: GHOST[1], duration: length, ease: 'none' }));
    if (frames[i]) tweens.push(gsap.fromTo(frames[i]!, { scale: FRAME[0], force3D: true }, { scale: FRAME[1], duration: length, ease: 'none' }));
    const shown = (el: HTMLElement) => (el.classList.contains('drift-ghost') ? GHOST_OPACITY : 1);
    if (fade) pair.forEach((el) => tweens.push(gsap.fromTo(el, { opacity: 0 }, { opacity: shown(el), duration: FADE, ease: 'power1.inOut' })));
    // The blurred copies are see-through, so the old one would show through the new: it fades out as the new one fades in.
    if (fade) others.filter((el) => el.classList.contains('drift-ghost')).forEach((el) => tweens.push(gsap.to(el, { opacity: 0, duration: FADE, ease: 'power1.inOut' })));
    else pair.forEach((el) => gsap.set(el, { opacity: shown(el) }));
    timer = gsap.delayedCall(FADE, () => {
      gsap.set(others, { opacity: 0 }); // covered: put away until their next turn
      if (count < 2) return;
      timer = gsap.delayedCall(SWING - FADE, () => turn((i + 1) % count, true));
    });
  }

  function stop() {
    timer?.kill();
    typing?.kill();
    tweens.splice(0).forEach((t) => t.kill());
    baseTl.pause();
  }

  let on = false;
  const sync = () => {
    const now = (window as any).OH?.current === slide && !document.hidden && (scope === slide || scope.classList.contains('on'));
    if (now === on) return;
    on = now;
    stop();
    if (!on) return;
    gsap.set([...ghosts, ...frames], { opacity: 0, scale: 1 });
    if (caption && frames.length > 1) caption.textContent = `${code}.1`;
    if (fill) gsap.set(fill, { scaleX: 0 });
    if (reduced) {
      gsap.set(frames[0] ?? [], { opacity: 1 });
      gsap.set(ghosts[0] ?? [], { opacity: GHOST_OPACITY });
      return;
    }
    baseTl.restart();
    turn(0, false);
  };
  document.addEventListener('oh:slide', sync);
  document.addEventListener('oh:car', sync);
  document.addEventListener('visibilitychange', sync);
  gsap.set(frames.slice(1), { opacity: 0 });
  gsap.set(frames[0] ?? [], { opacity: 1 });
  gsap.set(ghosts[0] ?? [], { opacity: GHOST_OPACITY });
  sync();
}

export function startBgDrifts() {
  document.querySelectorAll<HTMLElement>('#page .slide-bg').forEach((bg) => setup(bg as Bg));
}
