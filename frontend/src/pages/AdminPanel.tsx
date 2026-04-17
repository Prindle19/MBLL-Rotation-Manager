import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [newTeam, setNewTeam] = useState({ Team_Name: '', League: 'Majors', coachEmails: [] as string[] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, tRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/teams')
      ]);
      setUsers(uRes.data?.users || []);
      setTeams(tRes.data?.teams || []);
    } catch (e) {
      console.error("Failed to fetch admin data", e);
    }
  };

  const updateRole = async (email: string, role: string) => {
    await api.post(`/api/users/${email}/role`, { role });
    fetchData();
  };

  const createTeam = async () => {
    await api.post('/api/teams', newTeam);
    setNewTeam({ Team_Name: '', League: 'Majors', coachEmails: [] });
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
        <div className="table-container">
          <table>
            <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Action</th></tr></thead>
            <tbody>
              {users?.map(u => (
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
      </div>

      <div className="glass-panel">
        <h2>Manage Teams</h2>
        <div style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px'}}>
          <div style={{display:'flex', gap:'10px', flexWrap: 'wrap'}}>
            <input className="input-field" placeholder="Team Name" value={newTeam.Team_Name} onChange={e => setNewTeam({...newTeam, Team_Name: e.target.value})} />
            <select className="select-field" value={newTeam.League} onChange={e => setNewTeam({...newTeam, League: e.target.value})}>
              <option value="Majors">Majors</option>
              <option value="Minors">Minors</option>
            </select>
            <button className="btn" onClick={createTeam}>Add</button>
          </div>
          
          <div style={{background: 'rgba(15, 23, 42, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)'}}>
            <label style={{fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px'}}>Select Coaches for this team:</label>
            <div style={{maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'}}>
              {users?.filter(u => u.role === 'coach' || u.role === 'admin').map(u => (
                <label key={u.email} style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)', margin: 0}}>
                  <input 
                    type="checkbox" 
                    checked={newTeam.coachEmails.includes(u.email)}
                    onChange={(e) => {
                      const emails = e.target.checked 
                        ? [...newTeam.coachEmails, u.email]
                        : newTeam.coachEmails.filter(email => email !== u.email);
                      setNewTeam({...newTeam, coachEmails: emails});
                    }}
                    style={{accentColor: 'var(--accent)', width: '16px', height: '16px', margin: 0}}
                  />
                  {u.email}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Team</th><th>League</th><th>Coaches</th><th>Action</th></tr></thead>
            <tbody>
              {teams?.map(t => (
                <tr key={t.id}>
                  <td>{t.Team_Name}</td>
                  <td>{t.League}</td>
                  <td>{t.coachEmails?.join(', ')}</td>
                  <td><button className="btn btn-danger" onClick={() => deleteTeam(t.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
