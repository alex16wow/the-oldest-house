/**
 * Curtain: a panel rises from the bottom to cover the page, and keeps rising
 * off the top to reveal the next one. The content drifts up with it.
 * On "back" it runs top to bottom.
 *
 * Adapted for The Oldest House: the dark panel carries a large white inverted
 * pyramid in its middle, and opens and closes with a clip (not a scale, which
 * would squash it). It stays in place through the swap (`solidCover: false`).
 */
import { gsap } from 'gsap';
import { defineTransition, panel, sign } from '../interlude/helpers';

// Settings
const LEAVE = { duration: 1, ease: 'power2.inOut' }; // covering
const ENTER = { duration: 1, ease: 'power2.out' }; // revealing
const DRIFT = 100; // px the content moves as it goes and comes

/** The mark in the middle of the curtain: a large white inverted pyramid, the House's sign. */
const MARK = '<svg viewBox="0 0 120 104" aria-hidden="true"><path d="M0 0h120L60 104z" fill="#F1F0EA"/></svg>';

/** The clip that shows all of the panel, or none of it, gone towards one edge. */
const OPEN = 'inset(0% 0% 0% 0%)';
const shut = (edge: 'top' | 'bottom') => (edge === 'bottom' ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)');

function markPanel(context: Parameters<typeof panel>[0]) {
  const el = panel(context, { className: 'curtain-mark' });
  el.innerHTML = MARK;
  return el;
}

export default defineTransition({
  name: 'curtain',
  solidCover: false, // the panel itself covers the page through the swap
  entrance: 0.2, // the page's content starts coming in 0.2 s into enter()

  leave(context) {
    const up = sign(context) > 0; // going back, everything runs the other way
    // The window opens from the bottom edge (the top, going back)…
    const el = markPanel(context);
    return (
      gsap
        .timeline({ defaults: LEAVE })
        .fromTo(el, { clipPath: shut(up ? 'bottom' : 'top') }, { clipPath: OPEN })
        // …while the page drifts away and fades. `0`: at the same time as the panel.
        .to(context.content, { y: up ? -DRIFT : DRIFT, opacity: 0 }, 0)
    );
  },

  enter(context) {
    const up = sign(context) > 0;
    // The same window (a new one on a first load) closes towards the top edge (the bottom, going back)…
    const el = context.root.querySelector<HTMLElement>('.curtain-mark') ?? markPanel(context);
    return (
      gsap
        .timeline({ defaults: ENTER })
        .fromTo(el, { clipPath: OPEN }, { clipPath: shut(up ? 'top' : 'bottom') })
        // …while the new page drifts in after it.
        .fromTo(
          context.content,
          { y: up ? DRIFT : -DRIFT, opacity: 0 },
          { y: 0, opacity: 1, clearProps: 'transform,opacity' },
          0
        )
    );
  },
});
