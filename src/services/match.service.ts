import { CARD_COLORS, randomizedCardColors } from '../config/palette.config';
import type {
  HelperRecord,
  HistoryEntry,
  MatchRecord,
  MatchSettings,
  OverlayPayload,
  PlayerStatus,
  TeamData,
  UserRole,
} from '../types/varchas';
import { randomToken, usedMatches } from '../utils/format';
import { varchasBus } from './eventBus';
import { multiUpdate, pushKey, readOnce, writePath } from './firebase.service';

export function matchPath(id: string): string {
  if (!id.startsWith('helper:')) return `pcr/matches/${id}`;
  const [uid, slot] = id.slice(7).split(':');
  return `pcr/helperMatches/${uid}${slot ? `/${slot}` : ''}`;
}

export function overlayDataPath(m: Pick<MatchRecord, 'overlayToken' | 'overlaySlot'>): string {
  return `pcr/publicOverlays/${m.overlayToken}${m.overlaySlot ? `/${m.overlaySlot}` : ''}`;
}

export function logoDataPath(m: Pick<MatchRecord, 'overlayToken' | 'overlaySlot'>): string {
  return `pcr/logos/${m.overlayToken}${m.overlaySlot ? `/${m.overlaySlot}` : ''}`;
}

export function logoCacheKey(m: Pick<MatchRecord, 'overlayToken' | 'overlaySlot'>): string {
  return `${m.overlayToken}${m.overlaySlot ? `:${m.overlaySlot}` : ''}`;
}

export function buildOverlayUrl(m: Pick<MatchRecord, 'overlayToken' | 'overlaySlot'>): URL {
  const u = new URL(window.location.href);
  u.search = `?overlay=${encodeURIComponent(m.overlayToken)}${
    m.overlaySlot ? `&slot=${encodeURIComponent(m.overlaySlot)}` : ''
  }`;
  return u;
}

export function calcTotal(
  m: Pick<MatchRecord, 'formula' | 'finishWeight' | 'placeWeight'>,
  t: Pick<TeamData, 'finishes' | 'placement'>,
): number {
  const finishes = Number(t.finishes || 0);
  const placement = Number(t.placement || 0);
  if (m.formula === 'custom') {
    return finishes * Number(m.finishWeight || 1) + placement * Number(m.placeWeight || 1);
  }
  return finishes + placement;
}

export function ruleDescription(m: MatchRecord | null | undefined): string {
  return m?.formula === 'custom'
    ? `Finishes × ${m.finishWeight} + placement × ${m.placeWeight}`
    : 'Finishes + placement points';
}

export function makeOverlayPayload(m: MatchRecord, id: string): OverlayPayload {
  return {
    matchId: id,
    name: m.name,
    teams: (m.teams || []).map((t) => ({
      name: t.name,
      finishes: t.finishes || 0,
      placement: t.placement || 0,
      players: t.players,
      status: t.status || [],
      recall: t.recall || [],
      killed: !!t.killed,
    })),
    formula: m.formula,
    finishWeight: m.finishWeight,
    placeWeight: m.placeWeight,
    settings: m.settings,
    ownerUid: m.ownerUid,
    ownerRole: m.ownerRole,
  };
}

