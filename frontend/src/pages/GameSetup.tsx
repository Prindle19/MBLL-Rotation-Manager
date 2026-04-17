import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Play, GripVertical } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function GameSetup() {
  const { team } = useAuth();
  const [activePlayers, setActivePlayers] = useState<any[]>([]);
  const [rotation, setRotation] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (team) {
      api.get(`/api/roster/${team.id}`).then(res => {
        setActivePlayers(res.data.roster);
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

  const generateRotation = async () => {
    setGenerating(true);
    try {
      const skillsMap: Record<string, any> = {};
      activePlayers.forEach(p => {
        skillsMap[p.name] = { IF: p.skillInfield, OF: p.skillOutfield };
      });
      
      const response = await api.post('/api/generate_rotation', {
        ordered_lineup: activePlayers.map(p => p.name),
        league: team?.League || 'Majors',
        target_pitcher: null,
        projected_pitches: 0,
        skills: skillsMap
      });
      setRotation(response.data.rotation);
    } catch (error) {
      console.error("Failed to generate rotation", error);
      alert("Failed to generate rotation.");
    } finally {
      setGenerating(false);
    }
  };

  if (!team) return <div className="glass-panel" style={{textAlign: 'center', padding: '50px'}}>You need an Admin to assign you to a Team before setting up a game.</div>;

  return (
    <div className="grid-layout">
      <div className="glass-panel">
        <h2>Game Setup: {team.Team_Name}</h2>
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
          disabled={generating || activePlayers.length === 0}
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
                  <th>Player</th><th>Inn 1</th><th>Inn 2</th><th>Inn 3</th><th>Inn 4</th><th>Inn 5</th><th>Inn 6</th>
                </tr>
              </thead>
              <tbody>
                {rotation.map((row: any, idx: number) => (
                  <tr key={idx}>
                    <td><strong>{row.index}</strong></td>
                    <td>{row['1']}</td><td>{row['2']}</td><td>{row['3']}</td><td>{row['4']}</td><td>{row['5']}</td><td>{row['6']}</td>
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
  );
}
