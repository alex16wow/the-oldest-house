/**
 * One source of truth for every slide's motion: its page swap (the transition
 * that brings you onto it) and its content effect. Keyed by the slide's stable
 * id (`executive-2`, not its position).
 *
 * Order of precedence: the site's defaults < CONFIG (pinned in code) < local
 * edits from the Motion Lab (this browser only, in localStorage).
 */
export type SlideMotion = {
  pageSwap: string;
  contentEffect: string;
  contentVariant: string | null;
};

/** Pinned assignments, by slide id. Paste an exported config's `slides` here to make it the site's own. */
export const CONFIG: Record<string, Partial<SlideMotion>> = {
  'home-title': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'retype' },
  'home-intro': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'executive-title': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'executive-intro': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'executive-1': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'executive-2': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'executive-3': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'maintenance-title': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'maintenance-intro': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'maintenance-1': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'maintenance-2': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'maintenance-3': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'research-title': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'research-intro': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'research-1': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'research-2': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'research-3': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'containment-title': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'containment-intro': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'containment-1': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'containment-2': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'containment-3': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'astral-title': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'astral-intro': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
  'astral-1': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'astral-2': { pageSwap: 'curtain', contentEffect: 'scramble', contentVariant: null },
  'executive-items': { pageSwap: 'curtain', contentEffect: 'none', contentVariant: null },
  'maintenance-items': { pageSwap: 'curtain', contentEffect: 'none', contentVariant: null },
  'research-items': { pageSwap: 'curtain', contentEffect: 'none', contentVariant: null },
  'containment-items': { pageSwap: 'curtain', contentEffect: 'none', contentVariant: null },
  'astral-items': { pageSwap: 'curtain', contentEffect: 'none', contentVariant: null },
  'astral-finale': { pageSwap: 'curtain', contentEffect: 'speak', contentVariant: 'type' },
};

const STORAGE_KEY = 'the-oldest-house:motion-lab';
const SCHEMA = 1;

/** What the site does without any assignment: the vertical slide, and panels' own reveal. */
function siteDefault(slide: HTMLElement): SlideMotion {
  return {
    pageSwap: 'custom',
    contentEffect: slide.classList.contains('panel') ? 'custom' : 'none',
    contentVariant: null,
  };
}

let local: Record<string, Partial<SlideMotion>> = {};
/** When CONFIG changes, local edits of the slides it pins give way to it once (a new pinned version wins). */
const CONFIG_STAMP = JSON.stringify(CONFIG);
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (saved?.schema === SCHEMA && saved.slides) local = saved.slides;
  if (saved && saved.config !== CONFIG_STAMP) {
    for (const id of Object.keys(CONFIG)) delete local[id];
    save();
  }
} catch {
  // No storage (private window, blocked): the defaults apply.
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: SCHEMA, config: CONFIG_STAMP, slides: local }));
  } catch {
    // Not saved: the edit still applies until the page is reloaded.
  }
}

const slideById = (id: string) => document.getElementById(id) as HTMLElement | null;

/** The base for a slide, before local edits. */
export function baseOf(id: string): SlideMotion {
  const slide = slideById(id);
  return { ...(slide ? siteDefault(slide) : siteDefault(document.body)), ...CONFIG[id] } as SlideMotion;
}

export function motionOf(id: string): SlideMotion {
  return { ...baseOf(id), ...local[id] } as SlideMotion;
}

export function setMotion(id: string, patch: Partial<SlideMotion>) {
  local[id] = { ...local[id], ...patch };
  save();
  document.dispatchEvent(new CustomEvent('oh:settings', { detail: id }));
}

export function resetMotion(id: string) {
  delete local[id];
  save();
  document.dispatchEvent(new CustomEvent('oh:settings', { detail: id }));
}

export const hasLocalEdits = (id: string) => Boolean(local[id] && Object.keys(local[id]).length);

/** Every slide's current assignment, for "Export config". */
export function exportConfig() {
  const slides: Record<string, SlideMotion> = {};
  for (const slide of document.querySelectorAll<HTMLElement>('#page .slide')) slides[slide.id] = motionOf(slide.id);
  return JSON.stringify({ project: 'the-oldest-house', schema: SCHEMA, slides }, null, 2);
}
