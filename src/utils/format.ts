import type { HelperRecord } from '../types/varchas';

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[c] || c;
  });
}

export function emailForId(id: string): string {
  return id.includes('@') ? id.trim() : `${id.trim().toLowerCase()}@pcr-helper.invalid`;
}

export function safeColor(v: unknown, fallback: string): string {
  return /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v) : fallback;
}

export function safeLogo(v: unknown): string {
  const s = String(v || '');
  return /^(https?:|data:image\/)/i.test(s) ? s : '';
}

export function randomToken(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export function randomId(): string {
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  return 'OP' + Array.from(b, (x) => String(x % 10)).join('');
}

export function randomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const b = new Uint8Array(14);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => chars.charAt(x % chars.length)).join('');
}

export function countdown(ts: number | string | undefined): string {
  const left = Math.max(0, Number(ts || 0) - Date.now());
  if (!left) return 'Expired';
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const sec = Math.floor((left % 60000) / 1000);
  return `Time left · ${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function usedMatches(h: HelperRecord | null | undefined): number {
  return Math.max(Number(h?.matchesCreated) || 0, h?.matchUsed ? 1 : 0);
}

export function friendlyError(e: unknown): string {
  const err = e as { code?: string; message?: string } | null | undefined;
  const c = err?.code || '';
  if (
    c.includes('auth/invalid-credential') ||
    c.includes('auth/wrong-password') ||
    c.includes('auth/user-not-found')
  ) {
    return 'ID or password is incorrect.';
  }
  if (c.includes('permission-denied') || String(err?.message || '').includes('PERMISSION_DENIED')) {
    return 'Firebase rules blocked account access. Publish the latest database rules, then choose Retry account check.';
  }
  if (c.includes('auth/email-already-in-use')) {
    return 'That temporary ID is already in use. Please generate another.';
  }
  return err?.message || 'Something went wrong.';
}
