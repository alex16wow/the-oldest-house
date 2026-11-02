/**
 * A slide's own background stays put while its text scrolls over it: the
 * background layer is taken out of the scrolling slide and set just before it,
 * filling the screen; CSS shows it only while its slide is the current one.
 * Runs after the background effects are set up (they keep their own references).
 */
export function pinBackgrounds() {
  document.querySelectorAll<HTMLElement>('#page .slide').forEach((slide) => {
    const layer = slide.querySelector<HTMLElement>(':scope > .slide-bg, :scope > .title-clip');
    if (!layer) return;
    layer.classList.add('pinned-bg');
    if (layer.dataset.shared && slide.previousElementSibling?.classList.contains('card')) {
      layer.classList.add('shared');
      slide.previousElementSibling.before(layer);
    } else slide.before(layer);
  });
}
