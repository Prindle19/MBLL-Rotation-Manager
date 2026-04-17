import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function PitchCounts() {
  const { selectedTeam: team } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [newGameDate, setNewGameDate] = useState('');
  const [pitchCounts, setPitchCounts] = useState<Record<string, number>>({});
  
  useEffect(() => {
    if (team) {
      fetchData();
    }
  }, [team]);

  const fetchData = async () => {
    const [gRes, rRes] = await Promise.all([
      api.get(`/api/games/${team.id}`),
      api.get(`/api/roster/${team.id}`)
    ]);
    setGames(gRes.data.games.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setRoster(rRes.data.roster);
  };

  const savePastGame = async () => {
    if (!newGameDate) return alert("Please select a date");
    
    // Only save players who actually pitched
    const activePitchCounts = Object.fromEntries(
      Object.entries(pitchCounts).filter(([_, count]) => count > 0)
    );

    await api.post('/api/games', {
      team_id: team.id,
      date: newGameDate,
      pitchCounts: activePitchCounts,
      is_past_entry: true
    });
    
    setNewGameDate('');
    setPitchCounts({});
    fetchData();
  };

  if (!team) return <div className="glass-panel" style={{textAlign: 'center', padding: '50px'}}>You have not been assigned a team yet.</div>;

  return (
    <div className="grid-layout">
      <div className="glass-panel">
        <h2>Add Past Game / Pitch Counts</h2>
        <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
          <input type="date" className="input-field" value={newGameDate} onChange={e => setNewGameDate(e.target.value)} />
          <button className="btn" onClick={savePastGame}>Save Record</button>
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
            {games.map(g => (
              <div key={g.id} style={{background: 'rgba(15,23,42,0.8)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
                <h3 style={{margin: '0 0 12px 0'}}>{g.date}</h3>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
