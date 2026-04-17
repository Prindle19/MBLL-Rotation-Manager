import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [newTeam, setNewTeam] = useState({ Team_Name: '', League: 'Majors', coachEmail: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [uRes, tRes] = await Promise.all([
      api.get('/api/users'),
      api.get('/api/teams')
    ]);
    setUsers(uRes.data.users);
    setTeams(uRes.data.teams);
  };

  const updateRole = async (email: string, role: string) => {
    await api.post(`/api/users/${email}/role`, { role });
    fetchData();
  };

  const createTeam = async () => {
    await api.post('/api/teams', newTeam);
    setNewTeam({ Team_Name: '', League: 'Majors', coachEmail: '' });
    fetchData();
  };

  const deleteTeam = async (id: string) => {
    await api.delete(`/api/teams/${id}`);
    fetchData();
  };

  return (
    <div className="grid-layout">
      <div className="glass-panel">
        <h2>Manage Users</h2>
        <p style={{color:'var(--text-secondary)', marginBottom:'10px'}}>Assign roles to users who sign in.</p>
        <table>
          <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Action</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.email}>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td>{u.role}</td>
                <td>
                  <select value={u.role} onChange={(e) => updateRole(u.email, e.target.value)} className="select-field" style={{width:'auto', padding:'5px'}}>
                    <option value="pending">Pending</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-panel">
        <h2>Manage Teams</h2>
        <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
          <input className="input-field" placeholder="Team Name" value={newTeam.Team_Name} onChange={e => setNewTeam({...newTeam, Team_Name: e.target.value})} />
          <select className="select-field" value={newTeam.League} onChange={e => setNewTeam({...newTeam, League: e.target.value})}>
            <option value="Majors">Majors</option>
            <option value="Minors">Minors</option>
          </select>
          <select className="select-field" value={newTeam.coachEmail} onChange={e => setNewTeam({...newTeam, coachEmail: e.target.value})}>
            <option value="">Select Coach</option>
            {users.filter(u => u.role === 'coach' || u.role === 'admin').map(u => <option key={u.email} value={u.email}>{u.email}</option>)}
          </select>
          <button className="btn" onClick={createTeam}>Add</button>
        </div>

        <table>
          <thead><tr><th>Team</th><th>League</th><th>Coach</th><th>Action</th></tr></thead>
          <tbody>
            {teams.map(t => (
              <tr key={t.id}>
                <td>{t.Team_Name}</td>
                <td>{t.League}</td>
                <td>{t.coachEmail}</td>
                <td><button className="btn btn-danger" onClick={() => deleteTeam(t.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
