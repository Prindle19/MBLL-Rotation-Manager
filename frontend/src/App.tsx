import { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { LogOut, Play, GripVertical } from 'lucide-react';
import axios from 'axios';
import './index.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // App state
  const [league, setLeague] = useState('Majors');
  const [activePlayers, setActivePlayers] = useState([
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
    { id: '4', name: 'David' },
    { id: '5', name: 'Eve' },
    { id: '6', name: 'Frank' },
    { id: '7', name: 'Grace' },
    { id: '8', name: 'Heidi' },
    { id: '9', name: 'Ivan' },
  ]);
  const [rotation, setRotation] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(activePlayers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setActivePlayers(items);
  };

  const generateRotation = async () => {
    if (!user) return;
    setGenerating(true);
    
    try {
      const token = await user.getIdToken();
      
      const response = await axios.post('/api/generate_rotation', {
        ordered_lineup: activePlayers.map(p => p.name),
        league: league,
        target_pitcher: null,
        projected_pitches: 0,
        skills: {}
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setRotation(response.data.rotation);
    } catch (error) {
      console.error("Failed to generate rotation", error);
      alert("Failed to generate rotation. Is the backend running?");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="login-screen"><div className="spinner"></div></div>;
  }

  if (!user) {
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

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <div className="brand">⚾ MBLL Manager</div>
        <div className="user-info">
          <span>{user.email}</span>
          <button className="btn btn-danger" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="grid-layout">
        <div className="glass-panel">
          <h2>Game Setup</h2>
          
          <div className="form-group">
            <label>League</label>
            <select className="select-field" value={league} onChange={(e) => setLeague(e.target.value)}>
              <option value="Majors">Majors</option>
              <option value="Minors">Minors</option>
            </select>
          </div>
          
          <h3 style={{marginTop: '32px'}}>Batting Order</h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px'}}>
            Drag to rearrange your dugout order.
          </p>
          
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="players">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {activePlayers.map((player, index) => (
                    <Draggable key={player.id} draggableId={player.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="player-item"
                          style={{
                            ...provided.draggableProps.style,
                            boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.2)' : 'none',
                            transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'translate(0, 0)'
                          }}
                        >
                          <div {...provided.dragHandleProps} style={{cursor: 'grab', display: 'flex', alignItems: 'center'}}>
                            <GripVertical size={16} color="var(--text-secondary)" />
                          </div>
                          <span>{index + 1}. {player.name}</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          
          <button 
            className="btn" 
            style={{ width: '100%', marginTop: '24px', justifyContent: 'center' }}
            onClick={generateRotation}
            disabled={generating}
          >
            {generating ? <div className="spinner" style={{width: '20px', height: '20px', borderWidth: '2px'}}></div> : <><Play size={16} /> Generate Rotation</>}
          </button>
        </div>

        <div className="glass-panel">
          <h2>Defensive Rotation</h2>
          
          {rotation.length > 0 ? (
            <div style={{overflowX: 'auto'}}>
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Inn 1</th>
                    <th>Inn 2</th>
                    <th>Inn 3</th>
                    <th>Inn 4</th>
                    <th>Inn 5</th>
                    <th>Inn 6</th>
                  </tr>
                </thead>
                <tbody>
                  {rotation.map((row: any, idx: number) => (
                    <tr key={idx}>
                      <td><strong>{row.index}</strong></td>
                      <td>{row['1']}</td>
                      <td>{row['2']}</td>
                      <td>{row['3']}</td>
                      <td>{row['4']}</td>
                      <td>{row['5']}</td>
                      <td>{row['6']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-center" style={{height: '200px', flexDirection: 'column', color: 'var(--text-secondary)'}}>
              <p>Configure your lineup and generate a rotation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
