import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { loginWithGoogle, logout } from './firebase';
import AdminPanel from './pages/AdminPanel';
import CoachPanel from './pages/CoachPanel';
import GameSetup from './pages/GameSetup';
import PitchCounts from './pages/PitchCounts';
import { LogOut } from 'lucide-react';
import './index.css';

function AppContent() {
  const { user, dbUser, loading, teams, selectedTeam, setSelectedTeam } = useAuth();

  if (loading) return <div className="login-screen"><div className="spinner"></div></div>;

  if (!user || !dbUser) {
    return (
      <div className="login-screen">
        <div className="glass-panel login-box">
          <h1 className="brand">MBLL Rotation Manager</h1>
          <p>Sign in to manage your team lineups and rotations.</p>
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={loginWithGoogle}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (dbUser.role === 'pending') {
    return (
      <div className="login-screen">
        <div className="glass-panel login-box">
          <h1 className="brand">Account Pending</h1>
          <p>Your account has been created, but an admin needs to approve you and assign a team.</p>
          <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', marginTop: '20px' }} onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <nav className="nav-bar">
          <div className="brand" style={{display:'flex', gap:'30px', alignItems:'center'}}>
            ⚾ MBLL Rotation Manager
            <div className="nav-links">
              <Link to="/game" style={{color:'var(--text-primary)', textDecoration:'none'}}>Game Setup</Link>
              <Link to="/coach" style={{color:'var(--text-primary)', textDecoration:'none'}}>My Roster</Link>
              <Link to="/pitch-counts" style={{color:'var(--text-primary)', textDecoration:'none'}}>Pitch Counts</Link>
              {dbUser.role === 'admin' && <Link to="/admin" style={{color:'var(--accent)', textDecoration:'none'}}>League Admin</Link>}
            </div>
          </div>
          <div className="user-info">
            {teams.length > 1 && (
              <select 
                className="select-field team-selector" 
                value={selectedTeam?.id || ''} 
                onChange={(e) => {
                  const t = teams.find(team => team.id === e.target.value);
                  if (t) setSelectedTeam(t);
                }}
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.Team_Name}</option>
                ))}
              </select>
            )}
            <span className="hide-on-mobile" style={{color: 'var(--text-secondary)'}}>{user.email}</span>
            <button className="btn btn-danger" onClick={logout}>
              <LogOut size={16} /> <span className="hide-on-mobile">Logout</span>
            </button>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Navigate to={dbUser?.role === 'admin' && teams.length === 0 ? '/admin' : '/game'} />} />
          <Route path="/game" element={<GameSetup />} />
          <Route path="/coach" element={<CoachPanel />} />
          <Route path="/pitch-counts" element={<PitchCounts />} />
          <Route path="/admin" element={dbUser?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
