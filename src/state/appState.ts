import type { User } from 'firebase/auth';
import type {
  AboutUsData,
  AppPageId,
  ContactInfo,
  HelperRecord,
  HistoryStore,
  MatchRecord,
  UserRole,
} from '../types/varchas';

export const DEFAULT_ABOUT_US: AboutUsData = {
  headline: 'THE VARCHAS ECOSYSTEM',
  subtitle:
    'Modular broadcast command built for live esports production, security governance, and real-time intelligence.',
  boxes: [
    {
      id: 'pcr',
      title: 'VARCHAS PCR',
      tag: 'Live Production Core',
      description:
        'Real-time match controller, roster management, scoring engine, and protected OBS broadcast overlay synchronization.',
    },
    {
      id: 'shield',
      title: 'VARCHAS SHIELD',
      tag: 'Security & Integrity',
      description:
        'Operator access governance, tamper-resistant audit trails, and tournament integrity metadata layer.',
    },
    {
      id: 'vedh',
      title: 'VARCHAS VEDH',
      tag: 'Vision & Telemetry',
      description:
        'Automated HUD recognition and live event ingestion seam built to feed match telemetry directly into PCR.',
    },
    {
      id: 'future',
      title: 'VARCHAS FUTURE',
      tag: 'Ecosystem Expansion',
      description:
        'Multi-title presets, broadcast automation pipelines, and next-generation tournament intelligence modules.',
    },
  ],
};

export interface AppState {
  user: User | null;
  role: UserRole | null;
  adminUidCache: string | null;
  helperInfo: HelperRecord | null;
  matches: Record<string, MatchRecord>;
  adminMatches: Record<string, MatchRecord>;
  tempMatches: Record<string, MatchRecord>;
  helpers: Record<string, HelperRecord>;
  history: HistoryStore;
  activeId: string | null;
  currentPage: AppPageId;
  historyTab: 'admin' | 'temporary';
  firebaseConnected: boolean;
  connectionMessage: string;
  logoCache: Record<string, Record<number, string>>;
  latestResult: import('../types/varchas').HistoryEntry | null;
  contactInfo: ContactInfo;
  editingContacts: boolean;
  aboutUs: AboutUsData;
  editingAboutUs: boolean;
  selectedGameId: string | null;
  reducedMotion: boolean;
}

export const appState: AppState = {
  user: null,
  role: null,
  adminUidCache: null,
  helperInfo: null,
  matches: {},
  adminMatches: {},
  tempMatches: {},
  helpers: {},
  history: {},
  activeId: null,
  currentPage: 'hub',
  historyTab: 'admin',
  firebaseConnected: false,
  connectionMessage: 'Connect to Firebase',
  logoCache: {},
  latestResult: null,
  contactInfo: {
    owner: 'Jiv',
    number: '',
    whatsapp: '',
    email: '',
    instagram: '',
  },
  editingContacts: false,
  aboutUs: structuredClone(DEFAULT_ABOUT_US),
  editingAboutUs: false,
  selectedGameId: null,
  reducedMotion:
    typeof window !== 'undefined' &&
    (window.localStorage.getItem('varchas_reduced_motion') === '1' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
};
