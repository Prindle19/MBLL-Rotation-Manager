import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Edit2 } from 'lucide-react';

export default function PitchCounts() {
  const { selectedTeam: team } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);

  const getManasquanDate = () => {
    return new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };

  const [newGameDate, setNewGameDate] = useState(getManasquanDate());
  const [opponent, setOpponent] = useState('');
  const [pitchCounts, setPitchCounts] = useState<Record<string, number>>({});
  const [selectedGame, setSelectedGame] = useState<any>(null);
  
  useEffect(() => {
    if (team) {
      fetchData();
    }
  }, [team]);

  const fetchData = async () => {
    try {
      const [rRes, tRes, gRes] = await Promise.all([
        api.get(`/api/roster/${team?.id}`),
        api.get('/api/teams'),
        api.get(`/api/games/${team?.id}`)
      ]);
      setRoster(rRes.data.roster);
      setAllTeams(tRes.data.teams);
      const allGames = gRes.data.games.sort((a: any, b: any) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.version_time || 0) - (a.version_time || 0);
      });

      const grouped: any[] = [];
      const seenParents = new Set();
      allGames.forEach((g: any) => {
        const parentId = g.parent_game_id || g.id;
        if (!seenParents.has(parentId)) {
          seenParents.add(parentId);
          grouped.push(g);
        }
      });
      setGames(grouped);
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  const loadGameForEdit = (game: any) => {
    setSelectedGame(game);
    setNewGameDate(game.date);
    setOpponent(game.opponent || '');
    setPitchCounts(game.pitchCounts || {});
  };

  const clearForm = () => {
    setSelectedGame(null);
    setNewGameDate(getManasquanDate());
    setOpponent('');
    setPitchCounts({});
  };

  const savePastGame = async () => {
    if (!newGameDate) return alert("Please select a date");
    if (!opponent) return alert("Please select an opponent");
    
    // Only save players who actually pitched
    const activePitchCounts = Object.fromEntries(
      Object.entries(pitchCounts).filter(([_, count]) => count > 0)
    );

    const gameToSave = {
      ...(selectedGame || {}),
      team_id: team?.id,
      date: newGameDate,
      opponent,
      pitchCounts: activePitchCounts,
      is_past_entry: selectedGame ? selectedGame.is_past_entry : true
    };

    await api.post('/api/games', gameToSave);
    
    clearForm();
    fetchData();
  };

  if (!team) return <div className="glass-panel" style={{textAlign: 'center', padding: '50px'}}>You have not been assigned a team yet.</div>;

  const opponentTeams = allTeams.filter(t => t.League === team.League && t.id !== team.id);

  return (
    <div className="pitch-counts-layout">
      <div className="glass-panel">
        <h2>{selectedGame ? 'Edit Game Pitch Counts' : 'Add Past Game / Pitch Counts'}</h2>
        <div style={{display:'flex', gap:'10px', marginBottom:'20px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '2px', flex: 1}}>
            <input type="date" className="input-field" value={newGameDate} onChange={e => setNewGameDate(e.target.value)} disabled={!!selectedGame} />
            <span style={{fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic'}}>Manasquan Time</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '2px', flex: 1}}>
            <select 
              className="select-field" 
              value={opponent} 
              onChange={e => setOpponent(e.target.value)}
            >
              <option value="">Select Opponent...</option>
              {opponentTeams.map(t => (
                <option key={t.id} value={t.id}>{t.Team_Name}</option>
              ))}
            </select>
          </div>
          <button className="btn" onClick={savePastGame} style={{height: '38px'}}>Save</button>
          {selectedGame && (
            <button className="btn btn-danger" onClick={clearForm} style={{height: '38px'}}>Cancel</button>
          )}
        </div>

        <div style={{maxHeight: '400px', overflowY: 'auto'}}>
          <table>
            <thead><tr><th>Player</th><th>Pitches Thrown</th></tr></thead>
            <tbody>
              {roster.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    <input 
                      type="number" 
                      min="0"
                      className="input-field" 
                      style={{width: '80px', padding: '6px'}}
                      value={pitchCounts[p.id] || ''}
                      onChange={e => setPitchCounts({...pitchCounts, [p.id]: parseInt(e.target.value) || 0})}
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel">
        <h2>Game History</h2>
        {games.length === 0 ? (
          <p style={{color: 'var(--text-secondary)'}}>No games recorded.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {games.map(g => {
              const oppName = allTeams.find(t => t.id === g.opponent)?.Team_Name || g.opponent || 'Unknown Opponent';
              return (
                <div key={g.id} style={{background: 'rgba(15,23,42,0.8)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <h3 style={{margin: 0}}>{g.date} vs {oppName}</h3>
                    <button 
                      className="btn" 
                      style={{padding: '4px 8px', fontSize: '12px'}} 
                      onClick={() => loadGameForEdit(g)}
                    >
                      <Edit2 size={12} style={{marginRight: '4px'}} /> Edit
                    </button>
                  </div>
                  {g.pitchCounts && Object.keys(g.pitchCounts).length > 0 ? (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                      {Object.entries(g.pitchCounts).map(([pid, count]) => {
                        const player = roster.find(r => r.id === pid);
                        return (
                          <div key={pid} style={{fontSize: '14px', color: 'var(--text-secondary)'}}>
                            <strong style={{color: 'var(--text-primary)'}}>{player ? player.name : 'Unknown'}:</strong> {count as number} pitches
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{margin: 0, fontSize: '14px', color: 'var(--text-secondary)'}}>No pitches recorded.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
