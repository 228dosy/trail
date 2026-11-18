import { FIREBASE_CONFIG } from '../config/firebase.config';
import {
  changeAdminEmailAddress,
  changeAdminPasswordValue,
  createTemporaryHelper,
  deleteAllRevokedHelperRecords,
  deleteRevokedHelperRecord,
  revokeAllHelperAccounts,
  revokeHelperAccount,
} from '../services/auth.service';
import { appState } from '../state/appState';
import { attachPasswordToggle, eyeOpenSvg, showToast } from '../utils/dom';
import { countdown, esc, friendlyError, usedMatches } from '../utils/format';

export interface SettingsHandlers {
  onReconnect: () => void;
  onGoToMatches: () => void;
  onToggleMotion: () => void;
}

let lastCreatedHelper: { uid: string; id: string; password: string; maxMatches: number; expiresAt: number } | null = null;

export function renderSettingsView(container: HTMLElement, handlers: SettingsHandlers): void {
  if (appState.role !== 'admin') {
    container.innerHTML = `<div class="page-wrap"><div class="empty-panel">System settings are restricted to Admin operators.</div></div>`;
    return;
  }

  const allHelpers = Object.entries(appState.helpers || {});
  const activeHelpers = allHelpers.filter(([, h]) => !h.revoked);
  const revokedHelpers = allHelpers.filter(([, h]) => h.revoked);

  container.innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <div class="eyebrow">Owner Access &amp; System</div>
          <h2>SYSTEM SETTINGS</h2>
        </div>
      </div>

      <div class="grid-2">
        <section class="panel section-card">
          <h3>Firebase Status &amp; Config</h3>
          <div class="sync-strip" style="margin-bottom:12px">
            <span class="sync-dot ${appState.firebaseConnected ? 'is-ok' : ''}"></span>
            <span>${
              appState.firebaseConnected
                ? 'Cloud Sync: Connected'
                : esc(appState.connectionMessage || 'Cloud Sync: Disconnected')
            }</span>
            <button type="button" class="btn btn-ghost btn-sm" id="settingsReconnectBtn">Connect / Retry</button>
          </div>
          <div class="field">
            <label for="firebaseConfigView">Firebase Web App Config (Read-Only)</label>
            <textarea id="firebaseConfigView" rows="6" readonly spellcheck="false">${esc(
              JSON.stringify(FIREBASE_CONFIG, null, 2),
            )}</textarea>
          </div>
          <hr class="divider" />
          <h3>Performance &amp; Visual Motion</h3>
          <p class="hint">Simplify animated mythological backgrounds for maximum battery and CPU efficiency on low-spec laptops.</p>
          <button type="button" class="btn btn-ghost btn-sm" id="settingsMotionBtn" style="margin-top:8px">
            ${appState.reducedMotion ? 'Switch to Smooth Subtle Motion' : 'Enable Static Performance Mode'}
          </button>
        </section>

        <section class="panel section-card">
          <h3>Change Admin ID</h3>
          <div class="field">
            <label>Current ID · enter twice</label>
            <input id="oldEmail1" type="email" placeholder="Current email" />
            <input id="oldEmail2" type="email" placeholder="Confirm current email" style="margin-top:6px" />
          </div>
          <div class="field">
            <label>Current Password</label>
            <div class="pw-wrap">
              <input id="emailCurrentPassword" type="password" />
              <button type="button" class="pw-eye-btn" data-eye-for="emailCurrentPassword" aria-label="Show password">${eyeOpenSvg()}</button>
            </div>
          </div>
          <div class="field">
            <label>New ID · enter twice</label>
            <input id="newEmail1" type="email" placeholder="New email" />
            <input id="newEmail2" type="email" placeholder="Confirm new email" style="margin-top:6px" />
          </div>
          <button type="button" class="btn btn-gold btn-sm" id="updateEmailBtn">Update Admin ID</button>

          <hr class="divider" />

          <h3>Change Admin Password</h3>
          <div class="field">
            <label>Old Password · enter twice</label>
            <div class="pw-wrap">
              <input id="oldPass1" type="password" />
              <button type="button" class="pw-eye-btn" data-eye-for="oldPass1" aria-label="Show password">${eyeOpenSvg()}</button>
            </div>
            <div class="pw-wrap" style="margin-top:6px">
              <input id="oldPass2" type="password" placeholder="Confirm old password" />
              <button type="button" class="pw-eye-btn" data-eye-for="oldPass2" aria-label="Show password">${eyeOpenSvg()}</button>
            </div>
          </div>
          <div class="field">
            <label>New Password · enter twice</label>
            <div class="pw-wrap">
              <input id="newPass1" type="password" />
              <button type="button" class="pw-eye-btn" data-eye-for="newPass1" aria-label="Show password">${eyeOpenSvg()}</button>
            </div>
            <div class="pw-wrap" style="margin-top:6px">
              <input id="newPass2" type="password" placeholder="Confirm new password" />
              <button type="button" class="pw-eye-btn" data-eye-for="newPass2" aria-label="Show password">${eyeOpenSvg()}</button>
            </div>
          </div>
          <button type="button" class="btn btn-gold btn-sm" id="updatePasswordBtn">Update Password</button>
        </section>
      </div>

      <div class="grid-2" style="margin-top:16px">
        <section class="panel section-card">
          <h3>Temporary Access (Helper IDs)</h3>
          <p class="hint">Choose how long temporary access lasts and how many matches the helper may create.</p>
          <div class="fields-2" style="margin-top:10px">
            <div class="field">
              <label for="helperDays">Days</label>
              <select id="helperDays">
                ${Array.from(
                  { length: 8 },
                  (_, i) => `<option value="${i}">${i} ${i === 1 ? 'day' : 'days'}</option>`,
                ).join('')}
              </select>
            </div>
            <div class="field">
              <label for="helperHours">Hours</label>
              <select id="helperHours">
                ${Array.from(
                  { length: 24 },
                  (_, i) =>
                    `<option value="${i}" ${i === 6 ? 'selected' : ''}>${i} ${
                      i === 1 ? 'hour' : 'hours'
                    }</option>`,
                ).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label for="helperMaxMatches">Max Authorized Matches</label>
            <select id="helperMaxMatches">
              ${Array.from(
                { length: 10 },
                (_, i) =>
                  `<option value="${i + 1}" ${i === 0 ? 'selected' : ''}>${i + 1} ${
                    i + 1 === 1 ? 'match' : 'matches'
                  }</option>`,
              ).join('')}
            </select>
          </div>
          <button type="button" class="btn btn-gold" id="createHelperBtn">Generate Temporary ID &amp; Password</button>

          <div id="newHelperResult" class="helper-result-box ${
            lastCreatedHelper ? '' : 'hidden'
          }">
            ${
              lastCreatedHelper
                ? `
              <div><strong>Temporary ID:</strong> <code>${esc(lastCreatedHelper.id)}</code>
                <button type="button" class="btn btn-ghost btn-sm" id="copyHelperIdBtn">Copy ID</button>
              </div>
              <div style="margin-top:6px"><strong>Password:</strong> <code>${esc(lastCreatedHelper.password)}</code>
                <button type="button" class="btn btn-ghost btn-sm" id="copyHelperPwBtn">Copy password</button>
              </div>
              <div class="hint" style="margin-top:6px">
                Max matches: ${lastCreatedHelper.maxMatches} · Expires: ${new Date(
                  lastCreatedHelper.expiresAt,
                ).toLocaleString()}
              </div>
              <p class="hint">Save these now. Password is shown once.</p>
            `
                : ''
            }
          </div>
        </section>

        <section class="panel section-card">
          <div class="section-card-head">
            <h3>Active Temporary IDs</h3>
            <button type="button" class="btn btn-danger btn-sm" id="revokeAllHelpersBtn" ${
              activeHelpers.length ? '' : 'disabled'
            }>Revoke All Active</button>
          </div>
          <div class="helper-list">
            ${
              activeHelpers.length
                ? activeHelpers
                    .map(([uid, h]) => {
                      const hasMatches = Object.keys(appState.matches || {}).some(
                        (k) => k === `helper:${uid}` || k.startsWith(`helper:${uid}:`),
                      );
                      return `
                      <div class="helper-row">
                        <div>
                          <strong>${esc(h.id || 'Temporary ID')}</strong>
                          <div class="hint tabular" data-expiry="${+h.expiresAt || 0}">${countdown(
                            h.expiresAt,
                          )}</div>
                          <div class="hint tabular">Matches: ${usedMatches(h)} / ${
                            Number(h.maxMatches) || 1
                          }</div>
                        </div>
                        <div class="helper-row-actions">
                          <button type="button" class="btn btn-ghost btn-sm" data-view-helper-matches ${
                            hasMatches ? '' : 'disabled'
                          }>Their matches</button>
                          <button type="button" class="btn btn-danger btn-sm" data-revoke-uid="${esc(
                            uid,
                          )}">Revoke</button>
                        </div>
                      </div>
                    `;
                    })
                    .join('')
                : `<p class="hint">No active temporary IDs.</p>`
            }
          </div>

          <hr class="divider" />

          <div class="section-card-head">
            <h3>Revoked IDs</h3>
            <button type="button" class="btn btn-danger btn-sm" id="deleteAllRevokedBtn" ${
              revokedHelpers.length ? '' : 'disabled'
            }>Delete All Revoked</button>
          </div>
          <div class="helper-list">
            ${
              revokedHelpers.length
                ? revokedHelpers
                    .map(
                      ([uid, h]) => `
                    <div class="helper-row">
                      <div>
                        <strong>${esc(h.id || 'Temporary ID')}</strong>
                        <div class="hint">Revoked</div>
                      </div>
                      <button type="button" class="btn btn-danger btn-sm" data-del-revoked-uid="${esc(
                        uid,
                      )}">Delete</button>
                    </div>
                  `,
                    )
                    .join('')
                : `<p class="hint">No revoked IDs to delete.</p>`
            }
          </div>
        </section>
      </div>
    </div>
  `;

  // Wire password eye toggles in Settings
  container.querySelectorAll<HTMLButtonElement>('[data-eye-for]').forEach((btn) => {
    const targetId = btn.dataset.eyeFor;
    const input = targetId ? container.querySelector<HTMLInputElement>(`#${targetId}`) : null;
    if (input) attachPasswordToggle(btn, input);
  });

  container.querySelector('#settingsReconnectBtn')?.addEventListener('click', handlers.onReconnect);
  container.querySelector('#settingsMotionBtn')?.addEventListener('click', handlers.onToggleMotion);

  container.querySelector('#updateEmailBtn')?.addEventListener('click', async () => {
    if (!appState.user) return;
    try {
      await changeAdminEmailAddress(
        appState.user,
        container.querySelector<HTMLInputElement>('#oldEmail1')!.value.trim(),
        container.querySelector<HTMLInputElement>('#oldEmail2')!.value.trim(),
        container.querySelector<HTMLInputElement>('#newEmail1')!.value.trim(),
        container.querySelector<HTMLInputElement>('#newEmail2')!.value.trim(),
        container.querySelector<HTMLInputElement>('#emailCurrentPassword')!.value,
      );
      showToast('Admin ID updated.');
    } catch (e) {
      showToast(friendlyError(e));
    }
  });

  container.querySelector('#updatePasswordBtn')?.addEventListener('click', async () => {
    if (!appState.user) return;
    try {
      await changeAdminPasswordValue(
        appState.user,
        container.querySelector<HTMLInputElement>('#oldPass1')!.value,
        container.querySelector<HTMLInputElement>('#oldPass2')!.value,
        container.querySelector<HTMLInputElement>('#newPass1')!.value,
        container.querySelector<HTMLInputElement>('#newPass2')!.value,
      );
      showToast('Admin password updated.');
    } catch (e) {
      showToast(friendlyError(e));
    }
  });

  container.querySelector('#createHelperBtn')?.addEventListener('click', async () => {
    const days = Number(container.querySelector<HTMLSelectElement>('#helperDays')!.value);
    const hours = Number(container.querySelector<HTMLSelectElement>('#helperHours')!.value);
    const maxMatches = Number(
      container.querySelector<HTMLSelectElement>('#helperMaxMatches')!.value,
    );
    try {
      lastCreatedHelper = await createTemporaryHelper(days, hours, maxMatches);
      renderSettingsView(container, handlers);
      showToast('Temporary account created.');
    } catch (e) {
      showToast(
        `${friendlyError(
          e,
        )} If Auth created the user before this error, delete the orphan in Firebase Console → Authentication → Users.`,
      );
    }
  });

  container.querySelector('#copyHelperIdBtn')?.addEventListener('click', async () => {
    if (!lastCreatedHelper) return;
    try {
      await navigator.clipboard.writeText(lastCreatedHelper.id);
      showToast('ID copied.');
    } catch {
      showToast('Clipboard access is unavailable in this browser.');
    }
  });

  container.querySelector('#copyHelperPwBtn')?.addEventListener('click', async () => {
    if (!lastCreatedHelper) return;
    try {
      await navigator.clipboard.writeText(lastCreatedHelper.password);
      showToast('Password copied.');
    } catch {
      showToast('Clipboard access is unavailable in this browser.');
    }
  });

  container.querySelectorAll<HTMLButtonElement>('[data-view-helper-matches]').forEach((btn) => {
    btn.addEventListener('click', handlers.onGoToMatches);
  });

  container.querySelectorAll<HTMLButtonElement>('[data-revoke-uid]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.revokeUid;
      if (!uid) return;
      if (!window.confirm('Revoke this temporary account now? Access will stop immediately.')) return;
      try {
        await revokeHelperAccount(uid);
        if (lastCreatedHelper?.uid === uid) lastCreatedHelper = null;
        showToast('Access revoked. You can now delete its record below.');
      } catch (e) {
        showToast(friendlyError(e));
      }
    });
  });

  container.querySelector('#revokeAllHelpersBtn')?.addEventListener('click', async () => {
    if (!window.confirm('Revoke every temporary account now?')) return;
    try {
      const count = await revokeAllHelperAccounts(appState.helpers);
      if (!count) {
        showToast('No temporary accounts to revoke.');
        return;
      }
      lastCreatedHelper = null;
      showToast('All temporary access revoked. Auth accounts can be manually deleted later.');
    } catch (e) {
      showToast(friendlyError(e));
    }
  });

  container.querySelectorAll<HTMLButtonElement>('[data-del-revoked-uid]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.delRevokedUid;
      if (!uid) return;
      if (!appState.helpers[uid]?.revoked) {
        showToast('Revoke the ID before deleting it.');
        return;
      }
      if (
        !window.confirm(
          'Delete this revoked ID record from the app? The Firebase Authentication user remains, but it will no longer have app access.',
        )
      ) {
        return;
      }
      try {
        await deleteRevokedHelperRecord(uid);
        showToast('Revoked ID record deleted.');
      } catch (e) {
        showToast(friendlyError(e));
      }
    });
  });

  container.querySelector('#deleteAllRevokedBtn')?.addEventListener('click', async () => {
    const revokedCount = Object.values(appState.helpers || {}).filter((h) => h?.revoked).length;
    if (!revokedCount) {
      showToast('No revoked IDs to delete.');
      return;
    }
    if (
      !window.confirm(
        `Delete all ${revokedCount} revoked ID records from the app? Their Firebase Authentication users remain, but cannot access the app.`,
      )
    ) {
      return;
    }
    try {
      await deleteAllRevokedHelperRecords(appState.helpers);
      showToast('All revoked ID records deleted.');
    } catch (e) {
      showToast(friendlyError(e));
    }
  });
}
