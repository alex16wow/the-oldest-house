/**
 * Content effects: the Museum of Motion exhibits, played once on a slide's own
 * elements as it is shown. The deck (or, on a phone, scrolling) decides when:
 * `prepare()` sets the starting state while the slide is still covered,
 * `play()` runs the entrance, `release()` tears it down when the slide goes.
 *
 * Text exhibits use Museum of Motion's own stages (`motion/stages/text.ts`):
 * each builds its looping demo timeline; here only its entrance plays, then
 * the text rests. Unveil is the exhibit's image reveal, pointed at the slide's
 * main image instead of the demo poster.
 */
import { gsap } from './motion/gsap';
import type { Loop, LoopParams, StageDef } from './motion/stage-core';
import { merge } from './motion/stage-core';
import { TEXT_STAGES, characters, typeBeats, typeSteps } from './motion/stages/text';
import { motionOf } from './settings';

export type Status = 'ok' | 'incompatible' | 'unconnected';
export type Variant = { key: string; label: string; ok: boolean; reason?: string };
export type Effect = {
  key: string;
  name: string;
  group: 'Type' | 'Play' | 'Scroll' | 'Pointer' | 'Drag' | 'Vibes' | 'Site';
  variants: Variant[];
  /** Whether it can run on this slide, and why not. */
  check: (slide: HTMLElement) => { status: Status; reason?: string; target?: string };
  hint?: string;
};

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Targets ---------- */

/** The slide's main heading: what text effects animate. */
export function headingOf(slide: HTMLElement) {
  return slide.querySelector<HTMLElement>('.card-title, .intro h2, .text h3, .finale h2');
}
const headingName = (slide: HTMLElement) =>
  slide.classList.contains('card')
    ? 'большой заголовок сектора'
    : slide.classList.contains('panel')
      ? 'заголовок материала (h3)'
      : 'главный заголовок слайда';
const imageOf = (slide: HTMLElement) => slide.querySelector<HTMLElement>('.figure .media');

/**
 * Speak → Retype on the site: the heading's last word is erased and typed over with
 * each of these in turn, round and round (the exhibit's retype, with our own words).
 */
export const RETYPE_WORDS: Record<string, string[]> = {
  'home-title': ['HOUSE', 'PLACE', 'DOOR', 'SECRET', 'TREE', 'ROOT', 'POWER', 'DREAM'],
};

/* ---------- Catalog ---------- */

const variantsOf = (def: StageDef, off: Record<string, string> = {}): Variant[] =>
  def.variations.map((key, i) => ({ key, label: def.labels[i]!, ok: !off[key], reason: off[key] }));

const textCheck = (slide: HTMLElement) =>
  headingOf(slide)
    ? { status: 'ok' as Status, target: headingName(slide) }
    : { status: 'incompatible' as Status, reason: 'На слайде нет заголовка.' };

const OWN_SCENE =
  'Демонстрация строит собственную сцену (SVG, кнопки или холст). На слайде нет такого элемента, а добавлять чужие объекты нельзя.';
const SCROLL =
  'Работает от непрерывной прокрутки (ScrollTrigger). Внутри полноэкранного слайда её нет. Адаптация возможна только на длинном слайде с собственной прокруткой.';
const DRAG = 'На сайте нет перетаскиваемых элементов.';
const VIBE =
  'Составная демонстрация со своим оформлением (шрифты, цвета, раскладка). Применить её без изменения дизайна сайта нельзя.';

const off = (reason: string, status: Status = 'incompatible') => () => ({ status, reason });

/** Explode's Letters tab is the characters stage's implode; its Page tab builds a demo page. */
const explodeDef = merge([{ label: 'Letters', key: 'letters', def: characters, variation: 'implode' }]);
const TEXT_DEFS: Record<string, StageDef> = { ...TEXT_STAGES, explode: explodeDef };

/** Unveil's wipe directions, from the exhibit's image reveal. */
const OPEN = 'inset(0% 0% 0% 0%)';
const CLOSED: Record<string, string> = {
  up: 'inset(100% 0% 0% 0%)',
  down: 'inset(0% 0% 100% 0%)',
  left: 'inset(0% 0% 0% 100%)',
  right: 'inset(0% 100% 0% 0%)',
};

