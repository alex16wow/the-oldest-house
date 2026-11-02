/**
 * Page swap registry: every Interlude transition by name, plus the site's own
 * vertical slide ("custom") and "none". Transitions are loaded on demand; the
 * WebGL ones also download three.js then, from the CDN. Each name's state is
 * kept for the Motion Lab: idle, loading, ready or error.
 */
import type { Transition } from './interlude/types';
import curtain from './transitions/curtain';
import wipe from './transitions/wipe';
import columns from './transitions/columns';
import circle from './transitions/circle';
import typewriter from './transitions/typewriter';
import stack from './transitions/stack';
import slideOver from './transitions/slide-over';
import peel from './transitions/peel';
import slices from './transitions/slices';
import frame from './transitions/frame';
import carousel from './transitions/carousel';
import cube from './transitions/cube';
import corner from './transitions/corner';
import tear from './transitions/tear';
import createDither from './transitions/dither';
import createDissolve from './transitions/dissolve';
import createInk from './transitions/ink';
import createSpiral from './transitions/spiral';
import createVelvet from './transitions/velvet';
import createParticles from './transitions/particles';
import createChannel from './transitions/channel';
import custom from './custom-slide';

export const NONE = 'none';
export const CUSTOM = 'custom';

/** The names in the order of the Interlude demo, as the Motion Lab lists them. */
export const PAGE_SWAPS: { key: string; label: string; webgl?: boolean }[] = [
  { key: NONE, label: 'NONE' },
  { key: 'curtain', label: 'Curtain' },
  { key: 'wipe', label: 'Wipe' },
  { key: 'columns', label: 'Columns' },
  { key: 'circle', label: 'Circle' },
  { key: 'typewriter', label: 'Typewriter' },
  { key: 'stack', label: 'Stack' },
  { key: 'slide-over', label: 'Slide-over' },
  { key: 'peel', label: 'Peel' },
  { key: 'slices', label: 'Slices' },
  { key: 'frame', label: 'Frame' },
  { key: 'carousel', label: 'Carousel' },
  { key: 'cube', label: 'Cube' },
  { key: 'corner', label: 'Corner' },
  { key: 'tear', label: 'Tear' },
  { key: 'dither', label: 'Dither', webgl: true },
  { key: 'dissolve', label: 'Dissolve', webgl: true },
  { key: 'ink', label: 'Ink', webgl: true },
  { key: 'spiral', label: 'Spiral', webgl: true },
  { key: 'velvet', label: 'Velvet', webgl: true },
  { key: 'particles', label: 'Particles', webgl: true },
  { key: 'channel', label: 'Channel', webgl: true },
];

const loaders: Record<string, () => Transition | Promise<Transition>> = {
  [CUSTOM]: () => custom,
  curtain: () => curtain,
  wipe: () => wipe,
  columns: () => columns,
  circle: () => circle,
  typewriter: () => typewriter,
  stack: () => stack,
  'slide-over': () => slideOver,
  peel: () => peel,
  slices: () => slices,
  frame: () => frame,
  carousel: () => carousel,
  cube: () => cube,
  corner: () => corner,
  tear: () => tear,
  dither: createDither,
  dissolve: createDissolve,
  ink: createInk,
  spiral: createSpiral,
  velvet: createVelvet,
  particles: createParticles,
  channel: createChannel,
};

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';
export const loadState = new Map<string, LoadState>();
const loaded = new Map<string, Promise<Transition | undefined>>();

const notify = () => document.dispatchEvent(new CustomEvent('oh:swap-state'));

/** Loads a transition by name; `undefined` for none or on failure (the deck then swaps instantly). */
export function loadTransition(name: string): Promise<Transition | undefined> {
  if (name === NONE || !loaders[name]) return Promise.resolve(undefined);
  let pending = loaded.get(name);
  if (pending) return pending;
  loadState.set(name, 'loading');
  notify();
  pending = Promise.resolve()
    .then(() => loaders[name]!())
    .then((transition) => {
      loadState.set(name, 'ready');
      notify();
      return transition;
    })
    .catch((error) => {
      console.error(`[deck] Couldn't load the "${name}" transition.`, error);
      loadState.set(name, 'error');
      loaded.delete(name); // a later try may succeed
      notify();
      return undefined;
    });
  loaded.set(name, pending);
  return pending;
}
