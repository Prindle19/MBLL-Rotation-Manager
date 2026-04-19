import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Play, GripVertical, Check, X, UserPlus, AlertCircle } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { StarRating } from '../components/StarRating';

export default function GameSetup() {
  const { selectedTeam: team } = useAuth();
  const location = useLocation();
  
  // Roster and setup state
  const [activePlayers, setActivePlayers] = useState<any[]>([]); // order matters
  
  // Game metadata
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [pastGames, setPastGames] = useState<any[]>([]);

  const getManasquanDate = () => {
    return new Intl.DateTimeFormat('en-CA', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };

  const [gameDate, setGameDate] = useState(getManasquanDate());
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [gameStatus, setGameStatus] = useState<'Planned'|'Active'|'Completed'>('Planned');
  const [currentInning, setCurrentInning] = useState(1);
  
  // Rotation state
  const [locks, setLocks] = useState<Record<string, Record<string, string>>>({});
  const [rotation, setRotation] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');
  
  // Sub state
  const [subName, setSubName] = useState('');
  
  // Pitch warnings
  const [pitchWarnings, setPitchWarnings] = useState<Record<string, string>>({});

  // Donation Popup State
  const [showDonationPopup, setShowDonationPopup] = useState(false);

  // Fetch roster & all teams & past games for lineup persistence
  useEffect(() => {
    if (team) {
      Promise.all([
        api.get(`/api/roster/${team.id}`),
        api.get('/api/teams'),
        api.get(`/api/games/${team.id}`)
      ]).then(([rRes, tRes, gRes]) => {
        let r = rRes.data.roster.map((p: any) => ({ ...p, isActive: true }));
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
            grouped.push(g); // keep only latest version
          }
        });
        
        setPastGames(grouped);
        
        if (grouped.length > 0) {
          const lastGame = grouped[0];
          // Restore lineup order
          if (lastGame.activePlayers) {
            // merge activePlayers order with current roster (in case roster changed)
            const oldOrderIds = lastGame.activePlayers.map((p: any) => p.id);
            const orderedRoster = [];
            for (const id of oldOrderIds) {
              const player = r.find((p: any) => p.id === id);
              if (player) {
                orderedRoster.push({ ...player, isActive: lastGame.activePlayers.find((p:any) => p.id === id)?.isActive ?? true });
                r = r.filter((p: any) => p.id !== id);
              } else if (id.startsWith('sub_')) {
                // Restore subs if they were in the last game
                const subPlayer = lastGame.activePlayers.find((p:any) => p.id === id);
                if (subPlayer) {
                  orderedRoster.push(subPlayer);
                }
              }
            }
            r = [...orderedRoster, ...r]; // append any new players
          }
        }
        
        setActivePlayers(r);
      }).catch(err => {
        console.error("Failed to load setup data", err);
      });
    }
  }, [team]);

  // Load game from PastGames route
  useEffect(() => {
    if (location.state?.gameToLoad) {
      const game = location.state.gameToLoad;
      setGameDate(game.date);
      setOpponent(game.opponent);
      setIsHome(game.isHome);
      setGameStatus(game.status || 'Planned');
      setCurrentInning(game.currentInning || 1);
      setActivePlayers(game.activePlayers || []);
      setLocks(game.locks || {});
      setRotation(game.rotation || []);
      setValidationMsg(`✅ Loaded game from ${game.date}`);
      
      // Clear the state so it doesn't reload if the user navigates away and back
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  // Recalculate pitch count eligibility
  useEffect(() => {
    if (!team || pastGames.length === 0) return;
    
    const warnings: Record<string, string> = {};
    const selectedDate = new Date(gameDate);
    selectedDate.setHours(0,0,0,0);
    
    activePlayers.forEach(p => {
      // Find the most recent game BEFORE the selectedDate where they pitched
      for (const game of pastGames) {
        const gDate = new Date(game.date);
        gDate.setHours(0,0,0,0);
        if (gDate.getTime() >= selectedDate.getTime()) continue;
        
        let pitchCount = 0;
        if (game.pitchCounts && game.pitchCounts[p.id]) {
          pitchCount = game.pitchCounts[p.id];
        }
        
        if (pitchCount > 0) {
          const daysDiff = Math.floor((selectedDate.getTime() - gDate.getTime()) / (1000 * 60 * 60 * 24)); 
          const daysRest = daysDiff - 1; // Calendar days between games
          
          let requiredRest = 0;
          if (pitchCount >= 66) requiredRest = 4;
          else if (pitchCount >= 51) requiredRest = 3;
          else if (pitchCount >= 36) requiredRest = 2;
          else if (pitchCount >= 21) requiredRest = 1;
          
          if (daysRest < requiredRest) {
            warnings[p.id] = `🔴 Ineligible to Pitch (Pitched ${pitchCount} on ${game.date}, needs ${requiredRest} days rest, has ${Math.max(0, daysRest)})`;
          }
          break; // Found their most recent pitching appearance
        }
      }
    });
    setPitchWarnings(warnings);
  }, [gameDate, pastGames, activePlayers, team]);

  const prevActiveRef = useRef(activePlayers);
  useEffect(() => {
    if (rotation.length > 0 && prevActiveRef.current !== activePlayers) {
      generateRotation();
    }
    prevActiveRef.current = activePlayers;
  }, [activePlayers]);

  const onDragStart = () => {
    if (window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  };

  const onDragEnd = (result: DropResult) => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    if (!result.destination) return;
    const items = Array.from(activePlayers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setActivePlayers(items);
  };

  const toggleActive = (id: string) => {
    setActivePlayers(activePlayers.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const addTemporarySub = () => {
    if (!subName.trim()) return;
    const sub = {
      id: `sub_${Date.now()}`,
      name: subName.trim() + " (Sub)",
      leagueAge: team?.League === 'Majors' ? 12 : 10,
      skillInfield: 3,
      skillOutfield: 3,
      isActive: true
    };
    setActivePlayers([...activePlayers, sub]);
    setSubName('');
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
    setRotation(prev => prev.map(r => r.id === playerId ? {...r, [inn]: pos} : r));
  };

  const activeCount = activePlayers.filter(p => p.isActive).length;

  const getEstPitches = (playerId: string) => {
    let pCount = 0;
    for (let i = 1; i <= 6; i++) {
      const pos = locks[playerId]?.[i] || rotation.find(r => r.id === playerId)?.[i.toString()];
      if (pos === 'P') pCount++;
    }
    return pCount * 15;
  };

  const getMaxPitches = (age: number) => {
    if (!age) return 85; // default fallback
    if (age <= 8) return 50;
    if (age <= 10) return 75;
    if (age <= 12) return 85;
    return 95;
  };

  const generateRotation = async () => {
    setGenerating(true);
    setValidationMsg('');

    const effectiveLocks = JSON.parse(JSON.stringify(locks));
    if (gameStatus === 'Active' && currentInning > 1) {
      for (let i = 1; i < currentInning; i++) {
        rotation.forEach(r => {
          const pos = r[i.toString()];
          if (pos) {
            if (!effectiveLocks[r.id]) effectiveLocks[r.id] = {};
            effectiveLocks[r.id][i.toString()] = pos;
          }
        });
      }
    }

    // Check if Pitcher and Catcher are locked for all 6 innings
    const isBatterySet = [1, 2, 3, 4, 5, 6].every(inn => {
      let hasP = false;
      let hasC = false;
      Object.values(effectiveLocks).forEach((playerLocks: any) => {
        if (playerLocks[inn] === 'P') hasP = true;
        if (playerLocks[inn] === 'C') hasC = true;
      });
      return hasP && hasC;
    });

    if (!isBatterySet) {
      setValidationMsg('❌ ERROR: Please lock a Pitcher (P) and Catcher (C) for all 6 innings before generating.');
      setGenerating(false);
      return;
    }

    // Mathematical validation: Prevent locks that make it impossible to fulfill positional requirements
    for (const player of activePlayers) {
      if (!player.isActive || player.id.startsWith("sub_")) continue;
      
      let lockedIF = 0;
      let lockedOF = 0;
      let openSlots = 6;
      
      const pLocks = effectiveLocks[player.id] || {};
      for (let i = 1; i <= 6; i++) {
        const pos = pLocks[i];
        if (pos) {
          openSlots--;
          if (['P', 'C', '1B', '2B', '3B', 'SS'].includes(pos)) lockedIF++;
          else if (['LF', 'LC', 'RC', 'RF', 'CF'].includes(pos)) lockedOF++;
        }
      }
      
      const minOF = 1;
      const minIF = team?.League === 'Minors' ? 2 : 0;
      
      if (lockedOF + openSlots < minOF) {
        setValidationMsg(`❌ ERROR: ${player.name} has too many locked innings to fulfill the minimum Outfield requirement (${minOF} inn). Please remove some locks.`);
        setGenerating(false);
        return;
      }
      
      if (lockedIF + openSlots < minIF) {
        setValidationMsg(`❌ ERROR: ${player.name} has too many locked innings to fulfill the minimum Infield requirement (${minIF} inn). Please remove some locks.`);
        setGenerating(false);
        return;
      }
    }

    try {
      const skillsMap: Record<string, any> = {};
      activePlayers.forEach(p => {
        skillsMap[p.id] = { IF: p.skillInfield, OF: p.skillOutfield };
      });
      
      const payload = {
        ordered_lineup: activePlayers.filter(p => p.isActive).map(p => p.id),
        league: team?.League || 'Majors',
        locks: effectiveLocks,
        skills: skillsMap,
        roster_map: Object.fromEntries(activePlayers.map(p => [p.id, p.name])),
        active_count: activeCount,
        ineligible_pitchers: Object.keys(pitchWarnings)
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
        status: gameStatus,
        currentInning,
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
    ? (activeCount < 10 
        ? ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'Bench'] 
        : ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Bench'])
    : ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'Bench'];

  const opponentTeams = allTeams.filter(t => t.League === team.League && t.id !== team.id);
  const opponentName = opponentTeams.find(t => t.id === opponent)?.Team_Name || 'TBD';
  const matchTitle = isHome ? `${opponentName} @ ${team.Team_Name}` : `${team.Team_Name} @ ${opponentName}`;

  return (
    <>
      {/* Printable Dugout Chart */}
      <div className="print-only" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h1 style={{ margin: 0, color: 'black', fontSize: '24px' }}>MBLL {team.League} Dugout Chart - {gameDate} | {matchTitle}</h1>
        </div>
        <div style={{ display: 'flex', gap: '40px' }}>
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ borderBottom: '2px solid black', paddingBottom: '8px', color: 'black', margin: '0 0 12px 0', fontSize: '20px' }}>Batting Order</h2>
              <ol style={{ fontSize: '16px', lineHeight: '1.6', margin: 0, paddingLeft: '24px', color: 'black', whiteSpace: 'nowrap' }}>
                {activePlayers.filter(p => p.isActive).map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ol>
            </div>
            <div>
              <img src="/StreamSplitterLogo.png" alt="StreamSplitter" style={{width: '160px', height: 'auto'}} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ borderBottom: '2px solid black', paddingBottom: '8px', color: 'black', margin: '0 0 12px 0', fontSize: '20px' }}>Defensive Rotation</h2>
            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'black', fontSize: '14px' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>Player</th>
                  {[1,2,3,4,5,6].map(i => <th key={i} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>{i}</th>)}
                </tr>
              </thead>
              <tbody>
                {activePlayers.filter(p => p.isActive).map(p => {
                  const row = rotation.find(r => r.id === p.id) || {};
                  return (
                    <tr key={p.id}>
                      <td style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}><strong>{p.name}</strong></td>
                      {[1,2,3,4,5,6].map(i => (
                        <td key={i} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>
                          {locks[p.id]?.[i] || row[i.toString()] || '-'}
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

      <div className="no-print" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
      

      {/* Matchup Header */}
      <div className="glass-panel" style={{display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap'}}>
        <h3 style={{margin: 0, marginRight: 'auto'}}>Game Matchup{opponent ? `: ${matchTitle}` : ''}</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
          <input type="date" className="input-field" style={{width: 'auto'}} value={gameDate} onChange={e => setGameDate(e.target.value)} />
          <span style={{fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic'}}>Manasquan Time</span>
        </div>
        <select className="select-field" style={{width: 'auto'}} value={isHome ? 'home' : 'away'} onChange={e => setIsHome(e.target.value === 'home')}>
          <option value="home">Home</option>
          <option value="away">Away</option>
        </select>
        <select className="select-field" style={{width: 'auto'}} value={opponent} onChange={e => setOpponent(e.target.value)}>
          <option value="">Select Opponent</option>
          {opponentTeams.map(t => <option key={t.id} value={t.id}>{t.Team_Name}</option>)}
        </select>
        <select className="select-field" style={{width: 'auto', border: gameStatus === 'Active' ? '1px solid var(--accent)' : ''}} value={gameStatus} onChange={e => setGameStatus(e.target.value as any)}>
          <option value="Planned">Planned</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
        {gameStatus === 'Active' && (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--accent)'}}>
            <span style={{fontSize: '14px', color: 'var(--accent)', fontWeight: 'bold'}}>Entering Inning:</span>
            <select className="select-field" style={{width: 'auto', padding: '4px 8px'}} value={currentInning} onChange={e => setCurrentInning(parseInt(e.target.value))}>
              {[1,2,3,4,5,6].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        )}
        <button className="btn" onClick={saveGame} disabled={rotation.length === 0}>Save Game</button>
      </div>

      <div className="grid-layout">
        <div className="glass-panel">
          <h2>Lineup / Active Players</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px'}}>
            {activeCount} Active Players
          </p>
          
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
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
                          <div {...provided.dragHandleProps} style={{cursor: 'grab', display: 'flex', alignItems: 'center', padding: '16px 12px', margin: '-16px 0 -16px -16px', touchAction: 'none'}}>
                            <GripVertical size={24} color="var(--text-secondary)" />
                          </div>
                          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                              <span style={{textDecoration: player.isActive ? 'none' : 'line-through', fontWeight: '500'}}>{index + 1}. {player.name}</span>

                            </div>
                            {pitchWarnings[player.id] && player.isActive && (
                              <span style={{fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                <AlertCircle size={12}/> {pitchWarnings[player.id]}
                              </span>
                            )}
                            {(() => {
                              const est = getEstPitches(player.id);
                              const max = getMaxPitches(player.leagueAge || (team?.League === 'Majors' ? 12 : 10));
                              const isOverMax = est > max;
                              
                              if (est > 0 && !pitchWarnings[player.id] && player.isActive) {
                                return (
                                  <span style={{fontSize: '11px', color: isOverMax ? '#ef4444' : 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    {isOverMax && <AlertCircle size={12}/>}
                                    ⚾ Est. Pitches: ~{est} {isOverMax ? `(Exceeds daily max of ${max})` : ''}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <button 
                            className={`btn ${player.isActive ? '' : 'btn-danger'}`} 
                            style={{padding: '4px 8px', fontSize: '12px'}}
                            onClick={() => toggleActive(player.id)}
                            title="Toggle Active Status"
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
          
          <div style={{marginTop: '20px', display: 'flex', gap: '8px'}}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Temporary Sub Name" 
              value={subName}
              onChange={e => setSubName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTemporarySub()}
            />
            <button className="btn" onClick={addTemporarySub}><UserPlus size={16}/></button>
          </div>


        </div>

        <div className="glass-panel">
          <h2>Defensive Rotation & Locks</h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5'}}>
            ⚠️ <strong>Required:</strong> You must explicitly lock your Pitchers (P) and Catchers (C) for all 6 innings. 
            The generator will not automatically assign these unique positions.
          </p>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  {[1,2,3,4,5,6].map(i => {
                    let hasP = false;
                    let hasC = false;
                    Object.values(locks).forEach(playerLocks => {
                      if (playerLocks[i] === 'P') hasP = true;
                      if (playerLocks[i] === 'C') hasC = true;
                    });
                    const isMissingBattery = !(hasP && hasC);
                    return <th key={i} style={{textAlign: 'center', color: isMissingBattery ? '#ef4444' : 'var(--text-secondary)'}}>{i}</th>
                  })}
                </tr>
              </thead>
              <tbody>
                {activePlayers.filter(p => p.isActive).map((p) => {
                  const row = rotation.find(r => r.id === p.id) || {};
                  return (
                    <tr key={p.id}>
                      <td style={{fontSize: '14px', whiteSpace: 'nowrap'}}>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                          <strong>{p.name}</strong>
                          <div style={{display: 'flex', gap: '4px', fontSize: '9px', color: 'var(--text-secondary)'}}>
                            <span style={{display: 'flex', alignItems: 'center', gap: '1px'}}>IF <StarRating value={p.skillInfield || 3} readonly size={8} /></span>
                            <span style={{display: 'flex', alignItems: 'center', gap: '1px'}}>OF <StarRating value={p.skillOutfield || 3} readonly size={8} /></span>
                          </div>
                        </div>
                      </td>
                      {[1,2,3,4,5,6].map(i => {
                        const currentVal = locks[p.id]?.[i] || row[i.toString()] || '';
                        const isAlgo = !locks[p.id]?.[i] && !!row[i.toString()];
                        const isHighIF = ['1B', '2B', '3B', 'SS'].includes(currentVal) && (p.skillInfield >= 4);
                        const shouldGlow = isAlgo && isHighIF;
                        
                        return (
                        <td key={i} align="center">
                          <select 
                            className="select-field" 
                            style={{
                              width: '70px', 
                              padding: '4px', 
                              fontSize: '12px',
                              border: locks[p.id]?.[i] ? '1px solid var(--accent)' : (shouldGlow ? '1px solid rgba(251, 191, 36, 0.8)' : '1px solid var(--border-color)'),
                              background: locks[p.id]?.[i] ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                              boxShadow: shouldGlow ? '0 0 10px rgba(251, 191, 36, 0.3), inset 0 0 4px rgba(251, 191, 36, 0.2)' : 'none'
                            }}
                            value={currentVal}
                            onChange={(e) => updateLock(p.id, i.toString(), e.target.value)}
                          >
                            <option value="">--</option>
                            {positions.map(pos => (
                              <option 
                                key={pos} 
                                value={pos} 
                                disabled={(pos === 'P' && !!pitchWarnings[p.id]) || (gameStatus === 'Active' && i < currentInning)}
                              >
                                {pos}
                              </option>
                            ))}
                          </select>
                        </td>
                        );
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="btn" 
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={generateRotation}
                disabled={generating || activeCount === 0}
              >
                {generating ? <div className="spinner" style={{width: '20px', height: '20px', borderWidth: '2px'}}></div> : <><Play size={16} /> Generate Rotation</>}
              </button>
              
              {rotation.length > 0 && (
                <button 
                  className="btn" 
                  style={{ flex: 1, justifyContent: 'center', background: 'var(--panel-bg)', border: '1px solid var(--border-color)' }}
                  onClick={() => window.print()}
                >
                  🖨️ Print Dugout Chart
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px' }}>
              <button 
                className="btn" 
                style={{ background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                onClick={() => setShowDonationPopup(true)}
              >
                🍻 Buy Sean a Beer
              </button>
              <img src="/StreamSplitterLogo.png" alt="StreamSplitter" style={{height: '60px'}} />
            </div>
            
          </div>
        </div>
      </div>

    </div>

      {showDonationPopup && (
        <div className="modal-backdrop" onClick={() => setShowDonationPopup(false)}>
          <div className="glass-panel" style={{maxWidth: '400px', width: '100%', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
            <h2 style={{marginTop: 0, marginBottom: '24px'}}>🍻 Buy Sean a Beer!</h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5'}}>
              If you found this tool helpful for managing your rotation, consider buying me a beer!
            </p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <a 
                href="https://account.venmo.com/u/SeanWohltman" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn" 
                style={{justifyContent: 'center', background: '#008CFF', color: 'white', border: 'none'}}
              >
                Donate via Venmo
              </a>
              <a 
                href="https://paypal.me/SeanWohltman" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn" 
                style={{justifyContent: 'center', background: '#003087', color: 'white', border: 'none'}}
              >
                Donate via PayPal
              </a>
              <button 
                className="btn btn-danger" 
                style={{justifyContent: 'center', marginTop: '8px'}}
                onClick={() => setShowDonationPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
