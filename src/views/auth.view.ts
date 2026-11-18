import { renderMythologyBackdrop } from '../components/mythologyBg';
import { signInOperator } from '../services/auth.service';
import { appState } from '../state/appState';
import { attachPasswordToggle, eyeOpenSvg } from '../utils/dom';
import { friendlyError } from '../utils/format';

export function renderAuthGate(
  container: HTMLElement,
  opts: {
    message: string;
    canRetry: boolean;
    onRetry: () => void;
  },
): void {
  container.innerHTML = `
    <div class="auth-stage">
      <div class="myth-backdrop" id="authMythBg"></div>
      <section class="auth-card">
        <div class="auth-brand">
          <div class="sb-brand-mark">V</div>
          <div>
            <div class="auth-eyebrow">VARCHAS · Operator Access</div>
            <h1 class="auth-title">BROADCAST SIGN IN</h1>
          </div>
        </div>
        <p class="auth-subtitle">Sign in with your Admin credentials or Temporary Operator ID to enter the control room.</p>

        <form id="loginForm" class="auth-form" novalidate>
          <div class="field">
            <label for="loginId">Email or Temporary ID</label>
            <input id="loginId" type="text" autocomplete="username" placeholder="admin@email.com or OP12345" required />
          </div>

          <div class="field">
            <label for="loginPassword">Password</label>
            <div class="pw-wrap">
              <input id="loginPassword" type="password" autocomplete="current-password" placeholder="Enter your password" required />
              <button
                type="button"
                id="loginPwToggle"
                class="pw-eye-btn"
                aria-label="Show password"
                aria-pressed="false"
                title="Show password"
              >${eyeOpenSvg()}</button>
            </div>
          </div>

          <button type="submit" class="btn btn-gold btn-full" id="loginSubmitBtn">Sign in to VARCHAS</button>
        </form>

        <div class="auth-msg" id="authMsg" role="alert"></div>
        ${
          opts.canRetry
            ? `<button type="button" class="btn btn-ghost btn-sm" id="authRetryBtn" style="margin-top:8px">Retry account check</button>`
            : ''
        }

        <div class="auth-status-row">
          <span class="sync-dot ${appState.firebaseConnected ? 'is-ok' : ''}" id="authSyncDot"></span>
          <span id="authSyncText">${
            appState.firebaseConnected ? 'Cloud Sync: Connected' : 'Connecting to Firebase…'
          }</span>
        </div>
      </section>
    </div>
  `;

  const mythBg = container.querySelector<HTMLElement>('#authMythBg');
  if (mythBg) renderMythologyBackdrop(mythBg, 'login');

  const msgEl = container.querySelector<HTMLElement>('#authMsg')!;
  if (opts.message) msgEl.textContent = opts.message;

  const pwInput = container.querySelector<HTMLInputElement>('#loginPassword')!;
  const pwToggle = container.querySelector<HTMLButtonElement>('#loginPwToggle')!;
  attachPasswordToggle(pwToggle, pwInput);

  container.querySelector<HTMLButtonElement>('#authRetryBtn')?.addEventListener('click', opts.onRetry);

  const form = container.querySelector<HTMLFormElement>('#loginForm')!;
  const submitBtn = container.querySelector<HTMLButtonElement>('#loginSubmitBtn')!;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = container.querySelector<HTMLInputElement>('#loginId')!.value.trim();
    const pw = pwInput.value;
    if (!id || !pw) {
      msgEl.textContent = 'Enter your ID and password.';
      return;
    }
    msgEl.textContent = 'Connecting…';
    submitBtn.disabled = true;
    try {
      await signInOperator(id, pw);
    } catch (e) {
      msgEl.textContent = friendlyError(e);
      submitBtn.disabled = false;
    }
  });
}
