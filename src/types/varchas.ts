export type UserRole = 'admin' | 'helper';

export type PlayerStatus = 'alive' | 'knocked' | 'finished';

export type RecallIcon = 'thunder' | 'heart' | 'antenna';

export type SortAnimation =
  | 'slide'
  | 'fade-slide'
  | 'fade'
  | 'scale'
  | 'pop'
  | 'bounce'
  | 'flip';

export type FormulaMode = 'normal' | 'custom';

export type AppPageId =
  | 'hub'
  | 'setup'
  | 'matches'
  | 'controller'
  | 'contacts'
  | 'history'
  | 'settings'
  | 'about';

export interface StatusColors {
  alive: string;
  knocked: string;
  finished: string;
}

export interface MatchSettings {
  font: string;
  textColor: string;
  statusColors: StatusColors;
  recallEnabled: boolean;
  recallColor: string;
  recallIcon?: RecallIcon;
  sortSpeed?: number;
  sortAnimation?: SortAnimation;
}

export interface TeamData {
  name: string;
  finishes: number;
  placement: number;
  players: number;
  status: PlayerStatus[];
  recall: boolean[];
  killed: boolean;
  cardColor?: string;
}

export interface MatchRecord {
  name: string;
  gameId?: string;
  teams: TeamData[];
  formula: FormulaMode;
  finishWeight: number;
  placeWeight: number;
  settings: MatchSettings;
  createdAt: number;
  ownerUid: string;
  ownerRole: UserRole;
  overlayToken: string;
  overlaySlot?: string | null;
  matchKey?: string | null;
  legacyHelper?: boolean;
  ended?: boolean;
  endedAt?: number;
}

export interface OverlayPayload {
  matchId: string;
  name: string;
  teams: Omit<TeamData, 'cardColor'>[];
  formula: FormulaMode;
  finishWeight: number;
  placeWeight: number;
  settings: MatchSettings;
  ownerUid: string;
  ownerRole: UserRole;
}

export interface HelperRecord {
  id: string;
  expiresAt: number;
  revoked: boolean;
  matchUsed?: boolean;
  matchId?: string | null;
  matchesCreated?: number;
  maxMatches?: number;
  overlayToken: string;
  createdAt: number;
}

export interface HistoryTeamEntry {
  rank: number;
  slot: number;
  name: string;
  finishes: number;
  placement: number;
  total: number;
  players: number;
  status: PlayerStatus[];
  recall: boolean[];
  killed: boolean;
}

export interface HistoryEntry {
  name: string;
  gameId?: string;
  createdAt: number;
  endedAt: number;
  ownerRole: UserRole;
  ownerId: string;
  teams: HistoryTeamEntry[];
}

export interface HistoryStore {
  admin?: Record<string, HistoryEntry>;
  temporary?: Record<string, Record<string, HistoryEntry>>;
}

export interface ContactInfo {
  owner: string;
  number: string;
  whatsapp: string;
  email: string;
  instagram: string;
}

export interface AboutEcosystemBox {
  id: 'pcr' | 'shield' | 'vedh' | 'future';
  title: string;
  tag: string;
  description: string;
}

export interface AboutUsData {
  headline: string;
  subtitle: string;
  boxes: AboutEcosystemBox[];
}

export interface GamePreset {
  id: string;
  name: string;
  fullName: string;
  status: 'active' | 'coming-soon';
  defaultTeams: number;
  maxTeams: number;
  defaultPlayersPerTeam: number;
  maxPlayersPerTeam: number;
  defaultFormula: FormulaMode;
  defaultFinishWeight: number;
  defaultPlaceWeight: number;
  recallSupported: boolean;
  description: string;
}

export interface VarchasEventMap {
  'auth:changed': { uid: string | null; role: UserRole | null };
  'game:selected': { gameId: string };
  'match:created': { matchId: string; gameId: string };
  'match:updated': { matchId: string };
  'match:ended': { matchId: string; mode: 'results' | 'secure-close' };
  'route:changed': { page: AppPageId };
  'sync:changed': { connected: boolean; message: string };
}
