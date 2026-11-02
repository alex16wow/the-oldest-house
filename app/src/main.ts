/**
 * The Oldest House: motion. The slide controller with Interlude's page swaps,
 * Museum of Motion content effects, and the Motion Lab.
 */
import { startDeck } from './deck';
import { startLab } from './lab';
import * as content from './content';
import { motionOf } from './settings';
import { startHomeGlitch } from './home-glitch';
import { startTitleZooms } from './title-zoom';
import { startBgCycles } from './bg-cycle';
import { startBgDrifts } from './bg-drift';
import { pinBackgrounds } from './pin-bgs';
import { startCarousels } from './carousel';

/** One switch for the Motion Lab: false hides it, the assigned effects keep working. */
const MOTION_LAB = false;

startBgCycles();
startBgDrifts();
startCarousels();
const deck = startDeck();
if (MOTION_LAB) startLab();
startHomeGlitch();
startTitleZooms();
// Effects must capture and wrap their backgrounds before pinning moves them out of the slides.
pinBackgrounds();
document.documentElement.classList.remove('booting');

// On a phone (no deck), a slide with a content effect from the catalog plays it
// as it scrolls into view; the panels' own reveal stays with the site's script.
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      if (deck.active) return;
      for (const entry of entries) {
        const slide = entry.target as HTMLElement;
        const effect = motionOf(slide.id).contentEffect;
        if (effect === 'custom' || effect === 'none') continue;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !slide.dataset.played) {
          slide.dataset.played = '1';
          content.replay(slide);
        } else if (!entry.isIntersecting) {
          delete slide.dataset.played;
          content.release(slide);
        }
      }
    },
    { threshold: [0, 0.5] }
  );
  document.querySelectorAll('#page .slide').forEach((slide) => io.observe(slide));
}
