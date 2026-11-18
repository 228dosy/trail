import { mountColorDropdown, type ColorDropdownHandle } from '../components/colorPicker';
import { OVERLAY_FONTS } from '../config/fonts.config';
import { getAllGamePresets, getGamePreset } from '../config/games.config';
import { varchasBus } from '../services/eventBus';
import { compressLogo, createAndStartMatch, logoCacheKey } from '../services/match.service';
import { appState } from '../state/appState';
import type { FormulaMode, RecallIcon, SortAnimation } from '../types/varchas';
import { showToast } from '../utils/dom';
import { esc, friendlyError, usedMatches } from '../utils/format';

export interface SetupHandlers {
  onReconnect: () => void;
  onMatchCreated: (matchId: string) => void;
}

let colorHandles: ColorDropdownHandle[] = [];
let pendingLogos: Record<number, string> = {};

function cleanupColorPickers(): void {
  colorHandles.forEach((h) => h.destroy());
  colorHandles = [];
}

export function renderSetupView(container: HTMLElement, handlers: SetupHandlers): void {
  cleanupColorPickers();
  pendingLogos = {};

  if (!appState.selectedGameId) {
    renderGameSelectionStep(container, handlers);
    return;
  }

  renderMatchConfigStep(container, handlers);
}

function renderGameSelectionStep(container: HTMLElement, handlers: SetupHandlers): void {
  const presets = getAllGamePresets();
  const activeMatchesCount = Object.keys(appState.matches || {}).length;

  container.innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <div class="eyebrow">New Match · Step 1 of 2</div>
          <h2>SELECT GAME PRESET</h2>
        </div>
      </div>

      ${
        activeMatchesCount > 0
          ? `<div class="notice-banner">
              <strong>${activeMatchesCount} active match${activeMatchesCount === 1 ? '' : 'es'} currently live.</strong>
              Selecting a game preset applies only to the new match you create—existing matches remain untouched.
            </div>`
          : ''
      }

      <div class="game-grid">
        ${presets
          .map(
            (g) => `
          <article class="game-card ${g.status === 'coming-soon' ? 'is-upcoming' : ''}">
            <div class="game-card-top">
              <span class="game-badge">${g.status === 'active' ? 'Available' : 'Upcoming Preset'}</span>
              <span class="game-meta tabular">${g.defaultPlayersPerTeam}P Squads · Max ${g.maxTeams} Teams</span>
            </div>
            <h3>${esc(g.name)}</h3>
            <p class="game-fullname">${esc(g.fullName)}</p>
            <p class="game-desc">${esc(g.description)}</p>
            <div class="game-card-actions">
              ${
                g.status === 'active'
                  ? `<button type="button" class="btn btn-gold" data-pick-game="${esc(g.id)}">Select ${esc(
                      g.name,
                    )} &amp; Configure</button>`
                  : `<button type="button" class="btn btn-ghost" disabled>Prepared for Expansion</button>`
              }
            </div>
          </article>
        `,
          )
          .join('')}
      </div>
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-pick-game]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const gameId = btn.dataset.pickGame || 'bgmi';
      appState.selectedGameId = gameId;
      varchasBus.emit('game:selected', { gameId });
      renderSetupView(container, handlers);
    });
  });
}

