import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/controller.css';
import './styles/overlay.css';

import { renderMythologyBackdrop, type MythSceneId } from './components/mythologyBg';
import { renderSidebar } from './components/sidebar';
import { initProtectedObsOverlay } from './overlay/obsOverlay';
import { resolveUserRole, signOutOperator, subscribeAuthState } from './services/auth.service';
import { varchasBus } from './services/eventBus';
import { registerTimer, stopAllListeners, watchPath } from './services/firebase.service';
import {
  downloadResultFile,
  finalizeMatch,
  helperMatchMap,
  migrateLegacyMatchIfPresent,
} from './services/match.service';
import { appState, DEFAULT_ABOUT_US } from './state/appState';
import type {
  AboutUsData,
  AppPageId,
  ContactInfo,
  HelperRecord,
  HistoryEntry,
  HistoryStore,
  MatchRecord,
} from './types/varchas';
import { showToast } from './utils/dom';
import { countdown, esc, friendlyError, usedMatches } from './utils/format';
import { renderAboutView } from './views/about.view';
import { renderAuthGate } from './views/auth.view';
import { renderContactsView } from './views/contacts.view';
import { fitControllerGrid, renderControllerView } from './views/controller.view';
import { renderHistoryView } from './views/history.view';
import { renderHubView } from './views/hub.view';
import { renderMatchesView } from './views/matches.view';
import { renderSettingsView } from './views/settings.view';
import { renderSetupView } from './views/setup.view';

const searchParams = new URLSearchParams(window.location.search);
const overlayParam = searchParams.get('overlay');
const overlaySlotParam = searchParams.get('slot');

// Global reduced-motion state sync
function applyReducedMotionClass(): void {
  document.body.classList.toggle('reduced-motion', appState.reducedMotion);
}
applyReducedMotionClass();

// Expiry countdown ticker for helper screens and settings
window.setInterval(() => {
  document.querySelectorAll<HTMLElement>('[data-expiry]').forEach((el) => {
    el.textContent = countdown(el.dataset.expiry);
  });
}, 1000);

// Strict Early Branch: If ?overlay= is present, launch ONLY the protected OBS overlay!
if (overlayParam !== null) {
  initProtectedObsOverlay(overlayParam, overlaySlotParam);
} else {
  bootVarchasControlRoom();
}

