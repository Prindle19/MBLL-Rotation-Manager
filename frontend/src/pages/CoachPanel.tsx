import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function CoachPanel() {
  const { selectedTeam: team } = useAuth();
  const [roster, setRoster] = useState<any[]>([]);
  const [newPlayer, setNewPlayer] = useState({ name: '', leagueAge: 9, skillInfield: 3, skillOutfield: 3 });

  useEffect(() => {
    if (team) {
      api.get(`/api/roster/${team.id}`).then(res => setRoster(res.data.roster));
    }
  }, [team]);

  const addPlayer = () => {
    setRoster([...roster, { ...newPlayer, id: Date.now().toString() }]);
    setNewPlayer({ name: '', leagueAge: 9, skillInfield: 3, skillOutfield: 3 });
  };

  const removePlayer = (id: string) => {
    setRoster(roster.filter(p => p.id !== id));
  };

  const saveRoster = async () => {
    if (team) {
      await api.post(`/api/roster/${team.id}`, { players: roster });
      alert("Roster Saved to Database!");
    }
  };

  if (!team) return <div className="glass-panel">You have not been assigned a team yet. Please contact an admin.</div>;

  return (
    <div className="glass-panel" style={{maxWidth: '800px', margin: '0 auto'}}>
      <h2>Manage Roster: {team.Team_Name} ({team.League})</h2>
      
      <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
        <input className="input-field" placeholder="Player Name" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
        <input type="number" className="input-field" placeholder="Age" value={newPlayer.leagueAge} onChange={e => setNewPlayer({...newPlayer, leagueAge: parseInt(e.target.value)})} style={{width:'80px'}} />
        <button className="btn" onClick={addPlayer}>Add Player</button>
      </div>

      <table>
        <thead><tr><th>Name</th><th>Age</th><th>IF Skill</th><th>OF Skill</th><th>Action</th></tr></thead>
        <tbody>
          {roster.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.leagueAge}</td>
              <td><input type="number" className="input-field" value={p.skillInfield} onChange={(e) => {
                setRoster(roster.map(r => r.id === p.id ? {...r, skillInfield: parseInt(e.target.value)} : r));
              }} style={{width:'80px'}}/></td>
              <td><input type="number" className="input-field" value={p.skillOutfield} onChange={(e) => {
                setRoster(roster.map(r => r.id === p.id ? {...r, skillOutfield: parseInt(e.target.value)} : r));
              }} style={{width:'80px'}}/></td>
              <td><button className="btn btn-danger" onClick={() => removePlayer(p.id)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button className="btn" style={{marginTop:'20px'}} onClick={saveRoster}>Save Changes to Database</button>
    </div>
  );
}
