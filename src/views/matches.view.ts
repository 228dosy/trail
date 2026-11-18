import { appState } from '../state/appState';
import type { AppPageId } from '../types/varchas';
import { usedMatches } from '../utils/format';
import { bindMatchListButtons, renderMatchRow } from './hub.view';

export interface MatchesHandlers {
  onNavigate: (page: AppPageId) => void;
  onOpenController: (matchId: string) => void;
  onEndMatch: (matchId: string) => void;
}

let searchTerm = '';

export function renderMatchesView(container: HTMLElement, handlers: MatchesHandlers): void {
  const isHelper = appState.role === 'helper';
  const canCreate = !isHelper || usedMatches(appState.helperInfo) < (Number(appState.helperInfo?.maxMatches) || 1);

  const allEntries = Object.entries(appState.matches || {}).sort(
    (a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0),
  );
  const filtered = allEntries.filter(([, m]) =>
    m.name.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

  container.innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <div class="eyebrow">Active Broadcasts</div>
          <h2>CURRENT MATCHES</h2>
        </div>
        <div class="header-actions">
          ${
            canCreate
              ? `<button type="button" class="btn btn-gold btn-sm" id="matchesNewBtn">+ New Match</button>`
              : ''
          }
        </div>
      </div>

      <div class="matches-toolbar">
        <input
          type="search"
          id="matchesSearchInput"
          class="search-input"
          placeholder="Filter active matches by name…"
          value="${searchTerm.replace(/"/g, '&quot;')}"
        />
        <span class="status-note tabular">${filtered.length} of ${allEntries.length} shown</span>
      </div>

      <div class="match-list" id="matchesListContainer">
        ${
          filtered.length
            ? filtered.map(([id, m]) => renderMatchRow(id, m)).join('')
            : `<div class="empty-panel"><p>${
                allEntries.length ? 'No active matches match your filter.' : 'No active matches right now.'
              }</p></div>`
        }
      </div>
    </div>
  `;

  container.querySelector('#matchesNewBtn')?.addEventListener('click', () => {
    handlers.onNavigate('setup');
  });

  const searchEl = container.querySelector<HTMLInputElement>('#matchesSearchInput')!;
  searchEl.addEventListener('input', () => {
    searchTerm = searchEl.value;
    const listEl = container.querySelector<HTMLElement>('#matchesListContainer')!;
    const next = Object.entries(appState.matches || {})
      .sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0))
      .filter(([, m]) => m.name.toLowerCase().includes(searchTerm.trim().toLowerCase()));
    listEl.innerHTML = next.length
      ? next.map(([id, m]) => renderMatchRow(id, m)).join('')
      : `<div class="empty-panel"><p>No active matches match your filter.</p></div>`;
    bindMatchListButtons(listEl, handlers);
  });

  bindMatchListButtons(container, handlers);
}
