import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function PastGames() {
  const { selectedTeam: team } = useAuth();
  const navigate = useNavigate();
  const [pastGames, setPastGames] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (team) {
      Promise.all([
        api.get('/api/teams'),
        api.get(`/api/games/${team.id}`)
      ]).then(([tRes, gRes]) => {
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
            const versions = allGames.filter((v: any) => (v.parent_game_id || v.id) === parentId);
            grouped.push({
              ...g, // latest version
              versions: versions
            });
          }
        });
        
        setPastGames(grouped);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load past games", err);
        setLoading(false);
      });
    }
  }, [team]);

  const deleteGameGroup = async (game: any) => {
    if (!window.confirm("Are you sure you want to delete this game and all its history? This will remove it from pitch counts.")) return;
    try {
      if (game.versions && game.versions.length > 0) {
        for (const v of game.versions) {
          await api.delete(`/api/games/${v.id}`);
        }
      } else {
        await api.delete(`/api/games/${game.id}`);
      }
      setPastGames(pastGames.filter(g => (g.parent_game_id || g.id) !== (game.parent_game_id || game.id)));
    } catch (err) {
      alert("Failed to delete game.");
    }
  };

  const loadGame = (game: any) => {
    navigate('/game', { state: { gameToLoad: game } });
  };

  if (!team) return <div className="glass-panel" style={{textAlign: 'center', padding: '50px'}}>Select a team first.</div>;
  if (loading) return <div style={{textAlign: 'center', padding: '50px'}}><div className="spinner"></div></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel">
        <h2 style={{ margin: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Saved Games History</h2>
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '8px' }}>Date</th>
                <th style={{ padding: '8px' }}>Opponent</th>
                <th style={{ padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pastGames.map(game => (
                <tr key={game.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px' }}>
                    {game.date}
                    {game.versions?.length > 1 && (
                      <div style={{fontSize: '11px', color: 'var(--accent)', marginTop: '4px'}}>
                        {game.versions.length} Versions (Modified)
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {allTeams.find(t => t.id === game.opponent)?.Team_Name || game.opponent}
                    <div style={{fontSize: '11px', color: 'var(--text-secondary)'}}>Status: {game.status || 'Completed'}</div>
                  </td>
                  <td style={{ padding: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {game.versions?.length > 1 ? (
                      <select className="select-field" style={{padding: '4px 8px', fontSize: '12px', width: 'auto'}} onChange={(e) => {
                        const v = game.versions.find((ver: any) => ver.id === e.target.value);
                        if (v) loadGame(v);
                        e.target.value = ""; // reset
                      }}>
                        <option value="">Load Version...</option>
                        {game.versions.map((v: any, idx: number) => (
                          <option key={v.id} value={v.id}>
                            {idx === 0 ? 'Latest ' : `v${game.versions.length - idx} `} 
                            ({new Date(v.version_time || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button className="btn" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => loadGame(game)}>Load</button>
                    )}
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => deleteGameGroup(game)}>Delete</button>
                  </td>
                </tr>
              ))}
              {pastGames.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>No saved games found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
