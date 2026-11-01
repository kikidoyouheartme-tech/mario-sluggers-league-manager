"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbAll = dbAll;
exports.dbGet = dbGet;
exports.dbRun = dbRun;
exports.runTransaction = runTransaction;
function dbAll(leagueDb, sql, params = []) {
    try {
        const stmt = leagueDb.db.prepare(sql);
        if (params.length > 0)
            stmt.bind(params);
        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    }
    catch (err) {
        console.error('dbAll error:', sql, params, err);
        return [];
    }
}
function dbGet(leagueDb, sql, params = []) {
    const rows = dbAll(leagueDb, sql, params);
    return rows[0];
}
function dbRun(leagueDb, sql, params = []) {
    try {
        leagueDb.db.run(sql, params);
        leagueDb.saveToDisk();
    }
    catch (err) {
        console.error('dbRun error:', sql, params, err);
        throw err;
    }
}
function runTransaction(leagueDb, callback) {
    leagueDb.db.exec('BEGIN TRANSACTION;');
    try {
        callback();
        leagueDb.db.exec('COMMIT;');
        leagueDb.saveToDisk();
    }
    catch (err) {
        leagueDb.db.exec('ROLLBACK;');
        console.error('Transaction rolled back due to error:', err);
        throw err;
    }
}