function renderMatchConfigStep(container: HTMLElement, handlers: SetupHandlers): void {
  const preset = getGamePreset(appState.selectedGameId || 'bgmi');
  const isHelper = appState.role === 'helper';
  const used = usedMatches(appState.helperInfo);
  const max = Number(appState.helperInfo?.maxMatches) || 1;
  const quotaExhausted = isHelper && used >= max;

  container.innerHTML = `
    <div class="page-wrap">
      <div class="page-header">
        <div>
          <div class="eyebrow">New Match · ${esc(preset.name)} Configuration</div>
          <h2>MATCH SETUP</h2>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="changeGameBtn">← Change Game</button>
          <button type="button" class="btn btn-ghost btn-sm" id="openGuideBtn" title="Setup quick guide">Quick Guide</button>
        </div>
      </div>

      <div class="panel sync-strip-panel">
        <div class="sync-strip">
          <span class="sync-dot ${appState.firebaseConnected ? 'is-ok' : ''}"></span>
          <span>${
            appState.firebaseConnected ? 'Cloud Sync: Connected' : 'Cloud Sync: Disconnected'
          }</span>
          ${
            !appState.firebaseConnected
              ? `<button type="button" class="btn btn-ghost btn-sm" id="setupReconnectBtn">Connect / Retry</button>`
              : ''
          }
          <span class="hint">Game Preset: <strong>${esc(preset.fullName)}</strong></span>
        </div>
      </div>

      ${
        quotaExhausted
          ? `<div class="notice-banner is-warn">You have used all ${max} authorized match slots for this temporary session.</div>`
          : ''
      }

      <div class="grid-2">
        <section class="panel section-card">
          <h3>01. Match Details &amp; Scoring</h3>
          <div class="fields-2">
            <div class="field">
              <label for="matchName">Match name</label>
              <input id="matchName" value="MATCH 01" maxlength="36" />
            </div>
            <div class="field">
              <label for="lobbyCount">Teams (1 to ${preset.maxTeams})</label>
              <select id="lobbyCount">
                ${Array.from({ length: preset.maxTeams }, (_, idx) => {
                  const n = idx + 1;
                  return `<option value="${n}" ${
                    n === preset.defaultTeams ? 'selected' : ''
                  }>${n} ${n === 1 ? 'team' : 'teams'}</option>`;
                }).join('')}
              </select>
            </div>
          </div>

          <div class="field">
            <label for="formulaMode">Points Formula</label>
            <div class="formula-row">
              <select id="formulaMode">
                <option value="normal" ${
                  preset.defaultFormula === 'normal' ? 'selected' : ''
                }>Finishes + Placement</option>
                <option value="custom" ${
                  preset.defaultFormula === 'custom' ? 'selected' : ''
                }>Custom Multipliers</option>
              </select>
              <span id="customFormulaWrap" class="${
                preset.defaultFormula === 'custom' ? '' : 'hidden'
              } custom-formula-inputs">
                Finish × <input id="finishWeight" type="number" min="0" max="99" value="${
                  preset.defaultFinishWeight
                }" />
                + Placement × <input id="placeWeight" type="number" min="0" max="99" value="${
                  preset.defaultPlaceWeight
                }" />
              </span>
            </div>
          </div>

          <div class="fields-2">
            <div class="field">
              <label for="sortSpeed">Overlay Sort Speed</label>
              <select id="sortSpeed">
                <option value="0">Instant · 0s</option>
                <option value="0.25">0.25 seconds</option>
                <option value="0.5" selected>0.5 seconds</option>
                <option value="0.75">0.75 seconds</option>
                <option value="1">1 second</option>
              </select>
            </div>
            <div class="field">
              <label for="sortAnimation">Overlay Sort Animation</label>
              <select id="sortAnimation">
                <option value="slide">Smooth slide</option>
                <option value="fade-slide">Fade + slide</option>
                <option value="fade">Fade</option>
                <option value="scale">Scale</option>
                <option value="pop">Pop</option>
                <option value="bounce">Bounce</option>
                <option value="flip">Flip</option>
              </select>
            </div>
          </div>
        </section>

        <section class="panel section-card">
          <h3>02. Overlay Typography &amp; Colors</h3>

          <div class="field">
            <label for="overlayFont">Overlay Font (${OVERLAY_FONTS.length} Clear Broadcast Fonts)</label>
            <select id="overlayFont">
              ${OVERLAY_FONTS.map(
                (f) =>
                  `<option value="${esc(f.name)}" style="font-family:'${esc(
                    f.name,
                  )}', sans-serif">${esc(f.name)} — ${esc(f.category)}</option>`,
              ).join('')}
            </select>
          </div>

          <div class="font-preview-box" id="fontPreviewBox">
            <div class="font-preview-meta">
              <span id="fontPreviewName">Barlow Condensed</span>
              <span id="fontPreviewCat">Broadcast Condensed</span>
            </div>
            <div class="font-preview-sample" id="fontPreviewSample" style="font-family:'Barlow Condensed', sans-serif">
              <span class="fp-rank">01</span>
              <span class="fp-team">TEAM VARCHAS</span>
              <span class="fp-bars"><i></i><i></i><i></i><i></i></span>
              <span class="fp-fin">12 FIN</span>
              <span class="fp-pts">27 PTS</span>
            </div>
          </div>

          <div class="fields-2" style="margin-top:12px">
            <div class="field">
              <label>Overlay Text Color</label>
              <div id="cpOverlayText"></div>
            </div>
            <div class="field">
              <label>Alive Bar Color</label>
              <div id="cpAliveBar"></div>
            </div>
            <div class="field">
              <label>Knocked Bar Color</label>
              <div id="cpKnockedBar"></div>
            </div>
            <div class="field">
              <label>Finished Bar Color</label>
              <div id="cpFinishedBar"></div>
            </div>
          </div>

          <div class="recall-config-box">
            <label class="switch-row">
              <input id="recallEnabled" type="checkbox" />
              <span>Enable Recall buttons &amp; overlay symbols</span>
            </label>
            <div class="fields-2" style="margin-top:10px">
              <div class="field">
                <label>Recall Symbol Color</label>
                <div id="cpRecallColor"></div>
              </div>
              <div class="field">
                <label>Recall Symbol</label>
                <div class="recall-radio-row">
                  <label><input type="radio" name="recallIcon" value="thunder" checked /> ⚡ Thunder</label>
                  <label><input type="radio" name="recallIcon" value="heart" /> ♥ Heart</label>
                  <label><input type="radio" name="recallIcon" value="antenna" /> 📡 Antenna</label>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="panel section-card" style="margin-top:16px">
        <div class="section-card-head">
          <h3>03. Team Roster</h3>
          <span class="hint">Gallery logos compress automatically below 10 KB (WebP) and sync to Firebase RTDB.</span>
        </div>
        <div id="teamInputsGrid" class="team-roster-grid"></div>
        <div class="setup-submit-bar">
          <button type="button" class="btn btn-gold" id="startMatchBtn" ${
            quotaExhausted ? 'disabled' : ''
          }>Create &amp; Start Match</button>
        </div>
      </section>
    </div>
  `;

  // Mount 22-color x 21-shade + White/Grey pickers
  const textPicker = mountColorDropdown(container.querySelector('#cpOverlayText')!, {
    id: 'overlayTextColor',
    initialValue: '#ffffff',
    onChange: (hex) => {
      const sample = container.querySelector<HTMLElement>('#fontPreviewSample');
      if (sample) sample.style.color = hex;
    },
  });
  const alivePicker = mountColorDropdown(container.querySelector('#cpAliveBar')!, {
    id: 'aliveColor',
    initialValue: '#ffffff',
  });
  const knockedPicker = mountColorDropdown(container.querySelector('#cpKnockedBar')!, {
    id: 'knockedColor',
    initialValue: '#f4a6ad',
  });
  const finishedPicker = mountColorDropdown(container.querySelector('#cpFinishedBar')!, {
    id: 'finishedColor',
    initialValue: '#aeb5b9',
  });
  const recallPicker = mountColorDropdown(container.querySelector('#cpRecallColor')!, {
    id: 'recallColor',
    initialValue: '#facc15',
  });
  colorHandles = [textPicker, alivePicker, knockedPicker, finishedPicker, recallPicker];

  // Live Font Preview binding
  const fontSelect = container.querySelector<HTMLSelectElement>('#overlayFont')!;
  const previewName = container.querySelector<HTMLElement>('#fontPreviewName')!;
  const previewCat = container.querySelector<HTMLElement>('#fontPreviewCat')!;
  const previewSample = container.querySelector<HTMLElement>('#fontPreviewSample')!;

  fontSelect.addEventListener('change', () => {
    const picked = OVERLAY_FONTS.find((f) => f.name === fontSelect.value) || OVERLAY_FONTS[0];
    previewName.textContent = picked.name;
    previewCat.textContent = picked.category;
    previewSample.style.fontFamily = `'${picked.name}', sans-serif`;
    previewSample.style.fontWeight = picked.sampleWeight;
  });

  // Formula toggle
  const formulaSelect = container.querySelector<HTMLSelectElement>('#formulaMode')!;
  const customWrap = container.querySelector<HTMLElement>('#customFormulaWrap')!;
  formulaSelect.addEventListener('change', () => {
    customWrap.classList.toggle('hidden', formulaSelect.value !== 'custom');
  });

  // Team roster rows
  const lobbySelect = container.querySelector<HTMLSelectElement>('#lobbyCount')!;
  const teamGrid = container.querySelector<HTMLElement>('#teamInputsGrid')!;

  const renderRosterRows = () => {
    const count = Number(lobbySelect.value);
    pendingLogos = {};
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="team-input-row">
          <span class="slot-num tabular">${String(i + 1).padStart(2, '0')}</span>
          <input id="teamName${i}" placeholder="Team ${i + 1}" maxlength="28" />
          <input id="teamLogo${i}" placeholder="Logo URL (optional)" />
          <label class="btn btn-ghost btn-sm file-pick-btn">
            + Logo
            <input id="teamFile${i}" type="file" accept="image/*" hidden data-logo-idx="${i}" />
          </label>
          <select id="teamPlayers${i}" aria-label="Player count for team ${i + 1}">
            ${[1, 2, 3, 4]
              .map(
                (n) =>
                  `<option value="${n}" ${
                    n === preset.defaultPlayersPerTeam ? 'selected' : ''
                  }>${n} ${n === 1 ? 'player' : 'players'}</option>`,
              )
              .join('')}
          </select>
        </div>
      `;
    }
    teamGrid.innerHTML = html;

    teamGrid.querySelectorAll<HTMLInputElement>('[data-logo-idx]').forEach((input) => {
      input.addEventListener('change', async (ev) => {
        const idx = Number(input.dataset.logoIdx);
        const file = (ev.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          pendingLogos[idx] = await compressLogo(file);
          const urlInput = container.querySelector<HTMLInputElement>(`#teamLogo${idx}`);
          if (urlInput) urlInput.value = '';
          showToast('Logo compressed below 10 KB.');
        } catch (err) {
          showToast(friendlyError(err));
          input.value = '';
        }
      });
    });
  };

  lobbySelect.addEventListener('change', renderRosterRows);
  renderRosterRows();

  container.querySelector('#changeGameBtn')?.addEventListener('click', () => {
    appState.selectedGameId = null;
    renderSetupView(container, handlers);
  });

  container.querySelector('#setupReconnectBtn')?.addEventListener('click', handlers.onReconnect);

  container.querySelector('#openGuideBtn')?.addEventListener('click', () => {
    document.getElementById('guideShade')?.classList.remove('hidden');
  });

  const startBtn = container.querySelector<HTMLButtonElement>('#startMatchBtn')!;
  startBtn.addEventListener('click', async () => {
    if (!appState.firebaseConnected) {
      showToast('Connect to Firebase before creating a match.');
      return;
    }
    if (!appState.user || !appState.role) {
      showToast('Operator session unavailable.');
      return;
    }

    const count = Number(lobbySelect.value);
    const teamsInput: Array<{
      name: string;
      players: number;
      logoUrl: string;
      compressedLogo?: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const name = container.querySelector<HTMLInputElement>(`#teamName${i}`)?.value.trim() || '';
      if (!name) {
        showToast(`Enter the name for team ${i + 1}.`);
        return;
      }
      const players = Number(
        container.querySelector<HTMLSelectElement>(`#teamPlayers${i}`)?.value || 4,
      );
      const logoUrl = container.querySelector<HTMLInputElement>(`#teamLogo${i}`)?.value.trim() || '';
      teamsInput.push({
        name,
        players,
        logoUrl,
        compressedLogo: pendingLogos[i],
      });
    }

    const formula = formulaSelect.value as FormulaMode;
    const finishWeight = Number(
      container.querySelector<HTMLInputElement>('#finishWeight')?.value || 1,
    );
    const placeWeight = Number(
      container.querySelector<HTMLInputElement>('#placeWeight')?.value || 1,
    );
    const recallIcon = (container.querySelector<HTMLInputElement>('input[name="recallIcon"]:checked')
      ?.value || 'thunder') as RecallIcon;

    startBtn.disabled = true;
    try {
      const { id, match, logos } = await createAndStartMatch(
        {
          name: container.querySelector<HTMLInputElement>('#matchName')?.value || 'LIVE MATCH',
          gameId: preset.id,
          teams: teamsInput,
          formula,
          finishWeight,
          placeWeight,
          settings: {
            font: fontSelect.value,
            textColor: textPicker.getValue(),
            statusColors: {
              alive: alivePicker.getValue(),
              knocked: knockedPicker.getValue(),
              finished: finishedPicker.getValue(),
            },
            recallEnabled: !!container.querySelector<HTMLInputElement>('#recallEnabled')?.checked,
            recallColor: recallPicker.getValue(),
            recallIcon,
            sortSpeed: Number(
              container.querySelector<HTMLSelectElement>('#sortSpeed')?.value ?? 0.5,
            ),
            sortAnimation: (container.querySelector<HTMLSelectElement>('#sortAnimation')?.value ||
              'slide') as SortAnimation,
          },
        },
        {
          uid: appState.user.uid,
          role: appState.role,
          helperInfo: appState.helperInfo,
          currentMatchCount: Object.keys(appState.matches || {}).length,
        },
      );

      appState.logoCache[logoCacheKey(match)] = logos;
      appState.activeId = id;
      appState.selectedGameId = null;
      showToast('Match created. OBS overlay is ready.');
      handlers.onMatchCreated(id);
    } catch (e) {
      showToast(friendlyError(e));
      startBtn.disabled = false;
    }
  });
}
