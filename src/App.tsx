import React, { useState, useMemo } from 'react';
import {
  INITIAL_CHARACTERS,
  OFFICIAL_CHEMISTRY_PAIRS,
  DEFAULT_12_FRANCHISES,
  SeedCharacter
} from '../electron/seedData';
import { simulateCpuAuctionForPlayer, BidStep } from '../electron/engines/draftEngine';

type NavSection =
  | 'Dashboard'
  | 'League Setup'
  | 'Character Database'
  | 'Teams and Rosters'
  | 'Draft Center'
  | 'Schedule'
  | 'Game Day'
  | 'Spreadsheet Importer'
  | 'Player Statistics'
  | 'Team Statistics'
  | 'Standings'
  | 'Playoffs'
  | 'Awards'
  | 'League History'
  | 'Settings and Asset Manager';

const NAV_ITEMS: NavSection[] = [
  'Dashboard',
  'League Setup',
  'Character Database',
  'Teams and Rosters',
  'Draft Center',
  'Schedule',
  'Game Day',
  'Spreadsheet Importer',
  'Player Statistics',
  'Team Statistics',
  'Standings',
  'Playoffs',
  'Awards',
  'League History',
  'Settings and Asset Manager'
];

// Pre-loaded sample game from supplied "Knights vs Fireballs - 2026-10-31 20-31-19.xlsx"
const SUPPLIED_WORKBOOK_GAME = {
  gameId: 'gm_1',
  gameNumber: 1,
  awayTeamId: 'team_luigi_knights',
  homeTeamId: 'team_mario_fireballs',
  awayTeamName: 'Luigi Knights',
  homeTeamName: 'Mario Fireballs',
  awayScore: 2,
  homeScore: 0,
  userControlledTeamId: 'team_mario_fireballs', // Row 13: Knights=CPU, Fireballs=Player
  stadium: 'Peach Ice Garden - Daytime',
  innings: 5,
  scorecard: {
    away: [0, 1, 0, 0, 1],
    home: [0, 0, 0, 0, 0]
  },
  battingRows: [
    { team: 'Knights', player: 'Green Magikoopa', playerId: 'char_magikoopa_green', pos: '2B', ab: 3, pa: 3, r: 0, h: 1, rbi: 0, so: 0, bb: 0, s: 1, d: 0, t: 0, hr: 0, tb: 1, sb: 0, cs: 0, po: 0, a: 3, dp: 0, bobbles: 1 },
    { team: 'Knights', player: 'Daisy', playerId: 'char_daisy', pos: 'SS', ab: 3, pa: 3, r: 0, h: 2, rbi: 1, so: 0, bb: 0, s: 1, d: 1, t: 0, hr: 0, tb: 3, sb: 0, cs: 0, po: 0, a: 1, dp: 0, bobbles: 0 },
    { team: 'Knights', player: 'Luigi', playerId: 'char_luigi', pos: 'P', ab: 2, pa: 2, r: 0, h: 1, rbi: 0, so: 0, bb: 0, s: 1, d: 0, t: 0, hr: 0, tb: 1, sb: 0, cs: 0, po: 0, a: 0, dp: 0, bobbles: 0 },
    { team: 'Knights', player: 'Goomba', playerId: 'char_goomba', pos: 'CF', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 7, a: 0, dp: 0, bobbles: 0 },
    { team: 'Knights', player: 'Koopa Troopa', playerId: 'char_koopa_green', pos: 'LF', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 1, a: 0, dp: 0, bobbles: 0 },
    { team: 'Knights', player: 'Paragoomba', playerId: 'char_paragoomba', pos: 'RF', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 1, a: 1, dp: 0, bobbles: 0 },
    { team: 'Knights', player: 'Red Pianta', playerId: 'char_pianta_red', pos: 'C', ab: 2, pa: 2, r: 1, h: 1, rbi: 0, so: 0, bb: 0, s: 1, d: 0, t: 0, hr: 0, tb: 1, sb: 0, cs: 0, po: 2, a: 0, dp: 0, bobbles: 0 },
    { team: 'Knights', player: 'Toadsworth', playerId: 'char_toadsworth', pos: '3B', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 1, a: 0, dp: 0, bobbles: 0 },
    { team: 'Knights', player: 'Fire Bro.', playerId: 'char_firebro', pos: '1B', ab: 2, pa: 2, r: 1, h: 2, rbi: 1, so: 0, bb: 0, s: 2, d: 0, t: 0, hr: 0, tb: 2, sb: 0, cs: 0, po: 3, a: 0, dp: 0, bobbles: 1 },
    { team: 'Fireballs', player: 'Magikoopa', playerId: 'char_magikoopa_blue', pos: 'SS', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 2, a: 4, dp: 1, bobbles: 0 },
    { team: 'Fireballs', player: 'Peach', playerId: 'char_peach', pos: '2B', ab: 1, pa: 1, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 3, a: 2, dp: 1, bobbles: 0 },
    { team: 'Fireballs', player: 'Mario', playerId: 'char_mario', pos: 'P', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 2, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 1, a: 0, dp: 0, bobbles: 0 },
    { team: 'Fireballs', player: 'Yellow Yoshi', playerId: 'char_yoshi_yellow', pos: 'RF', ab: 2, pa: 2, r: 0, h: 1, rbi: 0, so: 0, bb: 0, s: 1, d: 0, t: 0, hr: 0, tb: 1, sb: 0, cs: 0, po: 1, a: 0, dp: 0, bobbles: 0 },
    { team: 'Fireballs', player: 'Baby Mario', playerId: 'char_babymario', pos: 'C', ab: 2, pa: 2, r: 0, h: 2, rbi: 0, so: 0, bb: 0, s: 2, d: 0, t: 0, hr: 0, tb: 2, sb: 0, cs: 0, po: 0, a: 0, dp: 0, bobbles: 0 },
    { team: 'Fireballs', player: 'Kritter', playerId: 'char_kritter_green', pos: '1B', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 5, a: 0, dp: 0, bobbles: 1 },
    { team: 'Fireballs', player: 'Blue Noki', playerId: 'char_noki_blue', pos: 'LF', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 2, a: 0, dp: 0, bobbles: 0 },
    { team: 'Fireballs', player: 'Yellow Pianta', playerId: 'char_pianta_yellow', pos: 'CF', ab: 2, pa: 2, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 1, a: 0, dp: 0, bobbles: 2 },
    { team: 'Fireballs', player: 'Dixie Kong', playerId: 'char_dixiekong', pos: '3B', ab: 1, pa: 1, r: 0, h: 0, rbi: 0, so: 0, bb: 0, s: 0, d: 0, t: 0, hr: 0, tb: 0, sb: 0, cs: 0, po: 0, a: 1, dp: 0, bobbles: 0 }
  ],
  pitchingRows: [
    { player: 'Luigi', playerId: 'char_luigi', team: 'Knights', bf: 16, ip: 5, pitches: 28, strikes: 7, so: 2, bb: 0, ha: 3, ra: 0, er: 0, era7: 0.0, era9: 0.0, whip: 0.6 },
    { player: 'Mario', playerId: 'char_mario', team: 'Fireballs', bf: 20, ip: 5, pitches: 32, strikes: 11, so: 0, bb: 0, ha: 7, ra: 2, er: 2, era7: 2.8, era9: 3.6, whip: 1.4 }
  ]
};

