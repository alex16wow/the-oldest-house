/**
 * The site's own swap ("Custom" in the Motion Lab): the movement the slides had
 * before the deck, a vertical page turn. Both slides move together: a still
 * copy of the old one slides out while the real new one slides in behind it.
 * Written with Interlude's API, so the deck plays it like any other transition.
 */
import { gsap } from 'gsap';
import { defineTransition, sign } from './interlude/helpers';
import { keepOldPage, oldPage } from './interlude/old-page';

const MOVE = { duration: 0.85, ease: 'power3.inOut' };

export default defineTransition({
  name: 'custom',
  solidCover: false, // the copy of the old slide covers until `enter`
  entrance: 0.35, // the new slide's content comes in as it lands

  // Nothing moves yet: the copy simply stands in for the old slide during the swap.
  leave(context) {
    keepOldPage(context);
  },

  enter(context) {
    const old = oldPage(context);
    const s = sign(context);
    const tl = gsap.timeline();
    if (old) tl.fromTo(old, { yPercent: 0 }, { yPercent: -100 * s, ...MOVE }, 0);
    tl.fromTo(
      context.content,
      { yPercent: 100 * s },
      { yPercent: 0, ...MOVE, clearProps: 'transform' },
      0
    );
    return tl;
  },
});
