import * as XLSX from 'xlsx';
import crypto from 'crypto';
import fs from 'fs';
import { LeagueDatabase } from './db';
import { dbGet } from './dbHelper';

export interface ParsedTrackerPlayerStat {
  rawTeamShort: string;
  rawPlayerName: string;
  matchedPlayerId: string | null;
  position: string;
  atBats: number;
  plateAppearances: number;
  runs: number;
  hits: number;
  rbi: number;
  strikeouts: number;
  walks: number;
  hitByPitch: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  hr1: number;
  hr2: number;
  hr3: number;
  grandSlams: number;
  itpHomeRuns: number;
  totalBases: number;
  sacFlys: number;
  dpHitInto: number;
  tpHitInto: number;
  buddyJumpsHitInto: number;
  starSwings: number;
  starHits: number;
  starsUsed: number;
  stolenBases: number;
  caughtStealing: number;
  stealAttempts: number;
  putouts: number;
  assists: number;
  buddyJumpPutouts: number;
  buddyJumpAttempts: number;
  doublePlays: number;
  triplePlays: number;
  bobbles: number;
  starBasesHelper: number;
}

export interface ParsedTrackerPitchingStat {
  rawPlayerName: string;
  matchedPlayerId: string | null;
  rawTeamShort: string;
  battersFaced: number;
  inningsPitched: number;
  pitches: number;
  strikes: number;
  balls: number;
  strikeouts: number;
  walks: number;
  beanBalls: number;
  hitsAllowed: number;
  runsAllowed: number;
  singlesAllowed: number;
  doublesAllowed: number;
  triplesAllowed: number;
  hrAllowed: number;
  earnedRuns: number;
  inheritedRuns: number;
  starPitches: number;
  starsUsed: number;
  pickoffs: number;
  pickoffAttempts: number;
  abAgainstHelper: number;
  tbAllowedHelper: number;
}

export interface SpreadsheetImportPreview {
  fileName: string;
  fileHash: string;
  awayTeamFull: string;
  homeTeamFull: string;
  awayScore: number;
  homeScore: number;
  awayController: string;
  homeController: string;
  stadium: string;
  inningsSetting: string;
  mercySetting: string;
  starsSetting: string;
  itemsSetting: string;
  scorecard: { awayInnings: number[]; homeInnings: number[] };
  battingFieldingRows: ParsedTrackerPlayerStat[];
  pitchingRows: ParsedTrackerPitchingStat[];
  warnings: string[];
  unmatchedPlayers: string[];
  isDuplicateHash: boolean;
}

