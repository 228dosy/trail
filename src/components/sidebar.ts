import { appState } from '../state/appState';
import type { AppPageId, UserRole } from '../types/varchas';

export interface SidebarNavItem {
  id: AppPageId;
  label: string;
  adminOnly?: boolean;
  icon: string;
}

export const SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    id: 'hub',
    label: 'Home',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m3 10 9-7 9 7v11a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z"/></svg>`,
  },
  {
    id: 'setup',
    label: 'New Match',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>`,
  },
  {
    id: 'matches',
    label: 'Current Matches',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg>`,
  },
  {
    id: 'contacts',
    label: 'Official Content',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></svg>`,
  },
  {
    id: 'history',
    label: 'Match History',
    adminOnly: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>`,
  },
  {
    id: 'settings',
    label: 'Settings',
    adminOnly: true,
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
  },
  {
    id: 'about',
    label: 'About Us',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  },
];

export function renderSidebar(
  container: HTMLElement,
  opts: {
    role: UserRole | null;
    currentPage: AppPageId;
    onNavigate: (page: AppPageId) => void;
    onSignOut: () => void;
    onToggleMotion: () => void;
    onCloseMobile?: () => void;
  },
): void {
  const visibleItems = SIDEBAR_ITEMS.filter((item) => !item.adminOnly || opts.role === 'admin');
  const roleLabel = opts.role === 'admin' ? 'ADMIN' : 'TEMPORARY OPERATOR';

  container.innerHTML = `
    <div class="sb-brand">
      <div class="sb-brand-mark">V</div>
      <div class="sb-brand-text">
        <span class="sb-title">VARCHAS</span>
        <span class="sb-sub">Production &amp; Control Room</span>
      </div>
      <button type="button" class="sb-close-mobile" aria-label="Close menu">×</button>
    </div>

    <nav class="sb-nav" aria-label="Primary navigation">
      ${visibleItems
        .map(
          (item) => `
          <button
            type="button"
            class="sb-link ${opts.currentPage === item.id ? 'is-active' : ''}"
            data-nav="${item.id}"
          >
            <span class="sb-icon">${item.icon}</span>
            <span class="sb-label">${item.label}</span>
          </button>
        `,
        )
        .join('')}
    </nav>

    <div class="sb-footer">
      <div class="sb-role-row">
        <span class="sb-role-label">${roleLabel}</span>
      </div>
      <button type="button" class="sb-motion-btn" id="sbMotionToggle">
        <span>${appState.reducedMotion ? 'Motion: Simplified' : 'Motion: Smooth'}</span>
      </button>
      <button type="button" class="sb-signout-btn" id="sbSignOut">Sign out</button>
    </div>
  `;

  container.querySelectorAll<HTMLButtonElement>('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.nav as AppPageId;
      opts.onNavigate(target);
      opts.onCloseMobile?.();
    });
  });

  container.querySelector('#sbSignOut')?.addEventListener('click', opts.onSignOut);
  container.querySelector('#sbMotionToggle')?.addEventListener('click', opts.onToggleMotion);
  container.querySelector('.sb-close-mobile')?.addEventListener('click', () => {
    opts.onCloseMobile?.();
  });
}