export const EFFECTS: Effect[] = [
  { key: 'none', name: 'NONE', group: 'Site', variants: [], check: () => ({ status: 'ok', target: 'контент сразу в конечном состоянии' }) },
  {
    key: 'custom',
    name: 'Custom',
    group: 'Site',
    variants: [],
    check: (slide) =>
      slide.classList.contains('panel')
        ? { status: 'ok', target: 'собственное появление сайта: картинка сбоку, текст снизу' }
        : { status: 'incompatible', reason: 'Своё появление есть только у слайдов-материалов.' },
  },
  // Type
  ...(['mask', 'stagger', 'explode', 'slide', 'scramble', 'glitch', 'speak', 'wave'] as const).map(
    (key): Effect => ({
      key,
      name: { mask: 'Mask', stagger: 'Stagger', explode: 'Explode', slide: 'Slide', scramble: 'Scramble', glitch: 'Glitch', speak: 'Speak', wave: 'Wave' }[key],
      group: 'Type',
      variants: variantsOf(TEXT_DEFS[key]!),
      check: textCheck,
      hint:
        key === 'wave'
          ? 'Шрифты сайта статичные, без оси веса: вариации с весом (Weight, Lighten, Hairline, Ink) почти не видны.'
          : undefined,
    })
  ),
  { key: 'count', name: 'Count', group: 'Type', variants: [], check: off('Считает числа, а в заголовках слайдов чисел нет.') },
  // Play
  { key: 'in-and-out', name: 'In and Out', group: 'Play', variants: variantsOf(TEXT_STAGES['in-and-out']!), check: textCheck },
  {
    key: 'unveil',
    name: 'Unveil',
    group: 'Play',
    variants: [
      { key: 'up', label: 'Up', ok: true },
      { key: 'down', label: 'Down', ok: true },
      { key: 'left', label: 'Left', ok: true },
      { key: 'right', label: 'Right', ok: true },
      { key: 'pour', label: 'Pour', ok: false, reason: 'Рисует собственный постер-SVG поверх сцены.' },
      { key: 'arch', label: 'Arch', ok: false, reason: 'Рисует собственный постер-SVG поверх сцены.' },
    ],
    check: (slide) =>
      imageOf(slide)
        ? { status: 'ok', target: 'главное изображение материала' }
        : { status: 'incompatible', reason: 'На этом слайде нет главного изображения.' },
  },
  ...['Path', 'Marquee', 'Cycle', 'Pulse', 'Ambient', 'Shader', 'Pixels', 'Melt', 'Morph', 'Paint', 'Timeline'].map(
    (name): Effect => ({ key: name.toLowerCase(), name, group: 'Play', variants: [], check: off(OWN_SCENE) })
  ),
  { key: 'curtain', name: 'Curtain', group: 'Play', variants: [], check: off('Это шторка поверх всей страницы: на сайте смену экранов ведёт Page swap.') },
  // Scroll
  ...['Reveal', 'Parallax', 'Pinned', 'Stacking', 'Zoom', 'Run', 'Waypoints', 'Header', 'Curl', 'Flight'].map(
    (name): Effect => ({ key: 'scroll-' + name.toLowerCase(), name, group: 'Scroll', variants: [], check: off(SCROLL) })
  ),
  { key: 'pager', name: 'Pager', group: 'Scroll', variants: [], check: off('Сам листает разделы: дублировал бы контроллер слайдов.') },
  // Pointer
  ...['Hover', 'Cursor', 'Attract', 'Distort'].map(
    (name): Effect => ({
      key: 'pointer-' + name.toLowerCase(),
      name,
      group: 'Pointer',
      variants: [],
      check: off('Подходящая цель на сайте есть (ссылки, кнопки или изображения), но рецепт пока не перенесён.', 'unconnected'),
    })
  ),
  ...['Feedback', 'Open', 'Tabs', 'Rearrange', 'Particles', 'Physics', 'Confetti'].map(
    (name): Effect => ({ key: 'pointer-' + name.toLowerCase(), name, group: 'Pointer', variants: [], check: off(OWN_SCENE) })
  ),
  // Drag
  ...['Throw', 'Stack', 'Swipe', 'Turn'].map(
    (name): Effect => ({ key: 'drag-' + name.toLowerCase(), name, group: 'Drag', variants: [], check: off(DRAG) })
  ),
  // Vibes
  ...['Calm', 'Playful', 'Luxury', 'Snappy', 'Glitchy', 'Printed', 'Liquid', 'Immersive'].map(
    (name): Effect => ({ key: 'vibe-' + name.toLowerCase(), name, group: 'Vibes', variants: [], check: off(VIBE) })
  ),
];
export const effectByKey = (key: string) => EFFECTS.find((e) => e.key === key);

