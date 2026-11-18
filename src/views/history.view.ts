import { removePath } from '../services/firebase.service';
import { appState } from '../state/appState';
import type { HistoryEntry } from '../types/varchas';
import { showToast } from '../utils/dom';
import { esc, friendlyError } from '../utils/format';

export function renderHistoryView(container: HTMLElement): void {
  if (appState.role !== 'admin') {
    container.innerHTML = `<div class="page-wrap"><div class="empty-panel">Match history is restricted to Admin operators.</div></div>`;
    return;
  }

  const list: Array<{ id: string; uid: string | null; r: HistoryEntry }> =
    appState.historyTab === 'admin'
      ? Object.entries(appState.history?.admin || {}).map(([id, r]) => ({
          id,
          uid: null,
          r,
        }))
      : Object.entries(appState.history?.temporary || {}).flatMap(([uid, obj]) =>
          Object.entries(obj || {}).map(([id, r]) => ({ id, uid, r })),
        );

  list.sort((a, b) => (b.r.endedAt || 0) - (a.r.endedAt || 0));

  container.innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <div class="eyebrow">Completed Match Records</div>
          <h2>MATCH HISTORY</h2>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-danger btn-sm" id="deleteAllHistoryBtn">Delete this section</button>
        </div>
      </div>

      <div class="segmented-tabs">
        <button type="button" class="seg-tab ${
          appState.historyTab === 'admin' ? 'is-active' : ''
        }" data-htab="admin">Admin matches</button>
        <button type="button" class="seg-tab ${
          appState.historyTab === 'temporary' ? 'is-active' : ''
        }" data-htab="temporary">Temporary matches</button>
      </div>

      <div class="history-list">
        ${
          list.length
            ? list
                .map(
                  (x) => `
          <article class="history-entry">
            <div class="history-entry-head">
              <details>
                <summary>
                  ${esc(x.r.name)} · ${esc(x.r.ownerId || '')} · ${new Date(
                    x.r.endedAt || x.r.createdAt,
                  ).toLocaleString()} · ${x.r.teams?.length || 0} teams
                </summary>
                <div class="history-teams">
                  ${(x.r.teams || [])
                    .map(
                      (t) =>
                        `<div class="tabular">#${t.rank} ${esc(t.name)} — ${t.total} pts (${t.finishes} finishes, ${t.placement} placement)</div>`,
                    )
                    .join('')}
                </div>
              </details>
              <button
                type="button"
                class="btn btn-danger btn-sm"
                data-del-kind="${x.uid ? 'temporary' : 'admin'}"
                data-del-uid="${esc(x.uid || '')}"
                data-del-id="${esc(x.id)}"
              >Delete</button>
            </div>
          </article>
        `,
                )
                .join('')
            : `<div class="empty-panel"><p>No completed matches in this section.</p></div>`
        }
      </div>
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-htab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      appState.historyTab = btn.dataset.htab === 'temporary' ? 'temporary' : 'admin';
      renderHistoryView(container);
    });
  });

  container.querySelectorAll<HTMLButtonElement>('[data-del-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this match from history?')) return;
      const kind = btn.dataset.delKind;
      const uid = btn.dataset.delUid;
      const id = btn.dataset.delId;
      const path =
        kind === 'admin'
          ? `pcr/history/admin/${id}`
          : `pcr/history/temporary/${uid}/${id}`;
      try {
        await removePath(path);
        showToast('History entry deleted.');
      } catch (e) {
        showToast(friendlyError(e));
      }
    });
  });

  container.querySelector('#deleteAllHistoryBtn')?.addEventListener('click', async () => {
    const isAdminTab = appState.historyTab === 'admin';
    const path = `pcr/history/${isAdminTab ? 'admin' : 'temporary'}`;
    const count = isAdminTab
      ? Object.keys(appState.history?.admin || {}).length
      : Object.values(appState.history?.temporary || {}).reduce(
          (a, b) => a + Object.keys(b || {}).length,
          0,
        );
    if (!count) {
      showToast('This history section is already empty.');
      return;
    }
    if (!window.confirm(`Delete all ${count} entries in this history section?`)) return;
    try {
      await removePath(path);
      showToast('History section deleted.');
    } catch (e) {
      showToast(friendlyError(e));
    }
  });
}
