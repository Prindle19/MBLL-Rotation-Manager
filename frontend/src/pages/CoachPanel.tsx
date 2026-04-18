import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function CoachPanel() {
  const { selectedTeam: team } = useAuth();
  const [roster, setRoster] = useState<any[]>([]);
  const [newPlayer, setNewPlayer] = useState({ name: '', leagueAge: 9, skillInfield: 3, skillOutfield: 3 });
  const [saveStatus, setSaveStatus] = useState<string>('');
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (team) {
      api.get(`/api/roster/${team.id}`).then(res => {
        setRoster(res.data.roster);
        initialLoadDone.current = true;
      });
    }
  }, [team]);

  useEffect(() => {
    if (!team || !initialLoadDone.current) return;
    
    setSaveStatus('Saving...');
    const timeoutId = setTimeout(async () => {
      try {
        await api.post(`/api/roster/${team.id}`, { players: roster });
        setSaveStatus('Saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (e) {
        setSaveStatus('Error saving');
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [roster, team]);

  const addPlayer = () => {
    setRoster([...roster, { ...newPlayer, id: Date.now().toString() }]);
    setNewPlayer({ name: '', leagueAge: 9, skillInfield: 3, skillOutfield: 3 });
  };

  const removePlayer = (id: string) => {
    setRoster(roster.filter(p => p.id !== id));
  };

  if (!team) return <div className="glass-panel" style={{textAlign: 'center', padding: '50px'}}>You have not been assigned a team yet. Please contact an admin.</div>;

  return (
    <div className="glass-panel" style={{maxWidth: '800px', margin: '0 auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2>Manage Roster: {team.Team_Name} ({team.League})</h2>
        <span style={{color: saveStatus === 'Error saving' ? '#ef4444' : 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic'}}>{saveStatus}</span>
      </div>
      
      <div style={{display:'flex', gap:'10px', alignItems: 'flex-end', marginBottom:'20px'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '4px', flex: 1}}>
          <label style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Player Name</label>
          <input className="input-field" placeholder="Enter name" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
          <label style={{fontSize: '12px', color: 'var(--text-secondary)'}}>Age</label>
          <input type="number" className="input-field" value={newPlayer.leagueAge} onChange={e => setNewPlayer({...newPlayer, leagueAge: parseInt(e.target.value)})} style={{width:'80px'}} />
        </div>
        <button className="btn" style={{height: '46px'}} onClick={addPlayer}>Add</button>
      </div>

      <table>
        <thead><tr><th>Name</th><th>Age</th><th>IF Skill</th><th>OF Skill</th><th>Action</th></tr></thead>
        <tbody>
          {roster.map(p => (
            <tr key={p.id}>
              <td>
                <input className="input-field" value={p.name} onChange={(e) => {
                  setRoster(roster.map(r => r.id === p.id ? {...r, name: e.target.value} : r));
                }} style={{width:'150px', padding: '8px'}}/>
              </td>
              <td>
                <input type="number" className="input-field" value={p.leagueAge} onChange={(e) => {
                  setRoster(roster.map(r => r.id === p.id ? {...r, leagueAge: parseInt(e.target.value) || 0} : r));
                }} style={{width:'60px', padding: '8px'}}/>
              </td>
              <td><input type="number" min="1" max="5" className="input-field" value={p.skillInfield} onChange={(e) => {
                setRoster(roster.map(r => r.id === p.id ? {...r, skillInfield: parseInt(e.target.value)} : r));
              }} style={{width:'80px'}}/></td>
              <td><input type="number" min="1" max="5" className="input-field" value={p.skillOutfield} onChange={(e) => {
                setRoster(roster.map(r => r.id === p.id ? {...r, skillOutfield: parseInt(e.target.value)} : r));
              }} style={{width:'80px'}}/></td>
              <td><button className="btn btn-danger" onClick={() => removePlayer(p.id)}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
