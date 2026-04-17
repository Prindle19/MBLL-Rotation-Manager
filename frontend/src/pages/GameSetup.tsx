import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Play, GripVertical, Check, X } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function GameSetup() {
  const { selectedTeam: team } = useAuth();
  
  // Roster and setup state
  const [roster, setRoster] = useState<any[]>([]);
  const [activePlayers, setActivePlayers] = useState<any[]>([]); // order matters
  
  // Game metadata
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState(true);
  
  // Rotation state
  const [locks, setLocks] = useState<Record<string, Record<string, string>>>({});
  const [rotation, setRotation] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');

  // Fetch roster & all teams
  useEffect(() => {
    if (team) {
      api.get(`/api/roster/${team.id}`).then(res => {
        const r = res.data.roster.map((p: any) => ({ ...p, isActive: true }));
        setRoster(r);
        setActivePlayers(r);
      });
      api.get('/api/teams').then(res => {
        setAllTeams(res.data.teams);
      });
    }
  }, [team]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(activePlayers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setActivePlayers(items);
  };

  const toggleActive = (id: string) => {
    setActivePlayers(activePlayers.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const updateLock = (playerId: string, inn: string, pos: string) => {
    setLocks(prev => {
      const pLocks = { ...(prev[playerId] || {}) };
      if (pos) {
        pLocks[inn] = pos;
      } else {
        delete pLocks[inn];
      }
      return { ...prev, [playerId]: pLocks };
    });
    // Setting a lock means we manually overrode something, 
    // we can update the rotation state locally if it exists
    setRotation(prev => prev.map(r => r.id === playerId ? {...r, [inn]: pos} : r));
  };

  const generateRotation = async () => {
    setGenerating(true);
    setValidationMsg('');
    try {
      const skillsMap: Record<string, any> = {};
      activePlayers.forEach(p => {
        skillsMap[p.id] = { IF: p.skillInfield, OF: p.skillOutfield };
      });
      
      const payload = {
        ordered_lineup: activePlayers.filter(p => p.isActive).map(p => p.id),
        league: team?.League || 'Majors',
        locks: locks,
        skills: skillsMap,
        roster_map: Object.fromEntries(activePlayers.map(p => [p.id, p.name]))
      };
      
      const response = await api.post('/api/generate_rotation', payload);
      setRotation(response.data.rotation);
      setValidationMsg('✅ Rotation generated successfully.');
    } catch (error: any) {
      console.error("Failed to generate rotation", error);
      setValidationMsg(`❌ ERROR: ${error.response?.data?.detail || error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const saveGame = async () => {
    if (!opponent) {
      setValidationMsg('❌ ERROR: Please select an opponent.');
      return;
    }
    
    try {
      await api.post('/api/games', {
        team_id: team.id,
        date: gameDate,
        opponent,
        isHome,
        activePlayers,
        locks,
        rotation,
        is_past_entry: false
      });
      setValidationMsg('✅ Game saved successfully!');
    } catch (error) {
      setValidationMsg('❌ ERROR: Failed to save game.');
    }
  };

  if (!team) return <div className="glass-panel" style={{textAlign: 'center', padding: '50px'}}>You need an Admin to assign you to a Team before setting up a game.</div>;

  const positions = team.League === 'Minors' 
    ? ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Bench']
    : ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'Bench'];

  const opponentTeams = allTeams.filter(t => t.League === team.League && t.id !== team.id);

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
      
      {/* Validation HUD */}
      {validationMsg && (
        <div style={{
          background: validationMsg.startsWith('❌') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          border: `1px solid ${validationMsg.startsWith('❌') ? '#ef4444' : '#10b981'}`,
          padding: '12px 24px',
          borderRadius: '8px',
          color: 'white',
          fontWeight: '500'
        }}>
          {validationMsg}
        </div>
      )}

      {/* Matchup Header */}
      <div className="glass-panel" style={{display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap'}}>
        <h3 style={{margin: 0, marginRight: 'auto'}}>Game Matchup</h3>
        <input type="date" className="input-field" style={{width: 'auto'}} value={gameDate} onChange={e => setGameDate(e.target.value)} />
        <select className="select-field" style={{width: 'auto'}} value={isHome ? 'home' : 'away'} onChange={e => setIsHome(e.target.value === 'home')}>
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
        <select className="select-field" style={{width: 'auto'}} value={opponent} onChange={e => setOpponent(e.target.value)}>
          <option value="">Select Opponent</option>
          {opponentTeams.map(t => <option key={t.id} value={t.id}>{t.Team_Name}</option>)}
        </select>
        <button className="btn" onClick={saveGame} disabled={rotation.length === 0}>Save Game</button>
      </div>

      <div className="grid-layout">
        <div className="glass-panel">
          <h2>Lineup / Active Players</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px'}}>
            Drag to reorder. Toggle active status.
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
                            opacity: player.isActive ? 1 : 0.5,
                            boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.2)' : 'none',
                          }}
                        >
                          <div {...provided.dragHandleProps} style={{cursor: 'grab', display: 'flex', alignItems: 'center'}}>
                            <GripVertical size={16} color="var(--text-secondary)" />
                          </div>
                          <span style={{flex: 1, textDecoration: player.isActive ? 'none' : 'line-through'}}>{index + 1}. {player.name}</span>
                          <button 
                            className={`btn ${player.isActive ? '' : 'btn-danger'}`} 
                            style={{padding: '4px 8px', fontSize: '12px'}}
                            onClick={() => toggleActive(player.id)}
                          >
                            {player.isActive ? <Check size={14}/> : <X size={14}/>}
                          </button>
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
            disabled={generating || activePlayers.filter(p => p.isActive).length === 0}
          >
            {generating ? <div className="spinner" style={{width: '20px', height: '20px', borderWidth: '2px'}}></div> : <><Play size={16} /> Generate Rotation</>}
          </button>
        </div>

        <div className="glass-panel">
          <h2>Defensive Rotation & Locks</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  {[1,2,3,4,5,6].map(i => <th key={i}>Inn {i}</th>)}
                </tr>
              </thead>
              <tbody>
                {activePlayers.filter(p => p.isActive).map((p) => {
                  const row = rotation.find(r => r.id === p.id) || {};
                  return (
                    <tr key={p.id}>
                      <td style={{fontSize: '14px', whiteSpace: 'nowrap'}}><strong>{p.name}</strong></td>
                      {[1,2,3,4,5,6].map(i => (
                        <td key={i}>
                          <select 
                            className="select-field" 
                            style={{
                              width: '70px', 
                              padding: '4px', 
                              fontSize: '12px',
                              border: locks[p.id]?.[i] ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                              background: locks[p.id]?.[i] ? 'rgba(59, 130, 246, 0.2)' : 'transparent'
                            }}
                            value={locks[p.id]?.[i] || row[i.toString()] || ''}
                            onChange={(e) => updateLock(p.id, i.toString(), e.target.value)}
                          >
                            <option value="">--</option>
                            {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                          </select>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