export function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('Dashboard');
  const [characters, setCharacters] = useState<SeedCharacter[]>(INITIAL_CHARACTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [archetypeFilter, setArchetypeFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [captainFilter, setCaptainFilter] = useState<string>('ALL');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('char_mario');

  // League Setup State
  const [leagueName, setLeagueName] = useState('Mushroom Kingdom Premier League');
  const [teamCount, setTeamCount] = useState(12);
  const [rosterSize, setRosterSize] = useState(6);
  const [teamBudget, setTeamBudget] = useState(1000);
  const [includeCustom, setIncludeCustom] = useState(true);

  const eligiblePool = useMemo(
    () => characters.filter((c) => includeCustom || !c.isCustom),
    [characters, includeCustom]
  );

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      if (searchQuery && !c.displayName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (archetypeFilter !== 'ALL' && c.archetype !== archetypeFilter) return false;
      if (teamFilter !== 'ALL' && c.originalTeam !== teamFilter) return false;
      if (captainFilter === 'CAPTAIN' && !c.isCaptain) return false;
      if (captainFilter === 'NON_CAPTAIN' && c.isCaptain) return false;
      if (captainFilter === 'CUSTOM' && !c.isCustom) return false;
      return true;
    });
  }, [characters, searchQuery, archetypeFilter, teamFilter, captainFilter]);

  const getChemistry = (idA: string, idB: string): 'Good' | 'Bad' | 'Neutral' => {
    const found = OFFICIAL_CHEMISTRY_PAIRS.find(
      (p) => (p.playerA === idA && p.playerB === idB) || (p.playerA === idB && p.playerB === idA)
    );
    return found ? found.status : 'Neutral';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar Navigation */}
      <aside style={{ width: 260, background: '#111827', borderRight: '1px solid #1F2937', padding: '20px 12px' }}>
        <div style={{ padding: '8px 12px', marginBottom: 20, borderBottom: '2px solid #E52521' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#FBD000', letterSpacing: 1.2 }}>MARIO SUPER SLUGGERS</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>LEAGUE MANAGER</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{leagueName} • Season 1</div>
        </div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            onClick={() => setActiveNav(item)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              marginBottom: 4,
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: activeNav === item ? 700 : 500,
              background: activeNav === item ? '#E52521' : 'transparent',
              color: activeNav === item ? '#FFFFFF' : '#D1D5DB'
            }}
          >
            {item}
          </button>
        ))}
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
        {activeNav === 'Character Database' && (
          <div>
            <h2>Character Database ({filteredCharacters.length} / {characters.length} Eligible Non-Mii Records)</h2>
            {/* Filter Controls */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <input
                placeholder="Search player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 6, background: '#1F2937', color: '#FFF', border: '1px solid #374151' }}
              />
              <select value={archetypeFilter} onChange={(e) => setArchetypeFilter(e.target.value)} style={{ padding: 8, background: '#1F2937', color: '#FFF' }}>
                <option value="ALL">All Archetypes</option>
                <option value="Balanced">Balanced</option>
                <option value="Power">Power</option>
                <option value="Speed">Speed</option>
                <option value="Technique">Technique</option>
              </select>
              <select value={captainFilter} onChange={(e) => setCaptainFilter(e.target.value)} style={{ padding: 8, background: '#1F2937', color: '#FFF' }}>
                <option value="ALL">All Classifications</option>
                <option value="CAPTAIN">Captains Only (12)</option>
                <option value="NON_CAPTAIN">Draftable Non-Captains</option>
                <option value="CUSTOM">Custom / Modded (9)</option>
              </select>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}