function bootVarchasControlRoom(): void {
  const root = document.getElementById('varchas-root')!;

  const sceneForPage: Record<AppPageId, MythSceneId> = {
    hub: 'hub',
    setup: 'setup',
    matches: 'matches',
    controller: 'controller',
    contacts: 'contacts',
    about: 'about',
    history: 'history',
    settings: 'settings',
  };

  const pageTitleMap: Record<AppPageId, string> = {
    hub: 'HOME DASHBOARD',
    setup: 'NEW MATCH',
    matches: 'CURRENT MATCHES',
    controller: 'LIVE CONTROLLER',
    contacts: 'OFFICIAL CONTENT',
    about: 'ABOUT VARCHAS',
    history: 'MATCH HISTORY',
    settings: 'SYSTEM SETTINGS',
  };

  function setConnectionStatus(ok: boolean, message: string): void {
    appState.firebaseConnected = ok;
    appState.connectionMessage = message;
    varchasBus.emit('sync:changed', { connected: ok, message });

    const topDot = document.getElementById('topSyncDot');
    const topText = document.getElementById('topSyncText');
    if (topDot) topDot.classList.toggle('is-ok', ok);
    if (topText) topText.textContent = ok ? 'Cloud Sync: Connected' : message || 'Cloud Sync: Disconnected';

    const authDot = document.getElementById('authSyncDot');
    const authText = document.getElementById('authSyncText');
    if (authDot) authDot.classList.toggle('is-ok', ok);
    if (authText) authText.textContent = ok ? 'Cloud Sync: Connected' : message || 'Cloud Sync: Disconnected';
  }

  function ensureShellMounted(): void {
    if (document.getElementById('appShellRoot')) return;
    root.innerHTML = `
      <div class="app-shell" id="appShellRoot">
        <aside class="sidebar" id="appSidebar"></aside>
        <div class="sidebar-scrim" id="sidebarScrim"></div>
        <div class="workspace-col">
          <div class="myth-backdrop" id="workspaceMythBg"></div>
          <header class="topbar">
            <div class="topbar-left">
              <button type="button" class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Open navigation">☰</button>
              <span class="topbar-title" id="topbarPageTitle">HOME DASHBOARD</span>
            </div>
            <div class="topbar-sync">
              <span class="sync-dot ${appState.firebaseConnected ? 'is-ok' : ''}" id="topSyncDot"></span>
              <span id="topSyncText">${
                appState.firebaseConnected ? 'Cloud Sync: Connected' : 'Cloud Sync: Connecting…'
              }</span>
            </div>
          </header>
          <main class="main-viewport" id="pageViewport"></main>
        </div>
      </div>

      <div id="guideShade" class="modal-shade hidden">
        <section class="modal-panel">
          <div class="modal-head">
            <div>
              <span class="eyebrow">VARCHAS · Operator Quick Guide</span>
              <h2>SET UP YOUR BROADCAST</h2>
            </div>
            <button type="button" class="icon-close" id="closeGuideBtn" aria-label="Close">×</button>
          </div>
          <div class="guide-grid">
            <article><b>01 · Game &amp; Match</b><p>Select your game preset (BGMI), name the match, and choose 1–20 teams.</p></article>
            <article><b>02 · Rules &amp; Typography</b><p>Set the scoring formula, pick from 25 clear broadcast fonts with live preview, and choose colors across 22 shade families.</p></article>
            <article><b>03 · Players &amp; Recall</b><p>Set each team's player count. Enable Recall if needed and select its symbol and color.</p></article>
            <article><b>04 · Logos</b><p>Upload a local logo to compress automatically below 10 KB, or enter an online image URL.</p></article>
            <article class="guide-wide"><b>05 · Go Live</b><p>Create the match, copy its protected OBS overlay link, and add it as a Browser Source in OBS.</p></article>
          </div>
          <button type="button" class="btn btn-gold" id="doneGuideBtn">Got it</button>
        </section>
      </div>

      <div id="resultShade" class="modal-shade hidden">
        <section class="modal-panel">
          <div class="modal-head">
            <div>
              <span class="eyebrow">Match Complete</span>
              <h2 id="resultTitle">Final Result</h2>
            </div>
            <button type="button" class="icon-close" id="closeResultIconBtn" aria-label="Close results">×</button>
          </div>
          <p class="hint" id="resultMeta"></p>
          <div id="resultBody"></div>
          <div class="card-actions-end" style="margin-top:16px">
            <button type="button" class="btn btn-ghost" id="closeResultBtn">Close results</button>
            <button type="button" class="btn btn-gold" id="downloadResultBtn">Download result</button>
          </div>
        </section>
      </div>

      <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
    `;

    const sidebarEl = document.getElementById('appSidebar')!;
    const scrimEl = document.getElementById('sidebarScrim')!;
    const closeMobileNav = () => {
      sidebarEl.classList.remove('is-open');
      scrimEl.classList.remove('is-open');
    };

    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      sidebarEl.classList.add('is-open');
      scrimEl.classList.add('is-open');
    });
    scrimEl.addEventListener('click', closeMobileNav);

    const guideShade = document.getElementById('guideShade')!;
    guideShade.addEventListener('click', (ev) => {
      if (ev.target === guideShade) guideShade.classList.add('hidden');
    });
    document.getElementById('closeGuideBtn')?.addEventListener('click', () => {
      guideShade.classList.add('hidden');
    });
    document.getElementById('doneGuideBtn')?.addEventListener('click', () => {
      guideShade.classList.add('hidden');
    });

    const resultShade = document.getElementById('resultShade')!;
    const closeResultsModal = () => {
      resultShade.classList.add('hidden');
      appState.latestResult = null;
      navigateTo('matches');
    };
    resultShade.addEventListener('click', (ev) => {
      if (ev.target === resultShade) closeResultsModal();
    });
    document.getElementById('closeResultIconBtn')?.addEventListener('click', closeResultsModal);
    document.getElementById('closeResultBtn')?.addEventListener('click', closeResultsModal);
    document.getElementById('downloadResultBtn')?.addEventListener('click', () => {
      downloadResultFile(appState.latestResult);
    });
  }

  function showResultModal(result: HistoryEntry): void {
    const titleEl = document.getElementById('resultTitle');
    const metaEl = document.getElementById('resultMeta');
    const bodyEl = document.getElementById('resultBody');
    const shadeEl = document.getElementById('resultShade');
    if (!titleEl || !metaEl || !bodyEl || !shadeEl) return;

    titleEl.textContent = result.name;
    metaEl.textContent = `Started: ${new Date(result.createdAt).toLocaleString()} · Ended: ${new Date(
      result.endedAt,
    ).toLocaleString()}`;
    bodyEl.innerHTML = `
      <table class="result-table">
        <thead>
          <tr><th>Rank</th><th>Slot</th><th>Team</th><th>Finishes</th><th>Placement</th><th>Total</th><th>Players</th></tr>
        </thead>
        <tbody>
          ${result.teams
            .map(
              (t) => `
            <tr class="tabular">
              <td>${t.rank}</td>
              <td>${t.slot}</td>
              <td>${esc(t.name)}${t.killed ? ' · KILLED' : ''}</td>
              <td>${t.finishes}</td>
              <td>${t.placement}</td>
              <td><strong>${t.total}</strong></td>
              <td>${t.players}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `;
    shadeEl.classList.remove('hidden');
  }

  async function handleFinishMatch(id: string, mode: 'results' | 'secure-close'): Promise<void> {
    const m = appState.matches[id];
    if (!m) return;
    const closing = mode === 'secure-close';
    if (!window.confirm(`${closing ? 'Close ' : 'End '}${m.name}?`)) return;
    if (closing) {
      const a = 2 + Math.floor(Math.random() * 9);
      const b = 2 + Math.floor(Math.random() * 9);
      if (Number(window.prompt(`Security check: ${a} + ${b} = ?`)) !== a + b) {
        showToast('Security answer was not correct.');
        return;
      }
    }
    try {
      const result = await finalizeMatch(id, m, mode, appState.helpers, appState.helperInfo);
      appState.activeId = null;
      if (closing) {
        appState.latestResult = null;
        navigateTo('matches');
        showToast('Match closed. Overlay and logo data cleared.');
      } else {
        appState.latestResult = result;
        showResultModal(result);
        showToast('Match ended. Review the result and download it if needed.');
      }
    } catch (e) {
      showToast(friendlyError(e));
    }
  }

  function renderSidebarNav(): void {
    const sidebarEl = document.getElementById('appSidebar');
    const scrimEl = document.getElementById('sidebarScrim');
    if (!sidebarEl) return;
    renderSidebar(sidebarEl, {
      role: appState.role,
      currentPage: appState.currentPage,
      onNavigate: navigateTo,
      onSignOut: async () => {
        await signOutOperator();
        window.location.href = window.location.pathname;
      },
      onToggleMotion: toggleReducedMotion,
      onCloseMobile: () => {
        sidebarEl.classList.remove('is-open');
        scrimEl?.classList.remove('is-open');
      },
    });
  }

  function toggleReducedMotion(): void {
    appState.reducedMotion = !appState.reducedMotion;
    window.localStorage.setItem('varchas_reduced_motion', appState.reducedMotion ? '1' : '0');
    applyReducedMotionClass();
    renderSidebarNav();
    if (appState.currentPage === 'settings') renderActivePage();
    showToast(
      appState.reducedMotion
        ? 'Static background mode enabled for optimal performance.'
        : 'Subtle animated mythological backdrops enabled.',
    );
  }

  function renderActivePage(): void {
    const viewport = document.getElementById('pageViewport');
    const mythBg = document.getElementById('workspaceMythBg');
    const titleEl = document.getElementById('topbarPageTitle');
    if (!viewport) return;

    const page = appState.currentPage;
    document.body.classList.toggle('controller-active', page === 'controller');
    if (titleEl) titleEl.textContent = pageTitleMap[page] || 'VARCHAS';
    if (mythBg) renderMythologyBackdrop(mythBg, sceneForPage[page]);
    renderSidebarNav();

    switch (page) {
      case 'hub':
        renderHubView(viewport, {
          onNavigate: navigateTo,
          onOpenController: (id) => {
            appState.activeId = id;
            navigateTo('controller');
          },
          onEndMatch: (id) => void handleFinishMatch(id, 'results'),
        });
        break;
      case 'setup':
        renderSetupView(viewport, {
          onReconnect: () => void reconnectSession(),
          onMatchCreated: (id) => {
            appState.activeId = id;
            navigateTo('controller');
          },
        });
        break;
      case 'matches':
        renderMatchesView(viewport, {
          onNavigate: navigateTo,
          onOpenController: (id) => {
            appState.activeId = id;
            navigateTo('controller');
          },
          onEndMatch: (id) => void handleFinishMatch(id, 'results'),
        });
        break;
      case 'controller':
        renderControllerView(viewport, {
          onBackToHub: () => navigateTo('hub'),
          onEndMatch: (id) => void handleFinishMatch(id, 'results'),
          onCloseMatch: (id) => void handleFinishMatch(id, 'secure-close'),
        });
        break;
      case 'contacts':
        renderContactsView(viewport);
        break;
      case 'about':
        renderAboutView(viewport);
        break;
      case 'history':
        renderHistoryView(viewport);
        break;
      case 'settings':
        renderSettingsView(viewport, {
          onReconnect: () => void reconnectSession(),
          onGoToMatches: () => navigateTo('matches'),
          onToggleMotion: toggleReducedMotion,
        });
        break;
    }
  }

  function navigateTo(page: AppPageId): void {
    if ((page === 'history' || page === 'settings') && appState.role !== 'admin') {
      showToast('This section is restricted to Admin operators.');
      return;
    }
    if (page === 'setup') {
      appState.selectedGameId = null;
    }
    appState.currentPage = page;
    varchasBus.emit('route:changed', { page });
    renderActivePage();
  }

  function refreshCurrentViewOnly(): void {
    const page = appState.currentPage;
    if (page === 'hub' || page === 'matches' || page === 'controller' || page === 'settings') {
      renderActivePage();
    }
  }

  function expireHelperSession(): void {
    stopAllListeners();
    void signOutOperator().finally(() => {
      showAuthScreen('Temporary access expired or was revoked. Ask the admin for access.', false);
    });
  }

  function wireRoleSession(): void {
    stopAllListeners();
    appState.matches = {};
    appState.adminMatches = {};
    appState.tempMatches = {};
    appState.helpers = {};
    appState.history = {};

    ensureShellMounted();

    watchPath(
      'pcr/system/contacts',
      (s) => {
        appState.contactInfo = { ...appState.contactInfo, ...((s.val() || {}) as Partial<ContactInfo>) };
        if (appState.currentPage === 'contacts') renderActivePage();
      },
      (e) => console.warn(e),
    );

    watchPath(
      'pcr/system/aboutUs',
      (s) => {
        const val = s.val() as Partial<AboutUsData> | null;
        if (val) {
          appState.aboutUs = {
            headline: val.headline || DEFAULT_ABOUT_US.headline,
            subtitle: val.subtitle || DEFAULT_ABOUT_US.subtitle,
            boxes:
              Array.isArray(val.boxes) && val.boxes.length
                ? val.boxes
                : structuredClone(DEFAULT_ABOUT_US.boxes),
          };
          if (appState.currentPage === 'about') renderActivePage();
        }
      },
      (e) => console.warn(e),
    );

    if (appState.role === 'admin') {
      watchPath(
        'pcr/matches',
        (s) => {
          appState.adminMatches = (s.val() || {}) as Record<string, MatchRecord>;
          appState.matches = { ...appState.adminMatches, ...appState.tempMatches };
          setConnectionStatus(true, '');
          refreshCurrentViewOnly();
        },
        (e) => setConnectionStatus(false, friendlyError(e)),
      );

      watchPath(
        'pcr/helperMatches',
        (s) => {
          appState.tempMatches = {};
          const raw = (s.val() || {}) as Record<string, Record<string, unknown>>;
          Object.entries(raw).forEach(([uid, data]) => {
            Object.assign(appState.tempMatches, helperMatchMap(uid, data));
          });
          appState.matches = { ...appState.adminMatches, ...appState.tempMatches };
          refreshCurrentViewOnly();
        },
        (e) => setConnectionStatus(false, friendlyError(e)),
      );

      watchPath(
        'pcr/helpers',
        (s) => {
          appState.helpers = (s.val() || {}) as Record<string, HelperRecord>;
          if (appState.currentPage === 'settings') renderActivePage();
        },
        (e) => console.warn(e),
      );

      watchPath(
        'pcr/history',
        (s) => {
          appState.history = (s.val() || {}) as HistoryStore;
          if (appState.currentPage === 'history') renderActivePage();
        },
        (e) => console.warn(e),
      );

      if (appState.user) {
        void migrateLegacyMatchIfPresent(appState.user.uid).then((migrated) => {
          if (migrated) showToast('Existing match moved into the match list.');
        });
      }
    } else if (appState.user) {
      const uid = appState.user.uid;
      let helperMatchWatched = false;

      watchPath(
        `pcr/helpers/${uid}`,
        (s) => {
          const info = s.val() as HelperRecord | null;
          appState.helperInfo = info;
          if (!info || info.revoked || Number(info.expiresAt) <= Date.now()) {
            expireHelperSession();
            return;
          }

          if (!helperMatchWatched) {
            helperMatchWatched = true;
            watchPath(
              `pcr/helperMatches/${uid}`,
              (mSnap) => {
                appState.matches = helperMatchMap(
                  uid,
                  mSnap.val() as Record<string, unknown> | null,
                );
                setConnectionStatus(true, '');
                refreshCurrentViewOnly();
              },
              (e) => {
                setConnectionStatus(false, friendlyError(e));
                showToast('Could not load your match data. Check Firebase rules and reconnect.');
              },
            );
          }

          setConnectionStatus(true, '');
          const used = usedMatches(info);
          const max = Number(info.maxMatches) || 1;
          if (appState.currentPage === 'setup' && used >= max) {
            renderActivePage();
          } else {
            refreshCurrentViewOnly();
          }
        },
        (e) => {
          setConnectionStatus(false, friendlyError(e));
          showToast('Could not verify temporary access. Publish the latest rules, then reconnect.');
        },
      );

      registerTimer(
        window.setInterval(() => {
          if (appState.helperInfo && Number(appState.helperInfo.expiresAt) <= Date.now()) {
            expireHelperSession();
          }
        }, 1000),
      );
    }

    renderActivePage();
  }

  async function reconnectSession(): Promise<void> {
    if (!appState.user) {
      showToast('Sign in first.');
      return;
    }
    try {
      const resolved = await resolveUserRole(appState.user);
      appState.role = resolved.role;
      appState.helperInfo = resolved.helper;
      appState.adminUidCache = resolved.adminUid;
      wireRoleSession();
      setConnectionStatus(true, '');
      showToast('Firebase account and match access rechecked.');
    } catch (e) {
      setConnectionStatus(false, friendlyError(e));
      showToast(`Reconnect failed: ${friendlyError(e)}`);
    }
  }

  function showAuthScreen(message: string, canRetry: boolean): void {
    stopAllListeners();
    document.body.classList.remove('controller-active');
    renderAuthGate(root, {
      message,
      canRetry,
      onRetry: async () => {
        if (!appState.user) return;
        try {
          const resolved = await resolveUserRole(appState.user);
          appState.role = resolved.role;
          appState.helperInfo = resolved.helper;
          appState.adminUidCache = resolved.adminUid;
          varchasBus.emit('auth:changed', { uid: appState.user.uid, role: resolved.role });
          wireRoleSession();
        } catch (e) {
          const msgEl = document.getElementById('authMsg');
          if (msgEl) msgEl.textContent = friendlyError(e);
        }
      },
    });
  }

  window.addEventListener('resize', () => {
    if (appState.currentPage === 'controller') fitControllerGrid();
  });

  subscribeAuthState(async (u) => {
    stopAllListeners();
    appState.user = u;
    if (!u) {
      appState.role = null;
      appState.helperInfo = null;
      varchasBus.emit('auth:changed', { uid: null, role: null });
      showAuthScreen('', false);
      return;
    }
    try {
      const resolved = await resolveUserRole(u);
      appState.role = resolved.role;
      appState.helperInfo = resolved.helper;
      appState.adminUidCache = resolved.adminUid;
      appState.currentPage = 'hub';
      varchasBus.emit('auth:changed', { uid: u.uid, role: resolved.role });
      wireRoleSession();
    } catch (e) {
      console.error('Operator session setup failed', e);
      const msg = friendlyError(e);
      let canRetry = true;
      if (/expired or was revoked|Admin account not configured/i.test(String((e as Error)?.message || ''))) {
        await signOutOperator();
        appState.user = null;
        canRetry = false;
      }
      appState.role = null;
      varchasBus.emit('auth:changed', { uid: null, role: null });
      showAuthScreen(msg, canRetry);
    }
  });
}
