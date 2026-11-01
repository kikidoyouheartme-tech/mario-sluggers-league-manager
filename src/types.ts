export type ArchetypeLabel = 'Balanced' | 'Power' | 'Speed' | 'Technique';

export type OriginalTeamLabel =
  | 'Mario Fireballs'
  | 'Peach Monarchs'
  | 'Yoshi Eggs'
  | 'Wario Muscles'
  | 'DK Wilds'
  | 'Bowser Monsters'
  | 'Free Agent / Custom';

export type ChemistryStatus = 'Good' | 'Bad' | 'Neutral';

export type CpuDraftPersonality =
  | 'Balanced'
  | 'Power-focused'
  | 'Speed-focused'
  | 'Chemistry-focused'
  | 'Conservative spender'
  | 'Aggressive bidder';

export interface PlayerRecord {
  playerId: string;
  sourceName: string;
  displayName: string;
  originalTeam: OriginalTeamLabel;
  archetype: ArchetypeLabel;
  origPitch: number;
  origBat: number;
  origField: number;
  origRun: number;
  currPitch: number;
  currBat: number;
  currField: number;
  currRun: number;
  specialAbility: string;
  isCaptain: boolean;
  isCustom: boolean;
  isColorVariant: boolean;
  baseCharacterId: string | null;
  portraitFile: string | null;
  cssFilter: string;
  iconGridCell: [number, number] | null;
  baselineValue: number;
  historicalDraftPrice: number | null;
  currentMarketValue: number;
  previousMarketValue: number;
  lastValueReason: string;
}

export interface FranchiseTeam {
  teamId: string;
  franchiseName: string;
  shortName: string;
  originalTeamIdentity: string;
  captainPlayerId: string;
  primaryColor: string;
  secondaryColor: string;
  cpuPersonality: CpuDraftPersonality;
  budgetTotal: number;
  budgetRemaining: number;
  rosterPlayerIds: string[];
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
}

export interface ScheduledMatchup {
  gameId: string;
  gameNumber: number;
  stage: 'REGULAR' | 'QUARTERFINAL' | 'SEMIFINAL' | 'CHAMPIONSHIP';
  awayTeamId: string;
  homeTeamId: string;
  userControlledTeamId: string;
  status: 'SCHEDULED' | 'COMPLETED';
  awayScore?: number;
  homeScore?: number;
  stadium?: string;
  importedFileName?: string;
}

export interface DevelopmentLogEntry {
  logId: number;
  playerId: string;
  attributeChanged: 'Pitch' | 'Bat' | 'Field' | 'Run' | 'MarketValue';
  previousValue: number;
  newValue: number;
  gamesConsidered: number;
  relevantPerformance: string;
  reason: string;
  loggedAt: string;
}