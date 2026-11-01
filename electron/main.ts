import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { LeagueDatabase } from './db';
import { dbAll, dbGet, dbRun, runTransaction } from './dbHelper';
import { parseSluggersTrackerWorkbook } from './excelImporter';
import { evaluatePlayerDevelopmentAndMarketValue } from './engines/developmentEngine';

let mainWindow: BrowserWindow | null = null;
let leagueDb: LeagueDatabase;

async function createWindow() {
  leagueDb = new LeagueDatabase(app.getPath('userData'));
  await leagueDb.init();

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0B0F19',
    title: 'Mario Super Sluggers League Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

// 1. Fetch Character Database + Chemistry + Assets
ipcMain.handle('db:getCharacters', (_e, leagueId?: string) => {
  const lId = leagueId || 'default_league';
  const players = dbAll(
    leagueDb,
    `
    SELECT p.*, a.source_file, a.sheet_file, a.crop_x, a.crop_y, a.crop_w, a.crop_h, a.css_filter, a.needs_manual_assignment,
           s.curr_pitch, s.curr_bat, s.curr_field, s.curr_run, s.historical_draft_price, s.current_market_value, s.previous_market_value, s.last_value_reason
    FROM players p
    LEFT JOIN asset_mappings a ON p.player_id = a.entity_id
    LEFT JOIN league_player_state s ON p.player_id = s.player_id AND s.league_id = ?
    ORDER BY p.is_captain DESC, (p.orig_pitch + p.orig_bat + p.orig_field + p.orig_run) DESC
  `,
    [lId]
  );

  const chemistry = dbAll(leagueDb, 'SELECT * FROM chemistry_relationships');
  return { players, chemistry };
});

// 2. Update Player
ipcMain.handle('db:updatePlayer', (_e, payload: {
  playerId: string;
  displayName: string;
  newAlias?: string;
  customStats?: { pitch: number; bat: number; field: number; run: number; archetype: string; specialAbility: string };
}) => {
  runTransaction(leagueDb, () => {
    dbRun(leagueDb, 'UPDATE players SET display_name = ? WHERE player_id = ?', [payload.displayName, payload.playerId]);
    dbRun(leagueDb, 'INSERT OR REPLACE INTO spreadsheet_aliases (alias_name, player_id) VALUES (?, ?)', [
      payload.displayName.trim().toLowerCase(),
      payload.playerId
    ]);
    if (payload.newAlias) {
      dbRun(leagueDb, 'INSERT OR REPLACE INTO spreadsheet_aliases (alias_name, player_id) VALUES (?, ?)', [
        payload.newAlias.trim().toLowerCase(),
        payload.playerId
      ]);
    }
    if (payload.customStats) {
      dbRun(
        leagueDb,
        `
        UPDATE players
        SET orig_pitch = ?, orig_bat = ?, orig_field = ?, orig_run = ?, archetype = ?, special_ability = ?
        WHERE player_id = ? AND is_custom = 1
      `,
        [
          payload.customStats.pitch,
          payload.customStats.bat,
          payload.customStats.field,
          payload.customStats.run,
          payload.customStats.archetype,
          payload.customStats.specialAbility,
          payload.playerId
        ]
      );
    }
  });
  return { success: true };
});

// 3. Validate & Create League
ipcMain.handle('league:validateAndCreate', (_e, config: {
  leagueName: string;
  teamCount: number;
  rosterSize: number;
  teamBudget: number;
  includeCustomCharacters: boolean;
}) => {
  const customParam = config.includeCustomCharacters ? 1 : 0;
  const eligible = dbGet(leagueDb, 'SELECT COUNT(*) as c FROM players WHERE is_custom = 0 OR ? = 1', [customParam]);
  const eligibleCount = eligible?.c || 0;

  const requiredSlots = config.teamCount * config.rosterSize;
  const fixedCaptains = config.teamCount;
  const availableDraftable = eligibleCount - fixedCaptains;

  if (requiredSlots > eligibleCount) {
    return {
      valid: false,
      eligibleCount,
      requiredSlots,
      fixedCaptains,
      availableDraftable,
      maxSupportedRosterSize: Math.floor(eligibleCount / config.teamCount),
      message: `Insufficient player pool: ${config.teamCount} teams × ${config.rosterSize} slots requires ${requiredSlots} players, but only ${eligibleCount} players exist.`
    };
  }

  const leagueId = `league_${Date.now()}`;
  const seasonId = `season_${Date.now()}_1`;
  const now = new Date().toISOString();

  runTransaction(leagueDb, () => {
    dbRun(
      leagueDb,
      `INSERT INTO leagues (league_id, name, team_count, roster_size, team_budget, include_custom_characters, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [leagueId, config.leagueName, config.teamCount, config.rosterSize, config.teamBudget, customParam, now]
    );

    dbRun(
      leagueDb,
      `INSERT INTO seasons (season_id, league_id, season_number, status, created_at)
       VALUES (?, ?, 1, 'DRAFTING', ?)`,
      [seasonId, leagueId, now]
    );

    const allPlayers = dbAll(leagueDb, 'SELECT * FROM players');
    for (const p of allPlayers) {
      dbRun(
        leagueDb,
        `INSERT INTO league_player_state (
          league_id, player_id, curr_pitch, curr_bat, curr_field, curr_run,
          historical_draft_price, current_market_value, previous_market_value, last_value_reason
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'Initial baseline valuation')`,
        [leagueId, p.player_id, p.orig_pitch, p.orig_bat, p.orig_field, p.orig_run, p.baseline_value, p.baseline_value]
      );
    }

    const selectedTeams = require('./seedData').DEFAULT_12_FRANCHISES.slice(0, config.teamCount);
    for (const t of selectedTeams) {
      const tId = `${leagueId}_${t.teamId}`;
      dbRun(
        leagueDb,
        `INSERT INTO teams (
          team_id, league_id, franchise_name, short_name, original_team_identity,
          captain_player_id, primary_color, secondary_color, cpu_personality,
          budget_total, budget_remaining, logo_sheet_crop
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tId, leagueId, t.franchiseName, t.shortName, t.originalTeamIdentity,
          t.captainPlayerId, t.primaryColor, t.secondaryColor, t.cpuPersonality,
          config.teamBudget, config.teamBudget, JSON.stringify({ banner: t.bannerCrop, emblem: t.emblemCrop })
        ]
      );
      dbRun(
        leagueDb,
        `INSERT INTO rosters (season_id, team_id, player_id, acquired_via, draft_price)
         VALUES (?, ?, ?, 'CAPTAIN_LOCK', 0)`,
        [seasonId, tId, t.captainPlayerId]
      );
    }

    const teamIds = selectedTeams.map((t: any) => `${leagueId}_${t.teamId}`);
    const matchups: { away: string; home: string }[] = [];
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const swapHomeAway = (i + j) % 2 === 0;
        matchups.push({
          away: swapHomeAway ? teamIds[i] : teamIds[j],
          home: swapHomeAway ? teamIds[j] : teamIds[i]
        });
      }
    }

    matchups.forEach((m, idx) => {
      const randomlyAssignedTeam = Math.random() < 0.5 ? m.away : m.home;
      dbRun(
        leagueDb,
        `INSERT INTO games (
          game_id, season_id, game_number, stage, away_team_id, home_team_id, user_controlled_team_id, status
        ) VALUES (?, ?, ?, 'REGULAR', ?, ?, ?, 'SCHEDULED')`,
        [`${seasonId}_gm_${idx + 1}`, seasonId, idx + 1, m.away, m.home, randomlyAssignedTeam]
      );
    });
  });

  return { valid: true, leagueId, seasonId, eligibleCount, requiredSlots };
});

