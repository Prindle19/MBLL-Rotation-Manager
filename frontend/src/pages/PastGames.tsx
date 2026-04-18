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
        const fetchedPastGames = gRes.data.games.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPastGames(fetchedPastGames);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load past games", err);
        setLoading(false);
      });
    }
  }, [team]);

  const deleteGame = async (gameId: string) => {
    if (!window.confirm("Are you sure you want to delete this game? This will remove it from pitch counts and history.")) return;
    try {
      await api.delete(`/api/games/${gameId}`);
      setPastGames(pastGames.filter(g => g.id !== gameId));
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
                  <td style={{ padding: '8px' }}>{game.date}</td>
                  <td style={{ padding: '8px' }}>{allTeams.find(t => t.id === game.opponent)?.Team_Name || game.opponent}</td>
                  <td style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => loadGame(game)}>Load</button>
                    <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => deleteGame(game.id)}>Delete</button>
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
