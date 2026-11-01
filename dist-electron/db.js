"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeagueDatabase = void 0;
const sql_js_1 = __importDefault(require("sql.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const seedData_1 = require("./seedData");
class LeagueDatabase {
    db;
    dbPath;
    SQL;
    constructor(userDataPath) {
        const dbDir = path_1.default.join(userDataPath, 'database');
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        this.dbPath = path_1.default.join(dbDir, 'sluggers_league_manager.sqlite');
    }
    async init() {
        this.SQL = await (0, sql_js_1.default)();
        if (fs_1.default.existsSync(this.dbPath)) {
            const fileBuffer = fs_1.default.readFileSync(this.dbPath);
            this.db = new this.SQL.Database(fileBuffer);
        }
        else {
            this.db = new this.SQL.Database();
        }
        this.runMigrations();
        this.seedBaseDataIfNeeded();
        this.saveToDisk();
    }
    saveToDisk() {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs_1.default.writeFileSync(this.dbPath, buffer);
    }
    runMigrations() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS players (
        player_id TEXT PRIMARY KEY,
        source_name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        original_team TEXT NOT NULL,
        archetype TEXT NOT NULL,
        orig_pitch INTEGER NOT NULL,
        orig_bat INTEGER NOT NULL,
        orig_field INTEGER NOT NULL,
        orig_run INTEGER NOT NULL,
        special_ability TEXT NOT NULL,
        is_captain INTEGER NOT NULL DEFAULT 0,
        is_custom INTEGER NOT NULL DEFAULT 0,
        is_color_variant INTEGER NOT NULL DEFAULT 0,
        base_character_id TEXT,
        baseline_value INTEGER NOT NULL DEFAULT 100
      );

      CREATE TABLE IF NOT EXISTS chemistry_relationships (
        player_a_id TEXT NOT NULL,
        player_b_id TEXT NOT NULL,
        chemistry_status TEXT NOT NULL CHECK(chemistry_status IN ('Good', 'Bad', 'Neutral')),
        is_official INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (player_a_id, player_b_id)
      );

      CREATE TABLE IF NOT EXISTS asset_mappings (
        entity_id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        source_file TEXT,
        sheet_file TEXT,
        crop_x INTEGER,
        crop_y INTEGER,
        crop_w INTEGER,
        crop_h INTEGER,
        css_filter TEXT DEFAULT 'none',
        needs_manual_assignment INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS spreadsheet_aliases (
        alias_name TEXT PRIMARY KEY,
        player_id TEXT NOT NULL REFERENCES players(player_id)
      );

      CREATE TABLE IF NOT EXISTS leagues (
        league_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        team_count INTEGER NOT NULL DEFAULT 12,
        roster_size INTEGER NOT NULL DEFAULT 6,
        team_budget INTEGER NOT NULL DEFAULT 1000,
        playoff_teams INTEGER NOT NULL DEFAULT 8,
        include_custom_characters INTEGER NOT NULL DEFAULT 1,
        tie_breaker_order TEXT NOT NULL DEFAULT 'HEAD_TO_HEAD,RUN_DIFF,RUNS_SCORED',
        dev_smoothing_factor REAL NOT NULL DEFAULT 0.25,
        dev_min_games INTEGER NOT NULL DEFAULT 3,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS seasons (
        season_id TEXT PRIMARY KEY,
        league_id TEXT NOT NULL REFERENCES leagues(league_id),
        season_number INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'SETUP',
        champion_team_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS teams (
        team_id TEXT PRIMARY KEY,
        league_id TEXT NOT NULL REFERENCES leagues(league_id),
        franchise_name TEXT NOT NULL,
        short_name TEXT NOT NULL,
        original_team_identity TEXT NOT NULL,
        captain_player_id TEXT NOT NULL REFERENCES players(player_id),
        primary_color TEXT NOT NULL,
        secondary_color TEXT NOT NULL,
        cpu_personality TEXT NOT NULL,
        budget_total INTEGER NOT NULL,
        budget_remaining INTEGER NOT NULL,
        logo_sheet_crop TEXT
      );

      CREATE TABLE IF NOT EXISTS league_player_state (
        league_id TEXT NOT NULL REFERENCES leagues(league_id),
        player_id TEXT NOT NULL REFERENCES players(player_id),
        curr_pitch REAL NOT NULL,
        curr_bat REAL NOT NULL,
        curr_field REAL NOT NULL,
        curr_run REAL NOT NULL,
        historical_draft_price INTEGER,
        current_market_value INTEGER NOT NULL,
        previous_market_value INTEGER NOT NULL,
        last_value_reason TEXT,
        PRIMARY KEY (league_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS rosters (
        season_id TEXT NOT NULL REFERENCES seasons(season_id),
        team_id TEXT NOT NULL REFERENCES teams(team_id),
        player_id TEXT NOT NULL REFERENCES players(player_id),
        acquired_via TEXT NOT NULL,
        draft_price INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (season_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS draft_transactions (
        transaction_id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL REFERENCES seasons(season_id),
        pick_order INTEGER NOT NULL,
        player_id TEXT NOT NULL REFERENCES players(player_id),
        winning_team_id TEXT NOT NULL REFERENCES teams(team_id),
        winning_bid INTEGER NOT NULL,
        cpu_explanation TEXT NOT NULL,
        bid_history_json TEXT NOT NULL,
        is_undone INTEGER NOT NULL DEFAULT 0,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS games (
        game_id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL REFERENCES seasons(season_id),
        game_number INTEGER NOT NULL,
        stage TEXT NOT NULL DEFAULT 'REGULAR',
        playoff_matchup_code TEXT,
        away_team_id TEXT NOT NULL REFERENCES teams(team_id),
        home_team_id TEXT NOT NULL REFERENCES teams(team_id),
        user_controlled_team_id TEXT NOT NULL REFERENCES teams(team_id),
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        away_score INTEGER,
        home_score INTEGER,
        stadium TEXT,
        innings_played INTEGER,
        scorecard_json TEXT,
        imported_file_name TEXT,
        imported_file_hash TEXT,
        raw_workbook_json TEXT,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS player_game_batting_fielding (
        game_id TEXT NOT NULL REFERENCES games(game_id),
        season_id TEXT NOT NULL REFERENCES seasons(season_id),
        team_id TEXT NOT NULL REFERENCES teams(team_id),
        player_id TEXT NOT NULL REFERENCES players(player_id),
        position TEXT NOT NULL,
        at_bats INTEGER NOT NULL DEFAULT 0,
        plate_appearances INTEGER NOT NULL DEFAULT 0,
        runs INTEGER NOT NULL DEFAULT 0,
        hits INTEGER NOT NULL DEFAULT 0,
        rbi INTEGER NOT NULL DEFAULT 0,
        strikeouts INTEGER NOT NULL DEFAULT 0,
        walks INTEGER NOT NULL DEFAULT 0,
        hit_by_pitch INTEGER NOT NULL DEFAULT 0,
        singles INTEGER NOT NULL DEFAULT 0,
        doubles INTEGER NOT NULL DEFAULT 0,
        triples INTEGER NOT NULL DEFAULT 0,
        home_runs INTEGER NOT NULL DEFAULT 0,
        hr_1r INTEGER NOT NULL DEFAULT 0,
        hr_2r INTEGER NOT NULL DEFAULT 0,
        hr_3r INTEGER NOT NULL DEFAULT 0,
        grand_slams INTEGER NOT NULL DEFAULT 0,
        itp_home_runs INTEGER NOT NULL DEFAULT 0,
        total_bases INTEGER NOT NULL DEFAULT 0,
        sac_flys INTEGER NOT NULL DEFAULT 0,
        dp_hit_into INTEGER NOT NULL DEFAULT 0,
        tp_hit_into INTEGER NOT NULL DEFAULT 0,
        buddy_jumps_hit_into INTEGER NOT NULL DEFAULT 0,
        star_swings INTEGER NOT NULL DEFAULT 0,
        star_hits INTEGER NOT NULL DEFAULT 0,
        stars_used INTEGER NOT NULL DEFAULT 0,
        stolen_bases INTEGER NOT NULL DEFAULT 0,
        caught_stealing INTEGER NOT NULL DEFAULT 0,
        steal_attempts INTEGER NOT NULL DEFAULT 0,
        putouts INTEGER NOT NULL DEFAULT 0,
        assists INTEGER NOT NULL DEFAULT 0,
        buddy_jump_putouts INTEGER NOT NULL DEFAULT 0,
        buddy_jump_attempts INTEGER NOT NULL DEFAULT 0,
        double_plays INTEGER NOT NULL DEFAULT 0,
        triple_plays INTEGER NOT NULL DEFAULT 0,
        bobbles INTEGER NOT NULL DEFAULT 0,
        star_bases_helper INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (game_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS player_game_pitching (
        game_id TEXT NOT NULL REFERENCES games(game_id),
        season_id TEXT NOT NULL REFERENCES seasons(season_id),
        team_id TEXT NOT NULL REFERENCES teams(team_id),
        player_id TEXT NOT NULL REFERENCES players(player_id),
        batters_faced INTEGER NOT NULL DEFAULT 0,
        innings_pitched REAL NOT NULL DEFAULT 0,
        pitches INTEGER NOT NULL DEFAULT 0,
        strikes INTEGER NOT NULL DEFAULT 0,
        balls INTEGER NOT NULL DEFAULT 0,
        strikeouts INTEGER NOT NULL DEFAULT 0,
        walks INTEGER NOT NULL DEFAULT 0,
        bean_balls INTEGER NOT NULL DEFAULT 0,
        hits_allowed INTEGER NOT NULL DEFAULT 0,
        runs_allowed INTEGER NOT NULL DEFAULT 0,
        singles_allowed INTEGER NOT NULL DEFAULT 0,
        doubles_allowed INTEGER NOT NULL DEFAULT 0,
        triples_allowed INTEGER NOT NULL DEFAULT 0,
        hr_allowed INTEGER NOT NULL DEFAULT 0,
        earned_runs INTEGER NOT NULL DEFAULT 0,
        inherited_runs INTEGER NOT NULL DEFAULT 0,
        star_pitches INTEGER NOT NULL DEFAULT 0,
        stars_used INTEGER NOT NULL DEFAULT 0,
        pickoffs INTEGER NOT NULL DEFAULT 0,
        pickoff_attempts INTEGER NOT NULL DEFAULT 0,
        ab_against_helper INTEGER NOT NULL DEFAULT 0,
        tb_allowed_helper INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (game_id, player_id)
      );

      CREATE TABLE IF NOT EXISTS development_history (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id TEXT NOT NULL REFERENCES leagues(league_id),
        season_id TEXT NOT NULL REFERENCES seasons(season_id),
        game_id TEXT,
        player_id TEXT NOT NULL REFERENCES players(player_id),
        attribute_changed TEXT NOT NULL,
        previous_value REAL NOT NULL,
        new_value REAL NOT NULL,
        games_considered INTEGER NOT NULL,
        relevant_performance TEXT NOT NULL,
        reason TEXT NOT NULL,
        logged_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS awards (
        award_id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL REFERENCES seasons(season_id),
        category TEXT NOT NULL,
        player_id TEXT REFERENCES players(player_id),
        team_id TEXT REFERENCES teams(team_id),
        stat_summary TEXT NOT NULL,
        is_manual_override INTEGER NOT NULL DEFAULT 0
      );
    `);
    }
    seedBaseDataIfNeeded() {
        const res = this.db.exec('SELECT COUNT(*) as c FROM players');
        const count = res[0]?.values[0]?.[0] || 0;
        if (count > 0)
            return;
        this.db.exec('BEGIN TRANSACTION;');
        try {
            for (const c of seedData_1.INITIAL_CHARACTERS) {
                const totalRating = c.pitch + c.bat + c.field + c.run;
                const baselineVal = Math.round(totalRating * 6 + (c.isCaptain ? 45 : 0));
                this.db.run(`INSERT INTO players (
            player_id, source_name, display_name, original_team, archetype,
            orig_pitch, orig_bat, orig_field, orig_run, special_ability,
            is_captain, is_custom, is_color_variant, base_character_id, baseline_value
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    c.playerId, c.sourceName, c.displayName, c.originalTeam, c.archetype,
                    c.pitch, c.bat, c.field, c.run, c.specialAbility,
                    c.isCaptain ? 1 : 0, c.isCustom ? 1 : 0, c.isColorVariant ? 1 : 0,
                    c.baseCharacterId, baselineVal
                ]);
                const cropX = c.iconGridCell ? 1 + c.iconGridCell[1] * 49 : null;
                const cropY = c.iconGridCell ? 1 + c.iconGridCell[0] * 52 : null;
                this.db.run(`INSERT INTO asset_mappings (
            entity_id, entity_type, source_file, sheet_file, crop_x, crop_y, crop_w, crop_h, css_filter, needs_manual_assignment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    c.playerId,
                    'player_portrait',
                    c.portraitFile,
                    c.iconGridCell ? 'mariosl/characters/charactericons.png' : null,
                    cropX,
                    cropY,
                    c.iconGridCell ? 48 : null,
                    c.iconGridCell ? 51 : null,
                    c.cssFilter,
                    c.portraitFile === null ? 1 : 0
                ]);
                this.db.run('INSERT OR REPLACE INTO spreadsheet_aliases (alias_name, player_id) VALUES (?, ?)', [
                    c.sourceName.toLowerCase(),
                    c.playerId
                ]);
                this.db.run('INSERT OR REPLACE INTO spreadsheet_aliases (alias_name, player_id) VALUES (?, ?)', [
                    c.displayName.toLowerCase(),
                    c.playerId
                ]);
            }
            for (const a of seedData_1.INITIAL_CHARACTERS) {
                for (const b of seedData_1.INITIAL_CHARACTERS) {
                    if (a.playerId !== b.playerId && a.baseCharacterId && a.baseCharacterId === b.baseCharacterId && !a.isCustom && !b.isCustom) {
                        this.db.run('INSERT OR REPLACE INTO chemistry_relationships (player_a_id, player_b_id, chemistry_status, is_official) VALUES (?, ?, ?, 1)', [
                            a.playerId, b.playerId, 'Good'
                        ]);
                    }
                }
            }
            for (const pair of seedData_1.OFFICIAL_CHEMISTRY_PAIRS) {
                this.db.run('INSERT OR REPLACE INTO chemistry_relationships (player_a_id, player_b_id, chemistry_status, is_official) VALUES (?, ?, ?, 1)', [
                    pair.playerA, pair.playerB, pair.status
                ]);
                this.db.run('INSERT OR REPLACE INTO chemistry_relationships (player_a_id, player_b_id, chemistry_status, is_official) VALUES (?, ?, ?, 1)', [
                    pair.playerB, pair.playerA, pair.status
                ]);
            }
            for (const [alias, pid] of Object.entries(seedData_1.DEFAULT_SPREADSHEET_ALIASES)) {
                this.db.run('INSERT OR REPLACE INTO spreadsheet_aliases (alias_name, player_id) VALUES (?, ?)', [
                    alias.toLowerCase(),
                    pid
                ]);
            }
            this.db.exec('COMMIT;');
        }
        catch (err) {
            this.db.exec('ROLLBACK;');
            throw err;
        }
    }
    createBackup(backupDestPath) {
        this.saveToDisk();
        fs_1.default.copyFileSync(this.dbPath, backupDestPath);
        return { success: true, path: backupDestPath };
    }
}
exports.LeagueDatabase = LeagueDatabase;
