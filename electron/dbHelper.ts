import { LeagueDatabase } from './db';

export function dbAll(leagueDb: LeagueDatabase, sql: string, params: any[] = []): any[] {
  try {
    const stmt = leagueDb.db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('dbAll error:', sql, params, err);
    return [];
  }
}

export function dbGet(leagueDb: LeagueDatabase, sql: string, params: any[] = []): any | undefined {
  const rows = dbAll(leagueDb, sql, params);
  return rows[0];
}

export function dbRun(leagueDb: LeagueDatabase, sql: string, params: any[] = []): void {
  try {
    leagueDb.db.run(sql, params);
    leagueDb.saveToDisk();
  } catch (err) {
    console.error('dbRun error:', sql, params, err);
    throw err;
  }
}

export function runTransaction(leagueDb: LeagueDatabase, callback: () => void): void {
  leagueDb.db.exec('BEGIN TRANSACTION;');
  try {
    callback();
    leagueDb.db.exec('COMMIT;');
    leagueDb.saveToDisk();
  } catch (err) {
    leagueDb.db.exec('ROLLBACK;');
    console.error('Transaction rolled back due to error:', err);
    throw err;
  }
}