export function sortedTeams(m: MatchRecord): Array<{ t: TeamData; i: number; total: number }> {
  return (m.teams || [])
    .map((t, i) => ({ t, i, total: calcTotal(m, t) }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        Number(b.t.placement || 0) - Number(a.t.placement || 0) ||
        Number(b.t.finishes || 0) - Number(a.t.finishes || 0),
    );
}

export function makeHistoryEntry(
  m: MatchRecord,
  helpers: Record<string, HelperRecord>,
  helperInfo: HelperRecord | null,
): HistoryEntry {
  const ownerId =
    m.ownerRole === 'helper'
      ? helpers[m.ownerUid]?.id || helperInfo?.id || 'Temporary'
      : 'Admin';
  return {
    name: m.name,
    gameId: m.gameId || 'bgmi',
    createdAt: m.createdAt,
    endedAt: Date.now(),
    ownerRole: m.ownerRole,
    ownerId,
    teams: sortedTeams(m).map((x, idx) => ({
      rank: idx + 1,
      slot: x.i + 1,
      name: x.t.name,
      finishes: +x.t.finishes || 0,
      placement: +x.t.placement || 0,
      total: x.total,
      players: x.t.players,
      status: x.t.status || [],
      recall: x.t.recall || [],
      killed: !!x.t.killed,
    })),
  };
}

export function helperMatchMap(
  uid: string,
  raw: Record<string, unknown> | null | undefined,
): Record<string, MatchRecord> {
  const out: Record<string, MatchRecord> = {};
  if (!raw) return out;
  if (Array.isArray((raw as unknown as MatchRecord).teams)) {
    const legacy = raw as unknown as MatchRecord;
    if (!legacy.ended) {
      out[`helper:${uid}`] = { ...legacy, legacyHelper: true };
    }
    return out;
  }
  Object.entries(raw).forEach(([slot, match]) => {
    const m = match as MatchRecord | null;
    if (m && !m.ended) {
      out[`helper:${uid}:${slot}`] = m;
    }
  });
  return out;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

export async function compressLogo(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  let scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height));
  for (let n = 0; n < 7; n++) {
    canvas.width = Math.max(32, Math.round(bitmap.width * scale));
    canvas.height = Math.max(32, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.68, 0.54, 0.4, 0.28, 0.18]) {
      const blob = await canvasToBlob(canvas, q);
      if (blob && blob.size <= 7200) {
        bitmap.close();
        return blobToDataUrl(blob);
      }
    }
    scale *= 0.78;
  }
  bitmap.close();
  throw new Error('Could not compress below 10 KB. Choose a smaller logo.');
}

export interface CreateMatchInput {
  name: string;
  gameId: string;
  teams: Array<{ name: string; players: number; logoUrl: string; compressedLogo?: string }>;
  formula: 'normal' | 'custom';
  finishWeight: number;
  placeWeight: number;
  settings: MatchSettings;
}

