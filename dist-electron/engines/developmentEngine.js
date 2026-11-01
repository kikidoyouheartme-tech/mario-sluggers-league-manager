"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePlayerDevelopmentAndMarketValue = evaluatePlayerDevelopmentAndMarketValue;
const dbHelper_1 = require("../dbHelper");
function evaluatePlayerDevelopmentAndMarketValue(leagueDb, leagueId, seasonId, gameId) {
    const league = (0, dbHelper_1.dbGet)(leagueDb, 'SELECT dev_smoothing_factor, dev_min_games FROM leagues WHERE league_id = ?', [leagueId]);
    const alpha = league?.dev_smoothing_factor ?? 0.25;
    const minGames = league?.dev_min_games ?? 3;
    const playersInGame = (0, dbHelper_1.dbAll)(leagueDb, 'SELECT DISTINCT player_id FROM player_game_batting_fielding WHERE game_id = ?', [gameId]);
    const now = new Date().toISOString();
    for (const { player_id } of playersInGame) {
        const orig = (0, dbHelper_1.dbGet)(leagueDb, 'SELECT * FROM players WHERE player_id = ?', [player_id]);
        const state = (0, dbHelper_1.dbGet)(leagueDb, 'SELECT * FROM league_player_state WHERE league_id = ? AND player_id = ?', [leagueId, player_id]);
        if (!orig || !state)
            continue;
        const bf = (0, dbHelper_1.dbGet)(leagueDb, `
        SELECT
          COUNT(*) as gp,
          SUM(at_bats) as ab,
          SUM(plate_appearances) as pa,
          SUM(hits) as h,
          SUM(home_runs) as hr,
          SUM(total_bases) as tb,
          SUM(walks + hit_by_pitch) as bb,
          SUM(stolen_bases) as sb,
          SUM(caught_stealing) as cs,
          SUM(putouts + assists + buddy_jump_putouts) as def_plays,
          SUM(bobbles) as bobbles
        FROM player_game_batting_fielding
        WHERE season_id = ? AND player_id = ?
      `, [seasonId, player_id]);
        const pit = (0, dbHelper_1.dbGet)(leagueDb, `
        SELECT
          COUNT(*) as gp_pit,
          SUM(innings_pitched) as ip,
          SUM(earned_runs) as er,
          SUM(strikeouts) as so,
          SUM(walks + bean_balls) as bb,
          SUM(hits_allowed) as ha
        FROM player_game_pitching
        WHERE season_id = ? AND player_id = ?
      `, [seasonId, player_id]);
        if (!bf || bf.gp < minGames)
            continue;
        const clampRating = (val) => Math.max(1.0, Math.min(10.0, Number(val.toFixed(2))));
        let newBat = state.curr_bat;
        if (bf.ab >= 6) {
            const avg = bf.h / bf.ab;
            const slg = bf.tb / bf.ab;
            const ops = avg + slg;
            const targetBat = orig.orig_bat + (ops - 0.70) * 2.2;
            newBat = clampRating(state.curr_bat * (1 - alpha) + targetBat * alpha);
            if (Math.abs(newBat - state.curr_bat) >= 0.1) {
                (0, dbHelper_1.dbRun)(leagueDb, `INSERT INTO development_history (
            league_id, season_id, game_id, player_id, attribute_changed,
            previous_value, new_value, games_considered, relevant_performance, reason, logged_at
          ) VALUES (?, ?, ?, ?, 'Bat', ?, ?, ?, ?, ?, ?)`, [
                    leagueId, seasonId, gameId, player_id,
                    state.curr_bat, newBat, bf.gp,
                    `AVG ${avg.toFixed(3)}, SLG ${slg.toFixed(3)}, ${bf.hr} HR in ${bf.ab} AB`,
                    newBat > state.curr_bat ? 'Sustained high output increased Bat rating.' : 'Extended slump reduced Bat rating.',
                    now
                ]);
            }
        }
        let newRun = state.curr_run;
        const netSteals = bf.sb - bf.cs * 1.5;
        const targetRun = orig.orig_run + netSteals * 0.18;
        newRun = clampRating(state.curr_run * (1 - alpha) + targetRun * alpha);
        if (Math.abs(newRun - state.curr_run) >= 0.1) {
            (0, dbHelper_1.dbRun)(leagueDb, `INSERT INTO development_history (
          league_id, season_id, game_id, player_id, attribute_changed,
          previous_value, new_value, games_considered, relevant_performance, reason, logged_at
        ) VALUES (?, ?, ?, ?, 'Run', ?, ?, ?, ?, ?, ?)`, [
                leagueId, seasonId, gameId, player_id,
                state.curr_run, newRun, bf.gp,
                `${bf.sb} SB / ${bf.cs} CS over ${bf.gp} games`,
                newRun > state.curr_run ? 'Efficient baserunning boosted Run rating.' : 'Baserunning outs lowered Run rating.',
                now
            ]);
        }
        let newField = state.curr_field;
        const defRatio = (bf.def_plays - bf.bobbles * 2.5) / Math.max(1, bf.gp);
        const targetField = orig.orig_field + (defRatio - 1.5) * 0.35;
        newField = clampRating(state.curr_field * (1 - alpha) + targetField * alpha);
        if (Math.abs(newField - state.curr_field) >= 0.1) {
            (0, dbHelper_1.dbRun)(leagueDb, `INSERT INTO development_history (
          league_id, season_id, game_id, player_id, attribute_changed,
          previous_value, new_value, games_considered, relevant_performance, reason, logged_at
        ) VALUES (?, ?, ?, ?, 'Field', ?, ?, ?, ?, ?, ?)`, [
                leagueId, seasonId, gameId, player_id,
                state.curr_field, newField, bf.gp,
                `${bf.def_plays} PO+A vs ${bf.bobbles} Bobbles`,
                newField > state.curr_field ? 'Clean defensive plays improved Field rating.' : 'Bobbles impacted Field rating.',
                now
            ]);
        }
        let newPitch = state.curr_pitch;
        if (pit && pit.ip >= 5) {
            const era7 = (pit.er * 7) / pit.ip;
            const whip = (pit.bb + pit.ha) / pit.ip;
            const targetPitch = orig.orig_pitch + (3.0 - era7) * 0.3 + (1.2 - whip) * 0.6;
            newPitch = clampRating(state.curr_pitch * (1 - alpha) + targetPitch * alpha);
            if (Math.abs(newPitch - state.curr_pitch) >= 0.1) {
                (0, dbHelper_1.dbRun)(leagueDb, `INSERT INTO development_history (
            league_id, season_id, game_id, player_id, attribute_changed,
            previous_value, new_value, games_considered, relevant_performance, reason, logged_at
          ) VALUES (?, ?, ?, ?, 'Pitch', ?, ?, ?, ?, ?, ?)`, [
                    leagueId, seasonId, gameId, player_id,
                    state.curr_pitch, newPitch, pit.gp_pit,
                    `${pit.ip.toFixed(1)} IP, ERA-7 ${era7.toFixed(2)}, WHIP ${whip.toFixed(2)}, ${pit.so} K`,
                    newPitch > state.curr_pitch ? 'Dominant run prevention elevated Pitch rating.' : 'High earned runs lowered Pitch rating.',
                    now
                ]);
            }
        }
        const currSum = newPitch + newBat + newField + newRun;
        const origSum = orig.orig_pitch + orig.orig_bat + orig.orig_field + orig.orig_run;
        const ratingDeltaBonus = (currSum - origSum) * 14;
        const perfBonus = (bf.h * 2.5 + bf.hr * 8 + bf.rbi * 3 + bf.def_plays * 1.2 - bf.bobbles * 4) / Math.max(1, bf.gp);
        const rawTargetValue = orig.baseline_value + ratingDeltaBonus + perfBonus * 3;
        const newMarketValue = Math.max(30, Math.round(state.current_market_value * 0.75 + rawTargetValue * 0.25));
        const valReason = newMarketValue >= state.current_market_value
            ? `Value rose (${state.current_market_value} → ${newMarketValue}) on ${bf.gp}G performance.`
            : `Value dipped (${state.current_market_value} → ${newMarketValue}) following recent regression.`;
        (0, dbHelper_1.dbRun)(leagueDb, `UPDATE league_player_state
       SET curr_pitch = ?, curr_bat = ?, curr_field = ?, curr_run = ?,
           previous_market_value = current_market_value,
           current_market_value = ?,
           last_value_reason = ?
       WHERE league_id = ? AND player_id = ?`, [newPitch, newBat, newField, newRun, newMarketValue, valReason, leagueId, player_id]);
    }
}
