import { buildOverlayUrl } from '../services/match.service';
import { appState } from '../state/appState';
import type { AppPageId, MatchRecord } from '../types/varchas';
import { showToast } from '../utils/dom';
import { countdown, esc, usedMatches } from '../utils/format';

export interface HubHandlers {
  onNavigate: (page: AppPageId) => void;
  onOpenController: (matchId: string) => void;
  onEndMatch: (matchId: string) => void;
}

export function renderHubView(container: HTMLElement, handlers: HubHandlers): void {
  const entries = Object.entries(appState.matches || {}).sort(
    (a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0),
  );
  const activeCount = entries.length;
  const isHelper = appState.role === 'helper';
  const used = usedMatches(appState.helperInfo);
  const max = Number(appState.helperInfo?.maxMatches) || 1;
  const helperCanCreate = !isHelper || used < max;

  const totalTeamsLive = entries.reduce((sum, [, m]) => sum + (m.teams?.length || 0), 0);

  container.innerHTML = `
    <div class="page-wrap">
      <section class="hero-banner">
        <div class="hero-copy">
          <div class="eyebrow">VARCHAS Production &amp; Control Room</div>
          <h1>OWN EVERY BROADCAST</h1>
          <p>Centralized real-time match control, protected OBS scoreboard telemetry, and modular readiness for the VARCHAS ecosystem.</p>
        </div>
        <div class="hero-meta-strip">
          <div class="metric-tile">
            <span class="metric-label">Active Matches</span>
            <strong class="metric-val tabular">${activeCount}</strong>
            <span class="metric-sub">${isHelper ? `${used} / ${max} slots used` : 'Limit 40 live'}</span>
          </div>
          <div class="metric-tile">
            <span class="metric-label">Teams On Air</span>
            <strong class="metric-val tabular">${totalTeamsLive}</strong>
            <span class="metric-sub">Across live lobbies</span>
          </div>
          <div class="metric-tile">
            <span class="metric-label">Cloud Sync</span>
            <strong class="metric-val ${appState.firebaseConnected ? 'text-green' : 'text-red'}">${
              appState.firebaseConnected ? 'LIVE' : 'OFFLINE'
            }</strong>
            <span class="metric-sub">Realtime Database</span>
          </div>
        </div>
      </section>

      ${
        isHelper && appState.helperInfo
          ? `
        <section class="helper-banner">
          <div>
            <span class="eyebrow">Temporary Operator Session</span>
            <strong class="helper-clock tabular" data-expiry="${Number(
              appState.helperInfo.expiresAt || 0,
            )}">${countdown(appState.helperInfo.expiresAt)}</strong>
          </div>
          <div class="helper-quota">
            <span>Authorized Match Slots</span>
            <strong class="tabular">${used} / ${max}</strong>
          </div>
        </section>
      `
          : ''
      }

      <section class="ecosystem-strip" aria-label="VARCHAS Ecosystem Status">
        <div class="eco-pill-card">
          <span class="eco-name">VARCHAS PCR</span>
          <span class="eco-state is-live">Active Console</span>
        </div>
        <div class="eco-pill-card">
          <span class="eco-name">VARCHAS SHIELD</span>
          <span class="eco-state">Integration Ready</span>
        </div>
        <div class="eco-pill-card">
          <span class="eco-name">VARCHAS VEDH</span>
          <span class="eco-state">Event Seam Ready</span>
        </div>
        <div class="eco-pill-card">
          <span class="eco-name">VARCHAS FUTURE</span>
          <span class="eco-state">Modular Core</span>
        </div>
      </section>

      <div class="section-head">
        <div>
          <div class="eyebrow">At a glance</div>
          <h2>Broadcast Status</h2>
        </div>
        <span class="status-note">${
          isHelper
            ? `${activeCount} active · ${used} / ${max} allowed`
            : `${activeCount} active · limit 40`
        }</span>
      </div>

      <div class="match-list" id="hubBroadcastList">
        ${
          entries.length
            ? entries.map(([id, m]) => renderMatchRow(id, m)).join('')
            : `<div class="empty-panel">
                <p>${
                  isHelper
                    ? helperCanCreate
                      ? 'No active matches yet. Use New Match in the sidebar to create one in your authorized slot.'
                      : 'You have used all authorized match slots for this session.'
                    : 'No active matches yet. Select New Match in the sidebar to launch your first broadcast.'
                }</p>
                ${
                  helperCanCreate
                    ? `<button type="button" class="btn btn-gold" id="hubStartFirstBtn">Create Match</button>`
                    : ''
                }
              </div>`
        }
      </div>
    </div>
  `;

  container.querySelector('#hubStartFirstBtn')?.addEventListener('click', () => {
    handlers.onNavigate('setup');
  });

  bindMatchListButtons(container, handlers);
}

export function bindMatchListButtons(
  container: HTMLElement,
  handlers: Pick<HubHandlers, 'onOpenController' | 'onEndMatch'>,
): void {
  container.querySelectorAll<HTMLButtonElement>('[data-control-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.controlId;
      if (id) handlers.onOpenController(id);
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-copy-overlay-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.copyOverlayId;
      const m = id ? appState.matches[id] : undefined;
      if (!m) {
        showToast('Match is not active.');
        return;
      }
      const url = buildOverlayUrl(m);
      try {
        await navigator.clipboard.writeText(url.href);
        showToast('OBS overlay link copied.');
      } catch {
        window.prompt('Copy this OBS overlay link:', url.href);
      }
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-end-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.endId;
      if (id) handlers.onEndMatch(id);
    });
  });
}

export function renderMatchRow(id: string, m: MatchRecord): string {
  const gameLabel = (m.gameId || 'bgmi').toUpperCase();
  const created = m.createdAt ? new Date(m.createdAt).toLocaleString() : '';
  const owner = m.ownerRole === 'helper' ? 'Temporary' : 'Admin';
  return `
    <article class="match-item">
      <div class="match-info">
        <div class="match-title-line">
          <strong>${esc(m.name)}</strong>
          <span class="match-meta-sep">·</span>
          <span class="match-game-tag">${esc(gameLabel)}</span>
        </div>
        <div class="match-subline">
          ${m.teams?.length || 0} teams · ${esc(created)} · ${owner}
        </div>
      </div>
      <div class="match-actions">
        <button type="button" class="btn btn-gold btn-sm" data-control-id="${esc(id)}">Control</button>
        <button type="button" class="btn btn-ghost btn-sm" data-copy-overlay-id="${esc(id)}">OBS link</button>
        <button type="button" class="btn btn-danger btn-sm" data-end-id="${esc(id)}">End</button>
      </div>
    </article>
  `;
}