export async function createAndStartMatch(
  input: CreateMatchInput,
  ctx: {
    uid: string;
    role: UserRole;
    helperInfo: HelperRecord | null;
    currentMatchCount: number;
  },
): Promise<{ id: string; match: MatchRecord; logos: Record<number, string> }> {
  const legacyHelper = ctx.role === 'helper' && !ctx.helperInfo?.maxMatches;
  const used = usedMatches(ctx.helperInfo);
  const max = Number(ctx.helperInfo?.maxMatches) || 1;

  if (ctx.role === 'helper' && used >= max) {
    throw new Error(`You have used all ${max} authorized match slots.`);
  }
  if (ctx.role === 'admin' && ctx.currentMatchCount >= 40) {
    throw new Error('End a match before creating another. Maximum: 40 active matches.');
  }

  const cardColors = randomizedCardColors(input.teams.length);
  const teams: TeamData[] = [];
  const logos: Record<number, string> = {};

  input.teams.forEach((t, i) => {
    const cleanName = t.name.trim();
    if (!cleanName) {
      throw new Error(`Enter the name for team ${i + 1}.`);
    }
    teams.push({
      name: cleanName,
      finishes: 0,
      placement: 0,
      players: t.players,
      status: Array.from({ length: t.players }, () => 'alive' as PlayerStatus),
      recall: Array.from({ length: t.players }, () => false),
      killed: false,
      cardColor: cardColors[i] || CARD_COLORS[i % CARD_COLORS.length],
    });
    if (t.compressedLogo) {
      logos[i] = t.compressedLogo;
    } else if (t.logoUrl.trim()) {
      logos[i] = t.logoUrl.trim();
    }
  });

  const slot = ctx.role === 'helper' && !legacyHelper ? `s${used + 1}` : null;
  const token =
    ctx.role === 'helper' && ctx.helperInfo?.overlayToken
      ? ctx.helperInfo.overlayToken
      : randomToken();
  const id =
    ctx.role === 'helper'
      ? slot
        ? `helper:${ctx.uid}:${slot}`
        : `helper:${ctx.uid}`
      : pushKey('pcr/matches');

  const match: MatchRecord = {
    name: input.name.trim() || 'LIVE MATCH',
    gameId: input.gameId || 'bgmi',
    teams,
    formula: input.formula,
    finishWeight: input.formula === 'custom' ? input.finishWeight : 1,
    placeWeight: input.formula === 'custom' ? input.placeWeight : 1,
    settings: input.settings,
    createdAt: Date.now(),
    ownerUid: ctx.uid,
    ownerRole: ctx.role,
    overlayToken: token,
    overlaySlot: slot,
    matchKey: slot ? id : null,
  };
  if (legacyHelper) match.legacyHelper = true;

  const updates: Record<string, unknown> = {};
  updates[matchPath(id)] = match;
  updates[overlayDataPath(match)] = makeOverlayPayload(match, id);
  updates[logoDataPath(match)] = Object.keys(logos).length ? logos : null;

  if (ctx.role === 'helper' && !legacyHelper) {
    updates[`pcr/helpers/${ctx.uid}/matchesCreated`] = used + 1;
    updates[`pcr/helpers/${ctx.uid}/matchUsed`] = true;
  } else if (ctx.role === 'helper') {
    updates[`pcr/helpers/${ctx.uid}/matchUsed`] = true;
    updates[`pcr/helpers/${ctx.uid}/matchId`] = ctx.uid;
  }

  await multiUpdate(updates);
  varchasBus.emit('match:created', { matchId: id, gameId: match.gameId || 'bgmi' });
  return { id, match, logos };
}

export async function saveLiveMatch(id: string, match: MatchRecord): Promise<void> {
  const updates: Record<string, unknown> = {};
  updates[matchPath(id)] = match;
  updates[overlayDataPath(match)] = makeOverlayPayload(match, id);
  await multiUpdate(updates);
  varchasBus.emit('match:updated', { matchId: id });
}

export async function finalizeMatch(
  id: string,
  match: MatchRecord,
  mode: 'results' | 'secure-close',
  helpers: Record<string, HelperRecord>,
  helperInfo: HelperRecord | null,
): Promise<HistoryEntry> {
  const result = makeHistoryEntry(match, helpers, helperInfo);
  const uid = match.ownerRole === 'helper' ? match.ownerUid : null;
  const historyKey = match.ownerRole === 'helper' ? match.overlaySlot || uid || id : id;
  const histPath =
    match.ownerRole === 'helper'
      ? `pcr/history/temporary/${uid}/${historyKey}`
      : `pcr/history/admin/${id}`;

  const updates: Record<string, unknown> = {};
  updates[histPath] = result;
  updates[matchPath(id)] =
    match.ownerRole === 'helper' && !match.legacyHelper
      ? { ...match, ended: true, endedAt: result.endedAt }
      : null;
  updates[overlayDataPath(match)] = null;
  updates[logoDataPath(match)] = null;

  await multiUpdate(updates);
  varchasBus.emit('match:ended', { matchId: id, mode });
  return result;
}

