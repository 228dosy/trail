import { get, onValue, ref } from 'firebase/database';
import { db } from '../config/firebase.config';
import { calcTotal } from '../services/match.service';
import type { OverlayPayload } from '../types/varchas';
import { esc, safeColor, safeLogo } from '../utils/format';

let overlayLogo: Record<string, string> = {};
let overlayMatch: OverlayPayload | null = null;

function renderOverlay(m: OverlayPayload | null): void {
  const root = document.getElementById('overlay');
  if (!root) return;
  if (!m) {
    root.innerHTML = '';
    overlayMatch = null;
    return;
  }
  overlayMatch = m;
  document.body.classList.add('overlay-mode');
  root.style.setProperty(
    '--ov-font',
    `'${String(m.settings?.font || 'Barlow Condensed').replace(/[^A-Za-z0-9 ]/g, '')}'`,
  );
  root.style.setProperty('--ov-text', safeColor(m.settings?.textColor, '#ffffff'));

  const sorted = (m.teams || [])
    .map((t, i) => ({ t, i, total: calcTotal(m, t) }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        (+b.t.placement || 0) - (+a.t.placement || 0) ||
        (+b.t.finishes || 0) - (+a.t.finishes || 0),
    );

  if (!root.querySelector('.standings')) {
    root.innerHTML = '<div class="standings"></div>';
  }
  const list = root.querySelector('.standings')!;
  const old = new Map(
    Array.from(list.children).map((el) => [
      (el as HTMLElement).dataset.team || '',
      { el: el as HTMLElement, top: el.getBoundingClientRect().top },
    ]),
  );

  const iconMap: Record<string, string> = {
    thunder: '⚡',
    heart: '♥',
    antenna: '📡︎',
  };
  const settings = m.settings || {
    font: 'Barlow Condensed',
    textColor: '#ffffff',
    statusColors: { alive: '#ffffff', knocked: '#f4a6ad', finished: '#aeb5b9' },
    recallEnabled: false,
    recallColor: '#f5df82',
  };
  const icon = iconMap[settings.recallIcon || 'thunder'] || '⚡';
  const duration = Math.max(0, Math.min(1, Number(settings.sortSpeed ?? 0.5))) * 1000;
  const animation = settings.sortAnimation || 'slide';

  sorted.forEach((x, r) => {
    const t = x.t;
    const i = x.i;
    const row = old.get(String(i))?.el || document.createElement('div');
    row.className = 'standrow' + (t.killed ? ' is-killed' : '');
    row.dataset.team = String(i);

    const logo = safeLogo(overlayLogo[String(i)] || '');
    const status = t.status || [];
    const recalls = settings.recallEnabled
      ? status
          .map(
            (_, p) =>
              `<span class="ov-recall ${t.recall?.[p] ? 'recalled' : ''}" style="--recall-color:${safeColor(
                settings.recallColor,
                '#f5df82',
              )}">${icon}</span>`,
          )
          .join('')
      : '';

    const bars = status
      .map((st) => {
        const fallback =
          st === 'knocked' ? '#f4a6ad' : st === 'finished' ? '#aeb5b9' : '#ffffff';
        const color = safeColor(settings.statusColors?.[st], fallback);
        return `<i class="bar" style="background:${color}"></i>`;
      })
      .join('');

    const finishPoints =
      (Number(t.finishes) || 0) * (m.formula === 'custom' ? Number(m.finishWeight || 1) : 1);

    row.innerHTML =
      `<span class="ovteam"><span class="ov-rank">${String(r + 1).padStart(2, '0')}</span>` +
      (logo ? `<img class="ovlogo" src="${logo}" onerror="this.style.display='none'">` : '') +
      `${esc(t.name)}</span>` +
      (settings.recallEnabled ? `<span class="ov-recalls">${recalls}</span>` : '') +
      `<span class="bars">${bars}</span>` +
      `<span class="ovfinish">${finishPoints} FIN</span>` +
      `<span class="ovpoints">${x.total} PTS</span>`;

    list.appendChild(row);
  });

  Array.from(list.children).forEach((el) => {
    const row = el as HTMLElement;
    const prev = old.get(row.dataset.team || '');
    if (!prev || !duration) return;
    const dy = prev.top - row.getBoundingClientRect().top;
    if (Math.abs(dy) < 1) return;

    const kMap: Record<string, [string, string]> = {
      slide: [`translateY(${dy}px)`, 'translateY(0)'],
      'fade-slide': [`translateY(${dy}px)`, 'translateY(0)'],
      fade: ['translateY(0)', 'translateY(0)'],
      scale: ['scale(.94)', 'scale(1)'],
      pop: [`translateY(${dy}px) scale(.94)`, 'translateY(0) scale(1)'],
      bounce: [`translateY(${dy}px)`, 'translateY(0)'],
      flip: ['rotateX(12deg)', 'rotateX(0)'],
    };
    const k = kMap[animation] || [`translateY(${dy}px)`, 'translateY(0)'];
    const frames: Keyframe[] =
      animation === 'fade-slide'
        ? [
            { opacity: 0.35, transform: k[0] },
            { opacity: 1, transform: k[1] },
          ]
        : animation === 'fade'
          ? [{ opacity: 0.35 }, { opacity: 1 }]
          : animation === 'scale'
            ? [
                { opacity: 0.5, transform: k[0] },
                { opacity: 1, transform: k[1] },
              ]
            : [{ transform: k[0] }, { transform: k[1] }];

    row.animate(frames, {
      duration,
      easing:
        animation === 'bounce' ? 'cubic-bezier(.34,1.56,.64,1)' : 'cubic-bezier(.2,.75,.25,1)',
    });
  });
}

export function initProtectedObsOverlay(token: string, slot: string | null): void {
  document.body.classList.add('overlay-mode');
  const rootContainer = document.getElementById('varchas-root');
  if (!rootContainer) return;

  rootContainer.innerHTML = `<section id="overlayShell"><div id="overlay" class="overlay-root"><div class="overlay-status">Connecting to live scoreboard…</div></div></section>`;
  const root = document.getElementById('overlay')!;

  onValue(
    ref(db, `pcr/publicOverlays/${token}`),
    (s) => {
      const data = s.val() as Record<string, OverlayPayload> | OverlayPayload | null;
      let m: OverlayPayload | null = slot
        ? ((data as Record<string, OverlayPayload> | null)?.[slot] ?? null)
        : (data as OverlayPayload | null);
      if (!m && (data as OverlayPayload | null)?.teams) {
        m = data as OverlayPayload;
      }
      if (m) {
        renderOverlay(m);
      } else {
        root.innerHTML = '<div class="overlay-status">Waiting for match data…</div>';
      }
    },
    (e) => {
      console.error('OBS overlay read failed', e);
      root.innerHTML =
        '<div class="overlay-status">Overlay could not read Firebase data. Publish the latest database rules, then reload this OBS link.</div>';
    },
  );

  get(ref(db, `pcr/logos/${token}`))
    .then((s) => {
      const data = (s.val() || {}) as Record<string, unknown>;
      overlayLogo = slot
        ? ((data[slot] as Record<string, string>) || {})
        : (data as Record<string, string>);
      if (!slot && (data as { teams?: unknown }).teams) {
        overlayLogo = data as Record<string, string>;
      }
      if (overlayMatch) renderOverlay(overlayMatch);
    })
    .catch((e) => console.warn('Overlay logo read skipped', e));
}
