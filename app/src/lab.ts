/**
 * Motion Lab: a panel for trying page swaps and content effects on the slide
 * in view. It edits the same settings the deck and the content effects read
 * (`settings.ts`), stored in this browser only.
 */
import { EFFECTS, effectByKey, errors, headingOf, replay as replayContent, variantsFor, type Effect } from './content';
import { CUSTOM, NONE, PAGE_SWAPS, loadState, loadTransition } from './registry';
import { baseOf, exportConfig, hasLocalEdits, motionOf, resetMotion, setMotion } from './settings';

const OH = (window as any).OH;
const GROUPS: Effect['group'][] = ['Type', 'Play', 'Scroll', 'Pointer', 'Drag', 'Vibes'];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function startLab() {
  const btn = document.createElement('button');
  btn.className = 'mlab-btn';
  btn.type = 'button';
  btn.textContent = 'Motion Lab';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'mlab');

  const panel = document.createElement('section');
  panel.className = 'mlab';
  panel.id = 'mlab';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Motion Lab');
  document.body.append(panel, btn);

  let note = ''; // the last explanation (why an effect is unavailable, a hint)
  let showExport = false;

  const deck = () => OH.deck as { active: boolean; busy: boolean; index: number; slides: HTMLElement[]; go: Function } | undefined;
  const current = (): HTMLElement => (deck()?.active ? deck()!.slides[deck()!.index]! : (OH.current ?? OH.slideAtCenter()));
  const slides = () => [...document.querySelectorAll<HTMLElement>('#page .slide')];

  const open = () => {
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    render();
    panel.querySelector<HTMLElement>('.mlab-x')?.focus();
  };
  const close = () => {
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };
  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      close();
      btn.focus();
    }
  });
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (panel.hidden) return;
      const t = e.target as Node;
      if (!panel.contains(t) && !btn.contains(t)) close();
    },
    true
  );
  // The panel's own keys never reach the page's navigation.
  panel.addEventListener('keydown', (e) => e.stopPropagation());

  for (const type of ['oh:slide', 'oh:settings', 'oh:swap-state', 'oh:idle', 'oh:content-error']) {
    document.addEventListener(type, () => {
      if (!panel.hidden) render();
    });
  }

  /** Phone (hybrid): a swap plays only on entering a sector, so only a sector's title card has one to try. */
  const phoneSwap = (slide: HTMLElement) => slide.classList.contains('card') && slide.id !== 'home-title';

  function replay() {
    const slide = current();
    const d = deck();
    if (d && (d.active || phoneSwap(slide))) {
      if (d.busy) return;
      d.go(d.active ? d.index : d.slides.indexOf(slide), { preview: true }); // same swap, slide revealed again, then its content
    } else replayContent(slide);
  }

  function chooseSwap(key: string) {
    const d = deck();
    if (!d || d.busy || (!d.active && !phoneSwap(current()))) return;
    note = '';
    setMotion(current().id, { pageSwap: key });
    if (key !== NONE) loadTransition(key);
    replay();
  }

  function chooseEffect(key: string, variant: string | null = null) {
    const slide = current();
    const effect = effectByKey(key)!;
    const check = effect.check(slide);
    if (check.status !== 'ok') {
      note = `${effect.name}: ${check.reason}`;
      render();
      return;
    }
    if (deck()?.busy) return;
    note = effect.hint ?? '';
    setMotion(slide.id, { contentEffect: key, contentVariant: variant });
    replayContent(slide);
  }

  panel.addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-act]');
    if (!el) return;
    e.stopPropagation();
    const { act, key, variant } = el.dataset;
    if (act === 'close') return close();
    if (act === 'swap') {
      if (el.getAttribute('aria-disabled') === 'true') {
        note = el.dataset.reason ?? '';
        return render();
      }
      return chooseSwap(key!);
    }
    if (act === 'effect') return chooseEffect(key!);
    if (act === 'variant') {
      if (el.getAttribute('aria-disabled') === 'true') {
        note = el.dataset.reason ?? '';
        return render();
      }
      return chooseEffect(motionOf(current().id).contentEffect, variant!);
    }
    if (act === 'replay') return replay();
    if (act === 'reset') {
      resetMotion(current().id);
      note = 'Слайд вернулся к исходным настройкам.';
      return replay();
    }
    if (act === 'export') {
      showExport = !showExport;
      return render();
    }
    if (act === 'copy') {
      const area = panel.querySelector<HTMLTextAreaElement>('.mlab-json');
      if (!area) return;
      navigator.clipboard?.writeText(area.value).then(
        () => ((el.textContent = 'Copied'), setTimeout(() => (el.textContent = 'Copy'), 1500)),
        () => area.select()
      ) ?? area.select();
    }
  });

  function render() {
    const slide = current();
    if (!slide) return;
    const all = slides();
    const m = motionOf(slide.id);
    const base = baseOf(slide.id);
    const isDeck = Boolean(deck()?.active);
    const busy = Boolean(deck()?.busy);
    const title = (headingOf(slide)?.textContent ?? slide.id).trim();
    const effect = effectByKey(m.contentEffect);
    const check = effect?.check(slide);

    const swapBtn = (key: string, label: string, webgl = false) => {
      const state = loadState.get(key);
      const on = m.pageSwap === key;
      let mark = '';
      if (state === 'loading') mark = ' <i class="mlab-st">загрузка…</i>';
      if (state === 'error') mark = ' <i class="mlab-st err">ошибка</i>';
      const disabled = !isDeck && !phoneSwap(slide);
      return `<button type="button" data-act="swap" data-key="${key}" class="mlab-chip${on ? ' on' : ''}${webgl ? ' gl' : ''}" aria-pressed="${on}" ${disabled ? 'aria-disabled="true" data-reason="На телефоне эффект смены играет только при входе в новый сектор. Откройте заголовок сектора (большую надпись), чтобы выбрать его."' : ''}>${esc(label)}${mark}</button>`;
    };

    const effectBtn = (e: Effect) => {
      const c = e.check(slide);
      const on = m.contentEffect === e.key;
      const cls = c.status === 'ok' ? '' : c.status === 'unconnected' ? ' off unconn' : ' off';
      const title = c.status === 'ok' ? '' : ` title="${esc(c.reason ?? '')}"`;
      return `<button type="button" data-act="effect" data-key="${e.key}" class="mlab-chip${on ? ' on' : ''}${cls}" aria-pressed="${on}"${c.status !== 'ok' ? ' aria-disabled="true"' : ''}${title}>${esc(e.name)}</button>`;
    };

    const variants =
      effect && variantsFor(effect, slide).length > 1 && check?.status === 'ok'
        ? `<div class="mlab-vars" role="group" aria-label="Variant">${variantsFor(effect, slide)
            .map((v, i) => {
              const on = (m.contentVariant ?? variantsFor(effect, slide).find((x) => x.ok)?.key) === v.key;
              return `<button type="button" data-act="variant" data-variant="${v.key}" class="mlab-var${on ? ' on' : ''}${v.ok ? '' : ' off'}" aria-pressed="${on}" ${v.ok ? '' : `aria-disabled="true" data-reason="${esc(v.label + ': ' + (v.reason ?? ''))}"`}>${esc(v.label)}${i === 0 ? '' : ''}</button>`;
            })
            .join('')}</div>`
        : '';

    const swapLabel = m.pageSwap === CUSTOM ? 'Custom' : PAGE_SWAPS.find((p) => p.key === m.pageSwap)?.label ?? m.pageSwap;
    const err = errors.get(slide.id);

    panel.innerHTML = `
      <header class="mlab-head">
        <div><b>Motion Lab</b><span class="mlab-slide">${String(all.indexOf(slide) + 1).padStart(2, '0')} / ${all.length} · ${esc(title)}</span></div>
        <button type="button" class="mlab-x" data-act="close" aria-label="Закрыть">✕</button>
      </header>
      <div class="mlab-body">
        <section>
          <h4>Page swap <small>вход на этот слайд: ${esc(swapLabel)}</small></h4>
          <div class="mlab-grid">
            ${base.pageSwap === CUSTOM || m.pageSwap === CUSTOM ? swapBtn(CUSTOM, 'Custom') : ''}
            ${PAGE_SWAPS.map((p) => swapBtn(p.key, p.label, p.webgl)).join('')}
          </div>
          ${isDeck ? '<p class="mlab-small">WebGL-эффекты (Dither…Channel) при первом выборе загружают three.js.</p>' : `<p class="mlab-small">Телефон: внутри сектора обычная прокрутка, эффект играет при входе в новый сектор${phoneSwap(slide) ? ' — на этот.' : '. Выбрать его можно на заголовке сектора.'} Тяжёлые эффекты (GL, Slices, Carousel, Cube) на слабых телефонах могут подтормаживать.</p>`}
        </section>
        <section>
          <h4>Content effect</h4>
          <div class="mlab-grid">${EFFECTS.filter((e) => e.group === 'Site').map(effectBtn).join('')}</div>
          ${GROUPS.map((g) => `<h5>${g}</h5><div class="mlab-grid">${EFFECTS.filter((e) => e.group === g).map(effectBtn).join('')}</div>`).join('')}
          ${variants}
          <p class="mlab-target"><b>Target:</b> ${esc(check?.status === 'ok' ? check.target ?? '—' : '—')}</p>
          ${err ? `<p class="mlab-note err">Ошибка эффекта: ${esc(err)}. Контент показан в обычном виде.</p>` : ''}
          ${note ? `<p class="mlab-note">${esc(note)}</p>` : ''}
          <p class="mlab-small">Серые — несовместимы с этим слайдом, пунктир — не подключены. Нажмите, чтобы увидеть причину.</p>
        </section>
      </div>
      <footer class="mlab-foot">
        <div class="mlab-row">
          <button type="button" class="mlab-act primary" data-act="replay"${busy ? ' disabled' : ''}>Replay</button>
          <button type="button" class="mlab-act" data-act="reset"${hasLocalEdits(slide.id) ? '' : ' disabled'}>Reset slide</button>
          <button type="button" class="mlab-act" data-act="export" aria-expanded="${showExport}">Export config</button>
        </div>
        ${showExport ? `<textarea class="mlab-json" readonly aria-label="Config JSON">${esc(exportConfig())}</textarea><button type="button" class="mlab-act" data-act="copy">Copy</button>` : ''}
        <p class="mlab-small">Изменения сохраняются локально в этом браузере. Это не правка кода и не публикация для посетителей: чтобы закрепить, экспортируйте конфиг.</p>
      </footer>`;
    // Unavailable chips explain themselves instead of doing nothing.
    panel.querySelectorAll<HTMLElement>('.mlab-chip.off').forEach((chip) => {
      chip.dataset.act = 'effect';
    });
  }
}