export function downloadResultFile(r: HistoryEntry | null): void {
  if (!r) return;
  const rows = [
    ['RANK', 'SLOT', 'TEAM NAME', 'FINISHES', 'PLACEMENT', 'TOTAL POINTS'],
    ...r.teams.map((t) => [
      String(t.rank),
      String(t.slot),
      String(t.name),
      String(t.finishes),
      String(t.placement),
      String(t.total),
    ]),
  ];
  const widths = [4, 4, 28, 9, 10, 12];
  const line = (row: string[]) =>
    row
      .map((x, i) => String(x).slice(0, widths[i]).padEnd(widths[i]))
      .join(' | ')
      .trimEnd();
  const rule = widths.map((w) => '-'.repeat(w)).join('-+-');
  const lines = [
    'VARCHAS LIVE MATCH RESULT',
    `Match: ${r.name}`,
    `Started: ${new Date(r.createdAt).toLocaleString()}`,
    `Ended: ${new Date(r.endedAt).toLocaleString()}`,
    `Operator: ${r.ownerId || r.ownerRole}`,
    '',
    'FINAL SCOREBOARD',
    line(rows[0]),
    rule,
    ...rows.slice(1).map(line),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(r.name || 'match').replace(/[^a-z0-9_-]+/gi, '_')}_result.txt`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function migrateLegacyMatchIfPresent(adminUid: string): Promise<boolean> {
  try {
    const migratedSnap = await readOnce('pcr/system/legacyMigrated');
    if (migratedSnap.exists()) return false;
    const snap = await readOnce('pcr/currentMatch');
    if (!snap.exists()) {
      await writePath('pcr/system/legacyMigrated', true);
      return false;
    }
    const old = (snap.val() || {}) as {
      name?: string;
      formula?: 'normal' | 'custom';
      finishWeight?: number;
      placeWeight?: number;
      createdAt?: number;
      teams?: Array<{
        name?: string;
        finishes?: number;
        placement?: number;
        players?: number;
        status?: string[];
        logo?: string;
      }>;
    };
    if (!Array.isArray(old.teams) || !old.teams.length) return false;

    const id = pushKey('pcr/matches');
    const token = randomToken();
    const logos: Record<number, string> = {};

    for (let i = 0; i < old.teams.length; i++) {
      const logo = old.teams[i].logo;
      if (!logo) continue;
      if (/^data:image\//i.test(logo)) {
        try {
          const resp = await fetch(logo);
          logos[i] = await compressLogo(await resp.blob());
        } catch {
          console.warn('Legacy logo could not be compressed; omitted', i);
        }
      } else {
        logos[i] = logo;
      }
    }

    const teams: TeamData[] = old.teams.map((t, i) => ({
      name: t.name || `Team ${i + 1}`,
      finishes: Number(t.finishes) || 0,
      placement: Number(t.placement) || 0,
      players: Number(t.players) || (t.status || []).length || 4,
      status: Array.isArray(t.status)
        ? t.status.map((x) => (x === 'dead' ? 'finished' : (x as PlayerStatus)))
        : Array.from({ length: 4 }, () => 'alive' as PlayerStatus),
      recall: [],
      killed: false,
      cardColor: CARD_COLORS[i % 20],
    }));

    const m: MatchRecord = {
      name: old.name || 'Imported match',
      gameId: 'bgmi',
      teams,
      formula: old.formula || 'normal',
      finishWeight: Number(old.finishWeight) || 1,
      placeWeight: Number(old.placeWeight) || 1,
      settings: {
        font: 'Barlow Condensed',
        textColor: '#ffffff',
        statusColors: { alive: '#ffffff', knocked: '#f4a6ad', finished: '#aeb5b9' },
        recallEnabled: false,
        recallColor: '#f5df82',
      },
      createdAt: Number(old.createdAt) || Date.now(),
      ownerUid: adminUid,
      ownerRole: 'admin',
      overlayToken: token,
    };

    const updates: Record<string, unknown> = {};
    updates[`pcr/matches/${id}`] = m;
    updates[overlayDataPath(m)] = makeOverlayPayload(m, id);
    updates[logoDataPath(m)] = Object.keys(logos).length ? logos : null;
    updates['pcr/system/legacyMigrated'] = true;
    updates['pcr/currentMatch'] = null;
    await multiUpdate(updates);
    return true;
  } catch (e) {
    console.warn('Legacy import skipped', e);
    return false;
  }
}
