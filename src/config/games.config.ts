import type { GamePreset } from '../types/varchas';

export const GAME_PRESETS: Record<string, GamePreset> = {
  bgmi: {
    id: 'bgmi',
    name: 'BGMI',
    fullName: 'Battlegrounds Mobile India',
    status: 'active',
    defaultTeams: 20,
    maxTeams: 20,
    defaultPlayersPerTeam: 4,
    maxPlayersPerTeam: 4,
    defaultFormula: 'normal',
    defaultFinishWeight: 1,
    defaultPlaceWeight: 1,
    recallSupported: true,
    description:
      'Battle Royale Squads · 1 to 20 teams · 4 players per squad · Recall & Finish/Placement scoring.',
  },
  freefire: {
    id: 'freefire',
    name: 'Free Fire',
    fullName: 'Garena Free Fire',
    status: 'coming-soon',
    defaultTeams: 12,
    maxTeams: 20,
    defaultPlayersPerTeam: 4,
    maxPlayersPerTeam: 4,
    defaultFormula: 'normal',
    defaultFinishWeight: 1,
    defaultPlaceWeight: 1,
    recallSupported: false,
    description:
      'Preset architecture ready for upcoming VARCHAS Free Fire & VEDH integration.',
  },
};

export function getAllGamePresets(): GamePreset[] {
  return Object.values(GAME_PRESETS);
}

export function getGamePreset(gameId: string): GamePreset {
  return GAME_PRESETS[gameId] || GAME_PRESETS.bgmi;
}
