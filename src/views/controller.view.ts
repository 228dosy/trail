import {
  buildOverlayUrl,
  calcTotal,
  logoCacheKey,
  logoDataPath,
  ruleDescription,
  saveLiveMatch,
} from '../services/match.service';
import { readOnce } from '../services/firebase.service';
import { appState } from '../state/appState';
import type { MatchRecord, PlayerStatus } from '../types/varchas';
import { showToast } from '../utils/dom';
import { esc, friendlyError, safeColor, safeLogo } from '../utils/format';

export interface ControllerHandlers {
  onBackToHub: () => void;
  onEndMatch: (id: string) => void;
  onCloseMatch: (id: string) => void;
}

function loadLogosForMatch(m: MatchRecord, cb: (logos: Record<number, string>) => void): void {
  const key = logoCacheKey(m);
  if (Object.prototype.hasOwnProperty.call(appState.logoCache, key)) {
    cb(appState.logoCache[key]);
    return;
  }
  readOnce(logoDataPath(m))
    .then((snap) => {
      appState.logoCache[key] = (snap.val() || {}) as Record<number, string>;
      cb(appState.logoCache[key]);
    })
    .catch(() => cb({}));
}

export function fitControllerGrid(): void {
  const grid = document.getElementById('teamCards');
  const area = document.querySelector('.controller-main');
  if (!grid || !area) return;
  const cards = Array.from(grid.children) as HTMLElement[];
  const count = cards.length;
  if (!count) return;

  cards.forEach((c) => {
    c.style.gridColumn = '';
    c.style.gridRow = '';
    c.style.width = '';
    c.style.justifySelf = '';
  });

  const width = grid.clientWidth || area.clientWidth;
  const gap = 7;
  let cols = 1;
  let rows = 1;

  if (count === 1) {
    cols = 1;
    rows = 1;
    cards[0].style.width = 'min(100%, 920px)';
    cards[0].style.justifySelf = 'center';
  } else if (count === 2) {
    cols = 2;
    rows = 1;
  } else if (count === 3) {
    cols = 2;
    rows = 2;
    cards[2].style.gridColumn = '1 / -1';
    cards[2].style.width = '50%';
    cards[2].style.justifySelf = 'center';
  } else if (count === 4) {
    cols = 2;
    rows = 2;
  } else if (count === 5) {
    cols = 3;
    rows = 2;
    [
      [0, 1, 1],
      [1, 2, 1],
      [2, 1, 2],
      [3, 2, 2],
    ].forEach(([i, col, row]) => {
      cards[i].style.gridColumn = String(col);
      cards[i].style.gridRow = String(row);
    });
    cards[4].style.gridColumn = '3';
    cards[4].style.gridRow = '1 / span 2';
  } else if (count === 6) {
    cols = 3;
    rows = 2;
  } else {
    const fitCols = Math.max(2, Math.floor((width + gap) / (210 + gap)));
    cols = Math.max(2, Math.min(count, fitCols, 5, Math.ceil(Math.sqrt(count * 2.2))));
    rows = Math.ceil(count / cols);
    const tail = count % cols;
    if (tail > 0) {
      let start = Math.floor((cols - tail) / 2) + 1;
      for (let i = count - tail; i < count; i++) {
        cards[i].style.gridColumn = String(start++);
        cards[i].style.gridRow = String(rows);
      }
    }
  }

  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  grid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
}

