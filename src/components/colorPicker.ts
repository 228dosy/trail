import { COLOR_FAMILIES, findColorLabel, NEUTRAL_SHADES } from '../config/palette.config';
import { esc } from '../utils/format';

export interface ColorDropdownHandle {
  getValue: () => string;
  setValue: (hex: string) => void;
  destroy: () => void;
}

let activeOpenMenu: HTMLElement | null = null;

function closeAnyOpenMenu(): void {
  if (activeOpenMenu) {
    activeOpenMenu.classList.add('hidden');
    activeOpenMenu.parentElement?.querySelector('.cp-trigger')?.setAttribute('aria-expanded', 'false');
    activeOpenMenu = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (ev) => {
    if (!activeOpenMenu) return;
    const target = ev.target as HTMLElement;
    if (!activeOpenMenu.parentElement?.contains(target)) {
      closeAnyOpenMenu();
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeAnyOpenMenu();
  });
}

/**
 * Renders a compact dropdown containing White + Grey scale and all 22 base colors
 * each expanded into 10 lighter shades + base + 10 darker shades (21 shades per hue).
 */
export function mountColorDropdown(
  host: HTMLElement,
  opts: {
    id: string;
    initialValue: string;
    onChange?: (hex: string) => void;
  },
): ColorDropdownHandle {
  let currentValue = opts.initialValue.toLowerCase();

  host.classList.add('cp-wrap');
  host.innerHTML = `
    <input type="hidden" id="${esc(opts.id)}" value="${esc(currentValue)}" />
    <button type="button" class="cp-trigger" aria-haspopup="listbox" aria-expanded="false">
      <span class="cp-swatch" style="background:${esc(currentValue)}"></span>
      <span class="cp-label">${esc(findColorLabel(currentValue))}</span>
      <span class="cp-hex">${esc(currentValue.toUpperCase())}</span>
      <span class="cp-caret" aria-hidden="true">▾</span>
    </button>
    <div class="cp-menu hidden" role="listbox" aria-label="Color shades">
      <div class="cp-section-title">White &amp; Greys</div>
      <div class="cp-neutral-row">
        ${NEUTRAL_SHADES.map(
          (s) =>
            `<button type="button" class="cp-chip ${
              s.hex.toLowerCase() === currentValue ? 'is-selected' : ''
            }" data-hex="${esc(s.hex)}" title="${esc(s.label)} (${esc(
              s.hex.toUpperCase(),
            )})" style="background:${esc(s.hex)}"></button>`,
        ).join('')}
      </div>
      <div class="cp-section-title">22 Colors · 10 Lighter → Base → 10 Darker</div>
      <div class="cp-families">
        ${COLOR_FAMILIES.map(
          (fam) => `
          <div class="cp-family-row">
            <span class="cp-family-name">${esc(fam.name)}</span>
            <div class="cp-shade-strip">
              ${fam.shades
                .map(
                  (sh) =>
                    `<button type="button" class="cp-chip ${
                      sh.hex.toLowerCase() === currentValue ? 'is-selected' : ''
                    } ${sh.step === 0 ? 'is-base' : ''}" data-hex="${esc(
                      sh.hex,
                    )}" title="${esc(sh.label)} (${esc(sh.hex.toUpperCase())})" style="background:${esc(
                      sh.hex,
                    )}"></button>`,
                )
                .join('')}
            </div>
          </div>
        `,
        ).join('')}
      </div>
    </div>
  `;

  const hidden = host.querySelector<HTMLInputElement>('input[type="hidden"]')!;
  const trigger = host.querySelector<HTMLButtonElement>('.cp-trigger')!;
  const menu = host.querySelector<HTMLElement>('.cp-menu')!;
  const swatchEl = host.querySelector<HTMLElement>('.cp-swatch')!;
  const labelEl = host.querySelector<HTMLElement>('.cp-label')!;
  const hexEl = host.querySelector<HTMLElement>('.cp-hex')!;

  const syncUi = (hex: string) => {
    currentValue = hex.toLowerCase();
    hidden.value = currentValue;
    swatchEl.style.background = currentValue;
    labelEl.textContent = findColorLabel(currentValue);
    hexEl.textContent = currentValue.toUpperCase();
    menu.querySelectorAll<HTMLButtonElement>('.cp-chip').forEach((chip) => {
      chip.classList.toggle('is-selected', (chip.dataset.hex || '').toLowerCase() === currentValue);
    });
  };

  trigger.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const isClosed = menu.classList.contains('hidden');
    closeAnyOpenMenu();
    if (isClosed) {
      menu.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      activeOpenMenu = menu;
    }
  });

  menu.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.cp-chip');
    if (!btn || !btn.dataset.hex) return;
    syncUi(btn.dataset.hex);
    closeAnyOpenMenu();
    opts.onChange?.(currentValue);
  });

  return {
    getValue: () => currentValue,
    setValue: (hex: string) => syncUi(hex),
    destroy: () => {
      if (activeOpenMenu === menu) activeOpenMenu = null;
      host.innerHTML = '';
    },
  };
}