/** Variants as they stand on this slide: Retype needs words set for it. */
export function variantsFor(effect: Effect, slide: HTMLElement): Variant[] {
  if (effect.key !== 'speak') return effect.variants;
  return effect.variants.map((v) =>
    v.key === 'retype' && !RETYPE_WORDS[slide.id]
      ? { ...v, ok: false, reason: 'Для этого заголовка не заданы слова для перепечатки (сейчас они есть у THE OLDEST HOUSE).' }
      : v
  );
}

/* ---------- Runs ---------- */

type Run = { play: (delay: number) => void; destroy: () => void; finished: boolean; resplit?: boolean };
const runs = new Map<HTMLElement, Run>();
/** Last error per slide, for the Motion Lab. */
export const errors = new Map<string, string>();

/** The panel's own reveal on or off: `static` shows it at rest, with no transition. */
function panelAtRest(slide: HTMLElement) {
  if (!slide.classList.contains('panel')) return;
  slide.classList.add('static', 'in');
}

function textRun(slide: HTMLElement, def: StageDef, variant: string): Run | null {
  const text = headingOf(slide);
  if (!text) return null;
  const p: LoopParams = def.defaults(variant);
  const loop = def.build(text, p) as Loop;
  const tl = loop.timeline;
  if (slide.classList.contains('car-item')) tl.timeScale(2.5);
  // The demo loops enter, hold, exit. Here: only the entrance, then rest.
  const end = loop.enterEnd ?? tl.duration();
  tl.pause(0);
  let tween: gsap.core.Tween | null = null;
  const run: Run = {
    finished: false,
    resplit: true,
    play(delay) {
      tween = tl.tweenFromTo(0, end, { delay, ease: 'none', onComplete: () => (run.finished = true) });
    },
    destroy() {
      tween?.kill();
      loop.destroy();
    },
  };
  return run;
}

/** Retype, looping through the slide's words. The word sits in a box as wide as the widest, so nothing reflows. */
function retypeRun(slide: HTMLElement, words: string[]): Run | null {
  const text = headingOf(slide);
  // The last word: the title card keeps it in its own line (.l2).
  const host = text?.querySelector<HTMLElement>('.l2') ?? text;
  const tail = host?.lastChild;
  if (!text || !host || !(tail instanceof Text)) return null;
  const original = tail.data;
  const lead = original.slice(0, original.lastIndexOf(' ') + 1);
  const word = document.createElement('span');
  word.className = 'retype-word';
  tail.data = lead;
  const typed = document.createTextNode(words[0]!);
  word.append(typed); // no caret: the word simply types itself
  host.append(word);
  // Pinned to the widest word, so the line never moves while the word changes.
  const widths = words.map((w) => ((typed.data = w), word.getBoundingClientRect().width));
  typed.data = words[0]!;
  const em = parseFloat(getComputedStyle(text).fontSize) || 16;
  // In em, so it follows the heading when the screen is resized.
  Object.assign(word.style, { display: 'inline-block', minWidth: `${Math.max(...widths) / em}em`, textAlign: 'center' });
  text.dataset.words = words.join(' '); // the title fitting makes room for the widest
  (window as any).OH?.fitTitles?.();
  const label = text.getAttribute('aria-label');
  if (!label) text.setAttribute('aria-label', original);

  const speed = 9; // characters a second
  const hold = 2.2; // seconds each word rests
  // Never empty: an empty inline box changes the line's height for a moment.
  const write = (w: string) => (n: number) => (typed.data = w.slice(0, n) || '\u200b');
  const tl = gsap.timeline({ paused: true, repeat: -1 });
  let t = hold;
  words.forEach((w, i) => {
    const next = words[(i + 1) % words.length]!;
    t = typeSteps(tl, t, typeBeats(w, speed * 2), write(w), false);
    t = typeSteps(tl, t + 0.25, typeBeats(next, speed), write(next), true);
    t += hold;
  });
  tl.to({}, { duration: 0 }, t);
  const run: Run = {
    finished: true, // it loops: there is no landing to wait for
    play(delay) {
      tl.delay(delay).play(0);
    },
    destroy() {
      tl.kill();
      word.remove();
      tail.data = original;
      if (!label) text.removeAttribute('aria-label');
      delete text.dataset.words;
    },
  };
  return run;
}