export function renderControllerView(container: HTMLElement, handlers: ControllerHandlers): void {
  const viewId = appState.activeId;
  const m = viewId ? appState.matches[viewId] : undefined;

  if (!viewId || !m) {
    container.innerHTML = `
      <div class="page-wrap">
        <div class="empty-panel">
          <p>Select an active match from Home or Current Matches to open its live controller.</p>
          <button type="button" class="btn btn-gold" id="ctrlFallbackHub">Back to Home</button>
        </div>
      </div>
    `;
    container.querySelector('#ctrlFallbackHub')?.addEventListener('click', handlers.onBackToHub);
    return;
  }

  container.innerHTML = `
    <div class="controller-shell">
      <div class="controller-heading">
        <div>
          <div class="eyebrow">Live Operations Room · ${esc((m.gameId || 'bgmi').toUpperCase())}</div>
          <h2 class="controller-title">${esc(m.name)}</h2>
        </div>
      </div>

      <div class="controller-layout">
        <aside class="controller-rail">
          <button type="button" class="rail-btn" id="railRuleBtn" title="Points rule">ℹ<span>Points rule</span></button>
          <button type="button" class="rail-btn" id="railHubBtn" title="Back to Home">←<span>Home</span></button>
          <button type="button" class="rail-btn rail-copy" id="railCopyBtn" title="Copy OBS overlay link">▣<span>Copy OBS</span></button>
          <button type="button" class="rail-btn rail-end" id="railEndBtn" title="End match and view results">■<span>End match</span></button>
          <button type="button" class="rail-btn rail-close" id="railCloseBtn" title="Close match with security check">×<span>Close match</span></button>
        </aside>

        <div class="controller-main">
          <div class="controller-bg">
            <div class="controller-bar-note">
              <span>Live team cards · changes sync directly to this match's protected OBS overlay</span>
            </div>
            <div class="cards" id="teamCards"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#railRuleBtn')?.addEventListener('click', () => {
    showToast(`Points rule: ${ruleDescription(m)}`);
  });
  container.querySelector('#railHubBtn')?.addEventListener('click', handlers.onBackToHub);
  container.querySelector('#railCopyBtn')?.addEventListener('click', async () => {
    const url = buildOverlayUrl(m);
    try {
      await navigator.clipboard.writeText(url.href);
      showToast('OBS overlay link copied.');
    } catch {
      window.prompt('Copy this OBS overlay link:', url.href);
    }
  });
  container.querySelector('#railEndBtn')?.addEventListener('click', () => handlers.onEndMatch(viewId));
  container.querySelector('#railCloseBtn')?.addEventListener('click', () => handlers.onCloseMatch(viewId));

  const cardsContainer = container.querySelector<HTMLElement>('#teamCards')!;

  loadLogosForMatch(m, (logos) => {
    if (appState.activeId !== viewId || appState.matches[viewId] !== m) return;
    let html = '';

    (m.teams || []).forEach((t, i) => {
      const recallHtml = m.settings?.recallEnabled
        ? (t.recall || [])
            .map(
              (on, p) =>
                `<button type="button" class="recall-btn ${
                  on ? 'on' : ''
                }" style="--recall-color:${safeColor(
                  m.settings.recallColor,
                  '#f5df82',
                )}" title="Recall P${p + 1}" data-recall-team="${i}" data-recall-player="${p}">${
                  p + 1
                }</button>`,
            )
            .join('')
        : '';

      const playersHtml = (t.status || [])
        .map(
          (st, p) => `
          <div class="player">
            <span class="pnum">P${p + 1}</span>
            <div class="states">
              <button type="button" title="Alive" class="state ${
                st === 'alive' ? 'active-alive' : ''
              }" data-st-team="${i}" data-st-player="${p}" data-st-val="alive">A</button>
              <button type="button" title="Knocked" class="state ${
                st === 'knocked' ? 'active-knocked' : ''
              }" data-st-team="${i}" data-st-player="${p}" data-st-val="knocked">K</button>
              <button type="button" title="Finished" class="state ${
                st === 'finished' ? 'active-finished' : ''
              }" data-st-team="${i}" data-st-player="${p}" data-st-val="finished">F</button>
            </div>
          </div>
        `,
        )
        .join('');

      const scoreHtml = `
        <div class="tc-side">
          <div class="scorebox">
            <small>FINISHES</small>
            <div class="score-adjust">
              <button type="button" title="Decrease finishes" data-adj-team="${i}" data-adj-key="finishes" data-adj-delta="-1">−</button>
              <b class="tabular">${Number(t.finishes || 0)}</b>
              <button type="button" title="Increase finishes" data-adj-team="${i}" data-adj-key="finishes" data-adj-delta="1">+</button>
            </div>
          </div>
          <div class="scorebox">
            <small>PLACEMENT</small>
            <div class="score-adjust">
              <button type="button" title="Decrease placement" data-adj-team="${i}" data-adj-key="placement" data-adj-delta="-1">−</button>
              <b class="tabular">${Number(t.placement || 0)}</b>
              <button type="button" title="Increase placement" data-adj-team="${i}" data-adj-key="placement" data-adj-delta="1">+</button>
            </div>
          </div>
          <div class="scorebox totalbox">
            <small>TOTAL</small>
            <b class="tabular">${calcTotal(m, t)}</b>
          </div>
        </div>
      `;

      html += `
        <article class="teamcard ${t.killed ? 'is-killed' : ''}" style="background:${safeColor(
          t.cardColor,
          '#e3eef2',
        )}">
          <div class="tc-head">
            <img class="logo-image" src="${esc(
              safeLogo(logos[i] || ''),
            )}" alt="" onerror="this.style.visibility='hidden'" />
            <span class="tc-slot">${String(i + 1).padStart(2, '0')}</span>
            <span class="tc-name" title="${esc(t.name)}">${esc(t.name)}</span>
            <button type="button" class="kill-btn" data-kill-team="${i}">${
              t.killed ? 'RESTORE' : 'KILL'
            }</button>
          </div>
          <div class="tc-content">
            <div class="tc-main">
              <div class="playerrow">${playersHtml}</div>
              ${recallHtml ? `<div class="recall-row"><span>RECALL</span>${recallHtml}</div>` : ''}
            </div>
            ${scoreHtml}
          </div>
        </article>
      `;
    });

    cardsContainer.innerHTML = html;
    requestAnimationFrame(fitControllerGrid);

    const persist = async () => {
      try {
        await saveLiveMatch(viewId, m);
      } catch (e) {
        showToast(friendlyError(e));
      }
    };

    cardsContainer.querySelectorAll<HTMLButtonElement>('[data-adj-team]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.adjTeam);
        const key = btn.dataset.adjKey as 'finishes' | 'placement';
        const delta = Number(btn.dataset.adjDelta);
        m.teams[i][key] = Math.max(0, Number(m.teams[i][key] || 0) + delta);
        void persist();
      });
    });

    cardsContainer.querySelectorAll<HTMLButtonElement>('[data-st-team]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.stTeam);
        const p = Number(btn.dataset.stPlayer);
        const val = btn.dataset.stVal as PlayerStatus;
        m.teams[i].status[p] = val;
        void persist();
      });
    });

    cardsContainer.querySelectorAll<HTMLButtonElement>('[data-recall-team]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.recallTeam);
        const p = Number(btn.dataset.recallPlayer);
        m.teams[i].recall[p] = !m.teams[i].recall[p];
        renderControllerView(container, handlers);
        void persist();
      });
    });

    cardsContainer.querySelectorAll<HTMLButtonElement>('[data-kill-team]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.killTeam);
        m.teams[i].killed = !m.teams[i].killed;
        void persist();
      });
    });
  });
}