// 4. Confirm Spreadsheet Import
ipcMain.handle('importer:confirmImport', (_e, payload: {
  gameId: string;
  seasonId: string;
  leagueId: string;
  preview: ReturnType<typeof parseSluggersTrackerWorkbook>;
  manualPlayerMappings: Record<string, string>;
}) => {
  const game = dbGet(leagueDb, 'SELECT * FROM games WHERE game_id = ?', [payload.gameId]);
  if (!game) throw new Error('Scheduled game not found.');

  runTransaction(leagueDb, () => {
    for (const [rawName, pid] of Object.entries(payload.manualPlayerMappings)) {
      dbRun(leagueDb, 'INSERT OR REPLACE INTO spreadsheet_aliases (alias_name, player_id) VALUES (?, ?)', [
        rawName.trim().toLowerCase(),
        pid
      ]);
    }

    dbRun(leagueDb, 'DELETE FROM player_game_batting_fielding WHERE game_id = ?', [payload.gameId]);
    dbRun(leagueDb, 'DELETE FROM player_game_pitching WHERE game_id = ?', [payload.gameId]);

    dbRun(
      leagueDb,
      `UPDATE games
       SET status = 'COMPLETED', away_score = ?, home_score = ?, stadium = ?, innings_played = ?,
           scorecard_json = ?, imported_file_name = ?, imported_file_hash = ?, raw_workbook_json = ?, completed_at = ?
       WHERE game_id = ?`,
      [
        payload.preview.awayScore,
        payload.preview.homeScore,
        payload.preview.stadium,
        payload.preview.scorecard.awayInnings.length,
        JSON.stringify(payload.preview.scorecard),
        payload.preview.fileName,
        payload.preview.fileHash,
        JSON.stringify(payload.preview),
        new Date().toISOString(),
        payload.gameId
      ]
    );

    for (const r of payload.preview.battingFieldingRows) {
      const pid = r.matchedPlayerId || payload.manualPlayerMappings[r.rawPlayerName];
      if (!pid) throw new Error(`Unmatched player "${r.rawPlayerName}" cannot be imported.`);
      const isAway = payload.preview.awayTeamFull.toLowerCase().includes(r.rawTeamShort.toLowerCase());
      const teamId = isAway ? game.away_team_id : game.home_team_id;

      dbRun(
        leagueDb,
        `INSERT INTO player_game_batting_fielding VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.gameId, payload.seasonId, teamId, pid, r.position,
          r.atBats, r.plateAppearances, r.runs, r.hits, r.rbi, r.strikeouts, r.walks, r.hitByPitch,
          r.singles, r.doubles, r.triples, r.homeRuns, r.hr1, r.hr2, r.hr3, r.grandSlams, r.itpHomeRuns,
          r.totalBases, r.sacFlys, r.dpHitInto, r.tpHitInto, r.buddyJumpsHitInto,
          r.starSwings, r.starHits, r.starsUsed, r.stolenBases, r.caughtStealing, r.stealAttempts,
          r.putouts, r.assists, r.buddyJumpPutouts, r.buddyJumpAttempts, r.doublePlays, r.triplePlays,
          r.bobbles, r.starBasesHelper
        ]
      );
    }

    for (const p of payload.preview.pitchingRows) {
      const pid = p.matchedPlayerId || payload.manualPlayerMappings[p.rawPlayerName];
      if (!pid) throw new Error(`Unmatched pitcher "${p.rawPlayerName}" cannot be imported.`);
      const isAway = payload.preview.awayTeamFull.toLowerCase().includes(p.rawTeamShort.toLowerCase());
      const teamId = isAway ? game.away_team_id : game.home_team_id;

      dbRun(
        leagueDb,
        `INSERT INTO player_game_pitching VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.gameId, payload.seasonId, teamId, pid,
          p.battersFaced, p.inningsPitched, p.pitches, p.strikes, p.balls,
          p.strikeouts, p.walks, p.beanBalls, p.hitsAllowed, p.runsAllowed,
          p.singlesAllowed, p.doublesAllowed, p.triplesAllowed, p.hrAllowed,
          p.earnedRuns, p.inheritedRuns, p.starPitches, p.starsUsed,
          p.pickoffs, p.pickoffAttempts, p.abAgainstHelper, p.tbAllowedHelper
        ]
      );
    }

    evaluatePlayerDevelopmentAndMarketValue(leagueDb, payload.leagueId, payload.seasonId, payload.gameId);
  });

  return { success: true };
});