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
  const [gameStatus, setGameStatus] = useState<string>('Completed');

  // Double Header States
  const [isDoubleHeader, setIsDoubleHeader] = useState(false);
  const [opponentG2, setOpponentG2] = useState('');
  const [pitchCountsG2, setPitchCountsG2] = useState<Record<string, number>>({});
  
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
    setGameStatus(game.status || 'Completed');
    setIsDoubleHeader(game.isDoubleHeader || false);
    setOpponentG2(game.opponentG2 || '');
    setPitchCountsG2(game.pitchCountsG2 || {});
  };

  const clearForm = () => {
    setSelectedGame(null);
    setNewGameDate(getManasquanDate());
    setOpponent('');
    setPitchCounts({});
    setGameStatus('Completed');
    setIsDoubleHeader(false);
    setOpponentG2('');
    setPitchCountsG2({});
  };

  const savePastGame = async () => {
    if (!newGameDate) return alert("Please select a date");
    if (!opponent) return alert("Please select an opponent");
    if (isDoubleHeader && !opponentG2) return alert("Please select Game 2 opponent");
    
    // Only save players who actually pitched
    const activePitchCounts = Object.fromEntries(
      Object.entries(pitchCounts).filter(([_, count]) => count > 0)
    );
    const activePitchCountsG2 = Object.fromEntries(
      Object.entries(pitchCountsG2).filter(([_, count]) => count > 0)
    );

    const gameToSave = {
      ...(selectedGame || {}),
      team_id: team?.id,
      date: newGameDate,
      opponent,
      pitchCounts: activePitchCounts,
      status: gameStatus,
      is_past_entry: selectedGame ? selectedGame.is_past_entry : true,
      isDoubleHeader,
      opponentG2,
      pitchCountsG2: activePitchCountsG2
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
        
        <div style={{display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}>
            <input 
              type="checkbox" 
              checked={isDoubleHeader} 
              onChange={e => setIsDoubleHeader(e.target.checked)} 
              disabled={!!selectedGame}
              style={{accentColor: 'var(--accent)'}}
            />
            Double-Header
          </label>
        </div>

        <div style={{display:'flex', gap:'10px', marginBottom:'20px', alignItems: 'flex-start', flexWrap: 'wrap'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '2px', flex: 1}}>
            <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>Game Date</span>
            <input type="date" className="input-field" value={newGameDate} onChange={e => setNewGameDate(e.target.value)} disabled={!!selectedGame} />
            <span style={{fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic'}}>Manasquan Time</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '2px', flex: 1}}>
            <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>{isDoubleHeader ? 'Game 1 Opponent' : 'Opponent'}</span>
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
          {isDoubleHeader && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '2px', flex: 1}}>
              <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>Game 2 Opponent</span>
              <select 
                className="select-field" 
                value={opponentG2} 
                onChange={e => setOpponentG2(e.target.value)}
              >
                <option value="">Select Opponent...</option>
                {opponentTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.Team_Name}</option>
                ))}
              </select>
            </div>
          )}
          <button className="btn" onClick={savePastGame} style={{height: '38px', marginTop: '16px'}}>Save</button>
          {selectedGame && (
            <button className="btn btn-danger" onClick={clearForm} style={{height: '38px', marginTop: '16px'}}>Cancel</button>
          )}
        </div>

        {selectedGame && gameStatus !== 'Completed' ? (
          <div style={{padding: '30px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid #ef4444'}}>
            <p style={{marginBottom: '20px', color: 'white', fontSize: '16px'}}>
              ⚠️ This game is currently marked as <strong>{gameStatus}</strong>. You must finalize the game before entering pitch counts.
            </p>
            <button className="btn" style={{justifyContent: 'center'}} onClick={() => setGameStatus('Completed')}>
              Mark Game as Completed
            </button>
          </div>
        ) : (
          <div style={{maxHeight: '400px', overflowY: 'auto'}}>
            <table>
              <thead>
                {isDoubleHeader ? (
                  <tr><th>Player</th><th>G1 Pitches</th><th>G2 Pitches</th></tr>
                ) : (
                  <tr><th>Player</th><th>Pitches Thrown</th></tr>
                )}
              </thead>
              <tbody>
                {roster.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    {isDoubleHeader ? (
                      <>
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
                        <td>
                          <input 
                            type="number" 
                            min="0"
                            className="input-field" 
                            style={{width: '80px', padding: '6px'}}
                            value={pitchCountsG2[p.id] || ''}
                            onChange={e => setPitchCountsG2({...pitchCountsG2, [p.id]: parseInt(e.target.value) || 0})}
                            placeholder="0"
                          />
                        </td>
                      </>
                    ) : (
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
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-panel">
        <h2>Game History</h2>
        {games.length === 0 ? (
          <p style={{color: 'var(--text-secondary)'}}>No games recorded.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {games.map(g => {
              const oppName = allTeams.find(t => t.id === g.opponent)?.Team_Name || g.opponent || 'Unknown Opponent';
              const oppNameG2 = g.isDoubleHeader ? (allTeams.find(t => t.id === g.opponentG2)?.Team_Name || g.opponentG2 || 'Unknown Opponent') : '';
              const isCancelled = g.status === 'Cancelled' || g.status === 'Postponed';
              return (
                <div key={g.id} style={{background: 'rgba(15,23,42,0.8)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative', opacity: isCancelled ? 0.5 : 1}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <h3 style={{margin: 0, textDecoration: isCancelled ? 'line-through' : 'none'}}>
                      {g.date} {g.isDoubleHeader ? `Double-Header: vs ${oppName} & ${oppNameG2}` : `vs ${oppName}`}
                      <span style={{fontSize: '12px', color: isCancelled ? '#ef4444' : 'var(--text-secondary)', marginLeft: '8px', textDecoration: 'none', fontWeight: isCancelled ? 'bold' : 'normal'}}>
                        ({g.status || 'Completed'})
                      </span>
                    </h3>
                    <button 
                      className="btn" 
                      style={{padding: '4px 8px', fontSize: '12px'}} 
                      onClick={() => loadGameForEdit(g)}
                    >
                      <Edit2 size={12} style={{marginRight: '4px'}} /> Edit
                    </button>
                  </div>
                  {g.isDoubleHeader ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                      <div style={{fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold'}}>Game 1 Pitches:</div>
                      {g.pitchCounts && Object.keys(g.pitchCounts).length > 0 ? (
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px'}}>
                          {Object.entries(g.pitchCounts).map(([pid, count]) => {
                            const player = roster.find(r => r.id === pid);
                            return (
                              <div key={pid} style={{fontSize: '13px', color: 'var(--text-secondary)'}}>
                                <strong style={{color: 'var(--text-primary)'}}>{player ? player.name : 'Unknown'}:</strong> {count as number} pitches
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p style={{margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)'}}>No pitches recorded for Game 1.</p>
                      )}
                      <div style={{fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold'}}>Game 2 Pitches:</div>
                      {g.pitchCountsG2 && Object.keys(g.pitchCountsG2).length > 0 ? (
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                          {Object.entries(g.pitchCountsG2).map(([pid, count]) => {
                            const player = roster.find(r => r.id === pid);
                            return (
                              <div key={pid} style={{fontSize: '13px', color: 'var(--text-secondary)'}}>
                                <strong style={{color: 'var(--text-primary)'}}>{player ? player.name : 'Unknown'}:</strong> {count as number} pitches
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p style={{margin: 0, fontSize: '13px', color: 'var(--text-secondary)'}}>No pitches recorded for Game 2.</p>
                      )}
                    </div>
                  ) : (
                    <>
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
                    </>
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