function unveilRun(slide: HTMLElement, variant: string): Run | null {
  const frame = imageOf(slide);
  if (!frame) return null;
  const inner = frame.querySelector<HTMLElement>('img, .ph') ?? frame;
  const duration = 1;
  const tl = gsap.timeline({ paused: true });
  tl.fromTo(frame, { clipPath: CLOSED[variant] ?? CLOSED.up }, { clipPath: OPEN, duration, ease: 'power3.inOut' }, 0).fromTo(
    inner,
    { scale: 1.15, transformOrigin: '50% 50%' },
    { scale: 1, duration: duration * 1.2, ease: 'power2.out' },
    0
  );
  tl.progress(0).pause();
  const run: Run = {
    finished: false,
    play(delay) {
      tl.delay(delay).play(0);
      tl.eventCallback('onComplete', () => (run.finished = true));
    },
    destroy() {
      tl.kill();
      gsap.set([frame, inner], { clearProps: 'clipPath,transform,transformOrigin' });
    },
  };
  return run;
}

/** Tears down the slide's effect, leaving its content at rest. */
export function release(slide: HTMLElement) {
  const run = runs.get(slide);
  if (!run) return;
  runs.delete(slide);
  try {
    run.destroy();
  } catch (error) {
    console.error(error);
  }
}

/**
 * Sets the slide's starting state for its effect (called while it is covered,
 * or just before it is shown). Never leaves content hidden on failure.
 */
export function prepare(slide: HTMLElement) {
  release(slide);
  // The heading keeps its resting height while an effect rebuilds it, so the block around it never shifts.
  const rest = headingOf(slide);
  if (rest) {
    rest.style.minHeight = '';
    if (rest.offsetHeight) rest.style.minHeight = rest.offsetHeight + 'px';
  }
  errors.delete(slide.id);
  const { contentEffect, contentVariant } = motionOf(slide.id);
  const effect = effectByKey(contentEffect);
  const isPanel = slide.classList.contains('panel');

  if (reduced() || !effect || contentEffect === 'none' || effect.check(slide).status !== 'ok') {
    if (isPanel) panelAtRest(slide);
    return;
  }
  if (contentEffect === 'custom') {
    // The site's own reveal: back to its hidden start, played by adding `in`.
    slide.classList.remove('static', 'in');
    void slide.offsetWidth; // the start state is applied before `in` returns
    runs.set(slide, {
      finished: false,
      play(delay) {
        gsap.delayedCall(delay, () => slide.classList.add('in'));
      },
      destroy() {
        gsap.killTweensOf(slide);
        slide.classList.add('in');
      },
    });
    return;
  }
  if (isPanel) panelAtRest(slide);
  const variant =
    contentVariant && variantsFor(effect, slide).some((v) => v.key === contentVariant && v.ok)
      ? contentVariant
      : effect.variants.find((v) => v.ok)?.key ?? '';
  try {
    const run =
      contentEffect === 'unveil'
        ? unveilRun(slide, variant)
        : contentEffect === 'speak' && variant === 'retype'
          ? RETYPE_WORDS[slide.id]
            ? retypeRun(slide, RETYPE_WORDS[slide.id]!)
            : null
          : TEXT_DEFS[contentEffect]
            ? textRun(slide, TEXT_DEFS[contentEffect]!, variant)
            : null;
    if (run) runs.set(slide, run);
  } catch (error) {
    console.error(`[content] "${contentEffect}" failed on ${slide.id}.`, error);
    errors.set(slide.id, String((error as Error)?.message ?? error));
    release(slide);
    // Readable whatever happened.
    const heading = headingOf(slide);
    if (heading) gsap.set(heading, { clearProps: 'opacity,visibility' });
    document.dispatchEvent(new CustomEvent('oh:content-error', { detail: slide.id }));
  }
}

/** Plays the prepared entrance, after `delay` seconds. */
export function play(slide: HTMLElement, delay = 0) {
  runs.get(slide)?.play(Math.max(0, delay));
}

/** Prepares and plays at once: for a slide already on screen (a new choice in the Motion Lab, Replay). */
export function replay(slide: HTMLElement, delay = 0) {
  prepare(slide);
  play(slide, delay);
}

// A finished text split is laid out for the old width: give the text back on resize.
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    for (const [slide, run] of runs) if (run.resplit && run.finished) release(slide);
  }, 150);
});