export function parseSluggersTrackerWorkbook(
  filePath: string,
  leagueDb: LeagueDatabase,
  scheduledGameId?: string
): SpreadsheetImportPreview {
  const fileBuffer = fs.readFileSync(filePath);
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });

  const warnings: string[] = [];
  const unmatchedPlayers = new Set<string>();

  for (const reqSheet of ['Game Info', 'Stats', 'Pitching']) {
    if (!wb.SheetNames.includes(reqSheet)) {
      throw new Error(`Invalid Sluggers Stat Tracker workbook: Missing required worksheet "${reqSheet}".`);
    }
  }

  // Check duplicate file import using dbGet helper
  const dup = dbGet(leagueDb, 'SELECT game_id FROM games WHERE imported_file_hash = ? AND status = ?', [
    fileHash,
    'COMPLETED'
  ]) as { game_id: string } | undefined;
  
  const isDuplicateHash = Boolean(dup);
  if (isDuplicateHash) {
    warnings.push(`Duplicate workbook detected (already imported for game ${dup?.game_id}).`);
  }

  // Load aliases map using dbGet helper
  const aliasRows = leagueDb.db
    .prepare('SELECT alias_name, player_id FROM spreadsheet_aliases');
  const aliasMap = new Map<string, string>();
  while (aliasRows.step()) {
    const r = aliasRows.getAsObject() as { alias_name: string; player_id: string };
    aliasMap.set(r.alias_name.trim().toLowerCase(), r.player_id);
  }
  aliasRows.free();

  const resolvePlayerId = (rawName: string): string | null => {
    const key = rawName.trim().toLowerCase();
    const id = aliasMap.get(key) || null;
    if (!id) unmatchedPlayers.add(rawName);
    return id;
  };

  // 1. Parse 'Game Info'
  const infoSheet = wb.Sheets['Game Info'];
  const cellVal = (addr: string) => (infoSheet[addr] ? infoSheet[addr].v : null);

  const awayTeamFull = String(cellVal('L11') ?? 'Away Team');
  const homeTeamFull = String(cellVal('P11') ?? 'Home Team');
  const awayScore = Number(cellVal('I12') ?? cellVal('P31') ?? 0);
  const homeScore = Number(cellVal('P12') ?? cellVal('P32') ?? 0);
  const awayController = String(cellVal('I13') ?? '');
  const homeController = String(cellVal('P13') ?? '');
  const stadium = String(cellVal('I14') ?? 'Unknown Stadium');
  const inningsSetting = String(cellVal('M15') ?? 'Innings - 5');
  const mercySetting = String(cellVal('M16') ?? 'Mercy - Off');
  const starsSetting = String(cellVal('M17') ?? 'Stars - On');
  const itemsSetting = String(cellVal('M18') ?? 'Items - On');

  const awayInnings: number[] = [];
  const homeInnings: number[] = [];
  const cols = ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'];
  for (const c of cols) {
    const hdr = cellVal(`${c}30`);
    if (hdr === 'Final' || hdr === null) break;
    awayInnings.push(Number(cellVal(`${c}31`) ?? 0));
    homeInnings.push(Number(cellVal(`${c}32`) ?? 0));
  }

  // 2. Parse 'Stats'
  const statsJson = XLSX.utils.sheet_to_json<any[]>(wb.Sheets['Stats'], { header: 1, defval: null });
  const battingFieldingRows: ParsedTrackerPlayerStat[] = [];
  let currentTeamShort = '';

  for (let r = 1; r < statsJson.length; r++) {
    const row = statsJson[r];
    if (!row || (!row[1] && !row[2])) continue;
    if (row[0]) {
      currentTeamShort = String(row[0]).trim();
    }
    const playerName = String(row[1] ?? '').trim();
    const pos = String(row[2] ?? '').trim();
    if (pos === 'N/A' || !playerName || playerName.toLowerCase() === currentTeamShort.toLowerCase()) {
      continue;
    }

    const matchedPlayerId = resolvePlayerId(playerName);
    battingFieldingRows.push({
      rawTeamShort: currentTeamShort,
      rawPlayerName: playerName,
      matchedPlayerId,
      position: pos,
      atBats: Number(row[3] ?? 0),
      plateAppearances: Number(row[4] ?? 0),
      runs: Number(row[5] ?? 0),
      hits: Number(row[6] ?? 0),
      rbi: Number(row[7] ?? 0),
      strikeouts: Number(row[8] ?? 0),
      walks: Number(row[9] ?? 0),
      hitByPitch: Number(row[10] ?? 0),
      singles: Number(row[11] ?? 0),
      doubles: Number(row[12] ?? 0),
      triples: Number(row[13] ?? 0),
      homeRuns: Number(row[14] ?? 0),
      hr1: Number(row[15] ?? 0),
      hr2: Number(row[16] ?? 0),
      hr3: Number(row[17] ?? 0),
      grandSlams: Number(row[18] ?? 0),
      itpHomeRuns: Number(row[19] ?? 0),
      totalBases: Number(row[20] ?? 0),
      sacFlys: Number(row[21] ?? 0),
      dpHitInto: Number(row[22] ?? 0),
      tpHitInto: Number(row[23] ?? 0),
      buddyJumpsHitInto: Number(row[24] ?? 0),
      starSwings: Number(row[25] ?? 0),
      starHits: Number(row[26] ?? 0),
      starsUsed: Number(row[27] ?? 0),
      stolenBases: Number(row[33] ?? 0),
      caughtStealing: Number(row[34] ?? 0),
      stealAttempts: Number(row[35] ?? 0),
      putouts: Number(row[36] ?? 0),
      assists: Number(row[37] ?? 0),
      buddyJumpPutouts: Number(row[38] ?? 0),
      buddyJumpAttempts: Number(row[39] ?? 0),
      doublePlays: Number(row[40] ?? 0),
      triplePlays: Number(row[41] ?? 0),
      bobbles: Number(row[42] ?? 0),
      starBasesHelper: Number(row[43] ?? 0)
    });
  }

  // 3. Parse 'Pitching'
  const pitchJson = XLSX.utils.sheet_to_json<any[]>(wb.Sheets['Pitching'], { header: 1, defval: null });
  const pitchingRows: ParsedTrackerPitchingStat[] = [];

  for (let r = 1; r < pitchJson.length; r++) {
    const row = pitchJson[r];
    if (!row || !row[0]) continue;
    const pName = String(row[0]).trim();
    if (pName.endsWith('Totals')) continue;

    const matchedPlayerId = resolvePlayerId(pName);
    pitchingRows.push({
      rawPlayerName: pName,
      matchedPlayerId,
      rawTeamShort: String(row[1] ?? '').trim(),
      battersFaced: Number(row[2] ?? 0),
      inningsPitched: Number(row[3] ?? 0),
      pitches: Number(row[4] ?? 0),
      strikes: Number(row[5] ?? 0),
      balls: Number(row[6] ?? 0),
      strikeouts: Number(row[7] ?? 0),
      walks: Number(row[8] ?? 0),
      beanBalls: Number(row[9] ?? 0),
      hitsAllowed: Number(row[10] ?? 0),
      runsAllowed: Number(row[11] ?? 0),
      singlesAllowed: Number(row[12] ?? 0),
      doublesAllowed: Number(row[13] ?? 0),
      triplesAllowed: Number(row[14] ?? 0),
      hrAllowed: Number(row[15] ?? 0),
      earnedRuns: Number(row[16] ?? 0),
      inheritedRuns: Number(row[17] ?? 0),
      starPitches: Number(row[18] ?? 0),
      starsUsed: Number(row[19] ?? 0),
      pickoffs: Number(row[20] ?? 0),
      pickoffAttempts: Number(row[21] ?? 0),
      abAgainstHelper: Number(row[29] ?? 0),
      tbAllowedHelper: Number(row[30] ?? 0)
    });
  }

  return {
    fileName: filePath.split(/[\\/]/).pop() || 'game.xlsx',
    fileHash,
    awayTeamFull,
    homeTeamFull,
    awayScore,
    homeScore,
    awayController,
    homeController,
    stadium,
    inningsSetting,
    mercySetting,
    starsSetting,
    itemsSetting,
    scorecard: { awayInnings, homeInnings },
    battingFieldingRows,
    pitchingRows,
    warnings,
    unmatchedPlayers: Array.from(unmatchedPlayers),
    isDuplicateHash
  };
}