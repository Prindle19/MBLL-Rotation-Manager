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
  const [gameStatus, setGameStatus] = useState<'Planned'|'Active'|'Completed'|'Postponed'|'Cancelled'>('Planned');
  const [currentInning, setCurrentInning] = useState(1);
  const [loadedGameId, setLoadedGameId] = useState<string | null>(null);

  // Double-header and Dynamic Innings States
  const [isDoubleHeader, setIsDoubleHeader] = useState(false);
  const [numInnings, setNumInnings] = useState(6);
  const [numInningsG2, setNumInningsG2] = useState(4);
  const [opponentG2, setOpponentG2] = useState('');
  const [isHomeG2, setIsHomeG2] = useState(false);
  const [gameStatusG2, setGameStatusG2] = useState<'Planned'|'Active'|'Completed'|'Postponed'|'Cancelled'>('Planned');
  const [currentInningG2, setCurrentInningG2] = useState(1);

  const handleToggleDoubleHeader = (checked: boolean) => {
    setIsDoubleHeader(checked);
    if (checked) {
      setNumInnings(4);
      setNumInningsG2(4);
      setIsHomeG2(!isHome); // default to opposite of Game 1
      setOpponentG2(opponent); // default to same opponent
    } else {
      setNumInnings(6);
    }
  };
  
  // Rotation state
  const [locks, setLocks] = useState<Record<string, Record<string, string>>>({});
  const [rotation, setRotation] = useState<any[]>([]);
  const [originalRotation, setOriginalRotation] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [validationMsg, setValidationMsg] = useState('');
  
  // Sub state
  const [subName, setSubName] = useState('');
  
  // Pitch warnings
  const [pitchWarnings, setPitchWarnings] = useState<Record<string, string>>({});

  // Donation Popup State
  const [showDonationPopup, setShowDonationPopup] = useState(false);
  
  // Custom Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);

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

        const isNavigatingFromPastGame = !!location.state?.gameToLoad;
        
        if (isNavigatingFromPastGame) {
          const gameToLoad = location.state.gameToLoad;
          if (gameToLoad.activePlayers) {
            const loadedIds = new Set(gameToLoad.activePlayers.map((p:any) => p.id));
            const missingPlayers = r.filter((p:any) => !loadedIds.has(p.id)).map((p:any) => ({...p, isActive: false}));
            if (missingPlayers.length > 0) {
              setActivePlayers([...gameToLoad.activePlayers, ...missingPlayers]);
            }
          }
          return;
        }
        
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
      setLoadedGameId(game.parent_game_id || game.id);
      setGameDate(game.date);
      setOpponent(game.opponent);
      setIsHome(game.isHome);
      setGameStatus(game.status || 'Planned');
      setCurrentInning(game.currentInning || 1);
      setActivePlayers(game.activePlayers || []);
      setLocks(game.locks || {});
      setRotation(game.rotation || []);
      setOriginalRotation(game.originalRotation || game.rotation || []);
      setValidationMsg(`✅ Loaded game from ${game.date}`);

      // Double-header and dynamic innings states
      setIsDoubleHeader(game.isDoubleHeader || false);
      setNumInnings(game.numInnings || 6);
      setNumInningsG2(game.numInningsG2 || 4);
      setOpponentG2(game.opponentG2 || '');
      setIsHomeG2(game.isHomeG2 ?? false);
      setGameStatusG2(game.statusG2 || 'Planned');
      setCurrentInningG2(game.currentInningG2 || 1);
      
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
      // Find the most recent game BEFORE or ON the selectedDate where they pitched (excluding the game currently being edited)
      for (const game of pastGames) {
        if ((game.parent_game_id || game.id) === loadedGameId) continue;
        if (game.status === 'Postponed' || game.status === 'Cancelled') continue;
        
        const gDate = new Date(game.date);
        gDate.setHours(0,0,0,0);
        if (gDate.getTime() > selectedDate.getTime()) continue;
        
        let pitchCount = 0;
        if (game.pitchCounts && game.pitchCounts[p.id]) {
          pitchCount = game.pitchCounts[p.id];
        }
        if (game.isDoubleHeader && game.pitchCountsG2 && game.pitchCountsG2[p.id]) {
          pitchCount += game.pitchCountsG2[p.id];
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
    // We don't auto-regenerate on active/attendance changes anymore.
    // They are handled by in-place swapping if rotation exists.
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

  const recomputeRotationWithAbsences = (baseRotation: any[], currentPlayers: any[]) => {
    if (!baseRotation || baseRotation.length === 0) return [];
    
    const newRotation = JSON.parse(JSON.stringify(baseRotation));
    
    // Inactive players are treated as absent for all innings.
    // Active players are checked for absentG1 / absentG2.
    const g1Absents = currentPlayers.filter(p => !p.isActive || p.absentG1);
    const g2Absents = isDoubleHeader ? currentPlayers.filter(p => !p.isActive || p.absentG2) : [];
    
    const applyAbsentsForGame = (absents: any[], startInn: number, endInn: number, gameNum: 1 | 2) => {
      absents.forEach(absentPlayer => {
        const absentRow = newRotation.find((r: any) => r.id === absentPlayer.id);
        if (!absentRow) return;

        for (let inn = startInn; inn <= endInn; inn++) {
          const innStr = inn.toString();
          const absentPos = absentRow[innStr];

          if (absentPos && absentPos !== 'Bench' && absentPos !== 'Absent') {
            const benchedCandidates = currentPlayers.filter(p => {
              if (!p.isActive) return false;
              if (p.id === absentPlayer.id) return false;
              
              const isAbsent = gameNum === 2 ? p.absentG2 : p.absentG1;
              if (isAbsent) return false;

              const pRow = newRotation.find((r: any) => r.id === p.id);
              return pRow && pRow[innStr] === 'Bench';
            });

            if (benchedCandidates.length > 0) {
              const candidateScores = benchedCandidates.map(c => {
                const cRow = newRotation.find((r: any) => r.id === c.id);
                let ifCount = 0;
                let ofCount = 0;
                
                const gameInns = Array.from({ length: endInn - startInn + 1 }, (_, idx) => startInn + idx);
                for (const i of gameInns) {
                  const pos = cRow ? cRow[i.toString()] : 'Bench';
                  if (['P', 'C', '1B', '2B', '3B', 'SS'].includes(pos)) ifCount++;
                  else if (['LF', 'LC', 'RC', 'RF', 'CF'].includes(pos)) ofCount++;
                }

                let totalDayBench = 0;
                const totalInns = isDoubleHeader ? (numInnings + numInningsG2) : numInnings;
                for (let i = 1; i <= totalInns; i++) {
                  const pRowLocal = newRotation.find((r: any) => r.id === c.id);
                  if (!pRowLocal || pRowLocal[i.toString()] === 'Bench') {
                    totalDayBench++;
                  }
                }

                let score = totalDayBench * 100;
                const minOF = 1;
                const minIF = isDoubleHeader ? 3 : (team?.League === 'Minors' ? 2 : 0);

                const isOFPos = ['LF', 'LC', 'RC', 'RF', 'CF'].includes(absentPos);
                const isIFPos = ['P', 'C', '1B', '2B', '3B', 'SS'].includes(absentPos);

                if (isOFPos && ofCount < minOF && !c.id.startsWith("sub_")) {
                  score += 1000;
                }
                if (isIFPos && ifCount < minIF && !c.id.startsWith("sub_")) {
                  score += 1000;
                }

                if (isIFPos) {
                  score += (c.skillInfield || 3) * 10;
                  const premiumIF = ['SS', '1B', '3B'].includes(absentPos);
                  if (premiumIF && (c.skillInfield || 3) >= 4) score += 50;
                  if (absentPos === '2B' && (c.skillInfield || 3) <= 2) score += 50;
                } else if (isOFPos) {
                  score += (c.skillOutfield || 3) * 10;
                  const premiumOF = ['CF', 'LC', 'LF'].includes(absentPos);
                  if (premiumOF && (c.skillOutfield || 3) >= 4) score += 50;
                  if (['RF', 'RC'].includes(absentPos) && (c.skillOutfield || 3) <= 2) score += 50;
                }

                return { candidate: c, score };
              });

              candidateScores.sort((a, b) => b.score - a.score);
              const bestCandidate = candidateScores[0].candidate;

              const bestRow = newRotation.find((r: any) => r.id === bestCandidate.id);
              if (bestRow) {
                bestRow[innStr] = absentPos;
              }
              absentRow[innStr] = 'Absent';
            } else {
              absentRow[innStr] = 'Absent';
            }
          }
        }
      });
    };

    applyAbsentsForGame(g1Absents, 1, numInnings, 1);
    if (isDoubleHeader) {
      applyAbsentsForGame(g2Absents, numInnings + 1, numInnings + numInningsG2, 2);
    }
    
    return newRotation;
  };

  const validateLineup = (testRotation: any[], currentPlayers: any[]) => {
    const errors: string[] = [];
    const activeAndPresent = currentPlayers.filter(p => p.isActive);
    
    const ifPositions = ['P', 'C', '1B', '2B', '3B', 'SS'];
    const ofPositions = ['LF', 'LC', 'RC', 'RF', 'CF'];
    
    const getStatsForInnings = (rRow: any, gInns: number[]) => {
      let ifCount = 0;
      let ofCount = 0;
      let benchCount = 0;
      for (const i of gInns) {
        const pos = rRow ? rRow[i.toString()] : 'Bench';
        if (ifPositions.includes(pos)) ifCount++;
        else if (ofPositions.includes(pos)) ofCount++;
        else if (pos === 'Bench') benchCount++;
      }
      return { ifCount, ofCount, benchCount };
    };

    const g1Inns = Array.from({ length: numInnings }, (_, idx) => idx + 1);
    const g2Inns = isDoubleHeader ? Array.from({ length: numInningsG2 }, (_, idx) => numInnings + idx + 1) : [];

    const minOF = 1;
    const minIF = isDoubleHeader ? 3 : (team?.League === 'Minors' ? 2 : 0);

    const playerSits = activeAndPresent.map(p => {
      const row = testRotation.find(r => r.id === p.id) || {};
      const g1 = getStatsForInnings(row, g1Inns);
      const g2 = getStatsForInnings(row, g2Inns);
      
      const meetsIFG1 = p.absentG1 || g1.ifCount >= minIF;
      const meetsOFG1 = p.absentG1 || g1.ofCount >= minOF;
      const meetsIFG2 = !isDoubleHeader || p.absentG2 || g2.ifCount >= minIF;
      const meetsOFG2 = !isDoubleHeader || p.absentG2 || g2.ofCount >= minOF;

      const sitsTotal = g1.benchCount + (isDoubleHeader ? g2.benchCount : 0);
      const isAbsentAny = p.absentG1 || p.absentG2;

      if (!meetsOFG1 && !p.absentG1) {
        errors.push(`${p.name} fails OF requirement in Game 1.`);
      }
      if (isDoubleHeader && !meetsOFG2 && !p.absentG2) {
        errors.push(`${p.name} fails OF requirement in Game 2.`);
      }
      if (!meetsIFG1 && !p.absentG1 && minIF > 0) {
        errors.push(`${p.name} fails IF requirement in Game 1.`);
      }
      if (isDoubleHeader && !meetsIFG2 && !p.absentG2 && minIF > 0) {
        errors.push(`${p.name} fails IF requirement in Game 2.`);
      }

      return { id: p.id, name: p.name, sitsTotal, isSub: p.id.startsWith("sub_"), isAbsentAny };
    });

    const hasZeroSitsPlayer = playerSits.some(p => p.sitsTotal === 0 && !p.isSub && !p.isAbsentAny);
    if (isDoubleHeader && hasZeroSitsPlayer) {
      playerSits.forEach(p => {
        if (p.sitsTotal >= 2 && !p.isSub && !p.isAbsentAny) {
          errors.push(`${p.name} sat twice, but someone else played all day.`);
        }
      });
    }

    return errors;
  };

  const toggleActive = (id: string) => {
    setActivePlayers(prev => {
      const updatedPlayers = prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p);
      const targetPlayer = updatedPlayers.find(p => p.id === id);
      const isInactive = targetPlayer ? !targetPlayer.isActive : false;
      
      if (isInactive) {
        setLocks(prevLocks => {
          const newLocks = { ...prevLocks };
          delete newLocks[id];
          return newLocks;
        });
      }
      
      if (rotation.length > 0) {
        const newRot = recomputeRotationWithAbsences(originalRotation, updatedPlayers);
        setRotation(newRot);
        
        const errors = validateLineup(newRot, updatedPlayers);
        if (errors.length > 0) {
          setValidationMsg(`⚠️ Lineup adjusted, but some requirements are violated: ${errors.join(" ")}`);
        } else {
          setValidationMsg('✅ Lineup adjusted and verified successfully.');
        }
      }
      
      return updatedPlayers;
    });
  };

  const toggleAttendance = (playerId: string, gameNum: 1 | 2) => {
    setActivePlayers(prev => {
      const updatedPlayers = prev.map(p => {
        if (p.id !== playerId) return p;
        return gameNum === 1 
          ? { ...p, absentG1: !p.absentG1 } 
          : { ...p, absentG2: !p.absentG2 };
      });

      const targetPlayer = updatedPlayers.find(p => p.id === playerId);
      const isAbsent = targetPlayer ? (gameNum === 1 ? !!targetPlayer.absentG1 : !!targetPlayer.absentG2) : false;
      
      if (isAbsent) {
        setLocks(prevLocks => {
          const newLocks = { ...prevLocks };
          const pLocks = { ...(newLocks[playerId] || {}) };
          const startInn = gameNum === 1 ? 1 : numInnings + 1;
          const endInn = gameNum === 1 ? numInnings : numInnings + numInningsG2;
          for (let i = startInn; i <= endInn; i++) {
            delete pLocks[i.toString()];
          }
          newLocks[playerId] = pLocks;
          return newLocks;
        });
      }

      if (rotation.length > 0) {
        const newRot = recomputeRotationWithAbsences(originalRotation, updatedPlayers);
        setRotation(newRot);
        
        const errors = validateLineup(newRot, updatedPlayers);
        if (errors.length > 0) {
          setValidationMsg(`⚠️ Lineup adjusted, but some requirements are violated: ${errors.join(" ")}`);
        } else {
          setValidationMsg('✅ Lineup adjusted and verified successfully.');
        }
      }

      return updatedPlayers;
    });
  };

  const getPositionsForInning = (backendInnStr: string) => {
    if (team?.League !== 'Minors') {
      return ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'Bench'];
    }
    const innVal = parseInt(backendInnStr);
    const isG2 = isDoubleHeader && innVal > numInnings;
    const presentCount = activePlayers.filter(p => {
      if (!p.isActive) return false;
      if (isG2) return !p.absentG2;
      return !p.absentG1;
    }).length;

    return presentCount < 10 
      ? ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'Bench'] 
      : ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'LC', 'RC', 'RF', 'Bench'];
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
    
    setOriginalRotation(prevOriginal => {
      const updatedOriginal = prevOriginal.map(r => r.id === playerId ? {...r, [inn]: pos} : r);
      const updatedActive = recomputeRotationWithAbsences(updatedOriginal, activePlayers);
      setRotation(updatedActive);
      return updatedOriginal;
    });
  };

  const activeCount = activePlayers.filter(p => p.isActive).length;

  const getEstPitches = (playerId: string) => {
    let pCount = 0;
    const totalInns = isDoubleHeader ? (numInnings + numInningsG2) : numInnings;
    for (let i = 1; i <= totalInns; i++) {
      const pos = locks[playerId]?.[i] || rotation.find(r => r.id === playerId)?.[i.toString()];
      if (pos === 'P') pCount++;
    }
    return pCount * 15;
  };

  const getPlayerStats = (playerId: string) => {
    const pLocks = locks[playerId] || {};
    const row = rotation.find(r => r.id === playerId) || {};
    
    const ifPositions = ['P', 'C', '1B', '2B', '3B', 'SS'];
    const ofPositions = ['LF', 'LC', 'RC', 'RF', 'CF'];

    const getStatsForInnings = (gInns: number[]) => {
      let ifCount = 0;
      let ofCount = 0;
      let benchCount = 0;
      for (const i of gInns) {
        const pos = pLocks[i.toString()] || row[i.toString()];
        if (ifPositions.includes(pos)) ifCount++;
        else if (ofPositions.includes(pos)) ofCount++;
        else if (pos === 'Bench') benchCount++;
      }
      return { ifCount, ofCount, benchCount };
    };

    const g1Inns = Array.from({ length: numInnings }, (_, idx) => idx + 1);
    const g2Inns = isDoubleHeader ? Array.from({ length: numInningsG2 }, (_, idx) => numInnings + idx + 1) : [];

    const g1 = getStatsForInnings(g1Inns);
    const g2 = getStatsForInnings(g2Inns);

    const minOF = 1;
    const minIF = isDoubleHeader ? 3 : (team?.League === 'Minors' ? 2 : 0);

    const player = activePlayers.find(ap => ap.id === playerId) || {};
    const meetsIFG1 = player.absentG1 || g1.ifCount >= minIF;
    const meetsOFG1 = player.absentG1 || g1.ofCount >= minOF;
    const meetsIFG2 = !isDoubleHeader || player.absentG2 || g2.ifCount >= minIF;
    const meetsOFG2 = !isDoubleHeader || player.absentG2 || g2.ofCount >= minOF;
    
    return { 
      g1, 
      g2, 
      meetsIFG1, 
      meetsOFG1, 
      meetsIFG2, 
      meetsOFG2, 
      minIF, 
      minOF 
    };
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
    if (isDoubleHeader && gameStatusG2 === 'Active' && currentInningG2 > 1) {
      for (let i = 1; i < currentInningG2; i++) {
        const innIndex = numInnings + i;
        rotation.forEach(r => {
          const pos = r[innIndex.toString()];
          if (pos) {
            if (!effectiveLocks[r.id]) effectiveLocks[r.id] = {};
            effectiveLocks[r.id][innIndex.toString()] = pos;
          }
        });
      }
    }

    // Inject Programmatic Absent locks
    activePlayers.forEach(p => {
      if (!p.isActive) return;
      if (isDoubleHeader) {
        if (p.absentG1) {
          for (let i = 1; i <= numInnings; i++) {
            if (!effectiveLocks[p.id]) effectiveLocks[p.id] = {};
            effectiveLocks[p.id][i.toString()] = 'Absent';
          }
        }
        if (p.absentG2) {
          for (let i = 1; i <= numInningsG2; i++) {
            const innStr = (numInnings + i).toString();
            if (!effectiveLocks[p.id]) effectiveLocks[p.id] = {};
            effectiveLocks[p.id][innStr] = 'Absent';
          }
        }
      } else {
        if (p.absentG1) {
          for (let i = 1; i <= numInnings; i++) {
            if (!effectiveLocks[p.id]) effectiveLocks[p.id] = {};
            effectiveLocks[p.id][i.toString()] = 'Absent';
          }
        }
      }
    });

    const totalInns = isDoubleHeader ? (numInnings + numInningsG2) : numInnings;

    // Check if Pitcher and Catcher are locked for all active innings
    const isBatterySet = Array.from({ length: totalInns }, (_, idx) => idx + 1).every(inn => {
      let hasP = false;
      let hasC = false;
      
      activePlayers.filter(p => p.isActive).forEach(p => {
        const pLocks = effectiveLocks[p.id];
        if (pLocks) {
          if (pLocks[inn.toString()] === 'P') hasP = true;
          if (pLocks[inn.toString()] === 'C') hasC = true;
        }
      });
      
      return hasP && hasC;
    });

    if (!isBatterySet) {
      const msg = isDoubleHeader 
        ? `❌ ERROR: Please lock a Pitcher (P) and Catcher (C) for all Game 1 and Game 2 innings before generating.`
        : `❌ ERROR: Please lock a Pitcher (P) and Catcher (C) for all ${numInnings} innings before generating.`;
      setValidationMsg(msg);
      setGenerating(false);
      return;
    }

    // Mathematical validation: Prevent locks that make it impossible to fulfill outfield requirement (1 inning per game)
    const validateGameLocks = (gInns: number[], gameName: string) => {
      for (const player of activePlayers) {
        if (!player.isActive || player.id.startsWith("sub_")) continue;
        if (gameName === "Game 1" && player.absentG1) continue;
        if (gameName === "Game 2" && player.absentG2) continue;
        
        let lockedOF = 0;
        let openSlots = gInns.length;
        
        const pLocks = effectiveLocks[player.id] || {};
        for (const inn of gInns) {
          const pos = pLocks[inn.toString()];
          if (pos) {
            openSlots--;
            if (['LF', 'LC', 'RC', 'RF', 'CF'].includes(pos)) {
              lockedOF++;
            }
          }
        }
        
        const minOF = 1;
        if (lockedOF + openSlots < minOF) {
          return `❌ ERROR: ${player.name} has too many locked innings in ${gameName} to fulfill the minimum Outfield requirement (${minOF} inn). Please remove some locks.`;
        }
      }
      return null;
    };

    const errG1 = validateGameLocks(Array.from({ length: numInnings }, (_, idx) => idx + 1), isDoubleHeader ? "Game 1" : "the game");
    if (errG1) {
      setValidationMsg(errG1);
      setGenerating(false);
      return;
    }

    if (isDoubleHeader) {
      const errG2 = validateGameLocks(Array.from({ length: numInningsG2 }, (_, idx) => numInnings + idx + 1), "Game 2");
      if (errG2) {
        setValidationMsg(errG2);
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
        ineligible_pitchers: Object.keys(pitchWarnings),
        num_innings: numInnings,
        is_double_header: isDoubleHeader,
        num_innings_g2: numInningsG2
      };
      
      const response = await api.post('/api/generate_rotation', payload);
      setRotation(response.data.rotation);
      setOriginalRotation(response.data.rotation);
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
    if (isDoubleHeader && !opponentG2) {
      setValidationMsg('❌ ERROR: Please select Game 2 opponent.');
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
        originalRotation,
        is_past_entry: false,
        // Double Header properties
        isDoubleHeader,
        numInnings,
        numInningsG2,
        opponentG2,
        isHomeG2,
        statusG2: gameStatusG2,
        currentInningG2
      });
      setValidationMsg('✅ Game saved successfully!');
    } catch (error) {
      setValidationMsg('❌ ERROR: Failed to save game.');
    }
  };


  if (!team) return <div className="glass-panel" style={{textAlign: 'center', padding: '50px'}}>You need an Admin to assign you to a Team before setting up a game.</div>;

  interface InningColumn {
    gameIndex: 1 | 2;
    displayInning: number;
    backendInningStr: string;
  }

  const inningColumns: InningColumn[] = [];
  for (let i = 1; i <= numInnings; i++) {
    inningColumns.push({
      gameIndex: 1,
      displayInning: i,
      backendInningStr: i.toString()
    });
  }
  if (isDoubleHeader) {
    for (let i = 1; i <= numInningsG2; i++) {
      inningColumns.push({
        gameIndex: 2,
        displayInning: i,
        backendInningStr: (numInnings + i).toString()
      });
    }
  }

  const playerSits = activePlayers.filter(p => p.isActive).map(p => {
    const stats = getPlayerStats(p.id);
    const sitsTotal = stats.g1.benchCount + (isDoubleHeader ? stats.g2.benchCount : 0);
    return { id: p.id, name: p.name, sitsTotal, isSub: p.id.startsWith("sub_") };
  });

  const hasZeroSitsPlayer = playerSits.some(p => {
    const playerObj = activePlayers.find(ap => ap.id === p.id);
    const isAbsentAny = playerObj?.absentG1 || playerObj?.absentG2;
    return p.sitsTotal === 0 && !p.isSub && !isAbsentAny;
  });
  
  const sitsViolationPlayers = new Set<string>();
  if (isDoubleHeader && hasZeroSitsPlayer) {
    playerSits.forEach(p => {
      const playerObj = activePlayers.find(ap => ap.id === p.id);
      const isAbsentAny = playerObj?.absentG1 || playerObj?.absentG2;
      if (p.sitsTotal >= 2 && !p.isSub && !isAbsentAny) {
        sitsViolationPlayers.add(p.id);
      }
    });
  }



  const opponentTeams = allTeams.filter(t => t.League === team.League && t.id !== team.id);
  const opponentName = opponentTeams.find(t => t.id === opponent)?.Team_Name || 'TBD';
  const matchTitle = isHome ? `${opponentName} @ ${team.Team_Name}` : `${team.Team_Name} @ ${opponentName}`;

  return (
    <>
      {/* Printable Dugout Chart */}
      <div className="print-only" style={{ padding: '0.5in' }}>
        {/* Game 1 Printable Chart */}
        <div style={{ pageBreakAfter: isDoubleHeader ? 'always' : 'auto' }}>
          <div style={{ marginBottom: '12px' }}>
            <h1 style={{ margin: 0, color: 'black', fontSize: '20px' }}>
              MBLL {team.League} Dugout Chart - {gameDate} | {isDoubleHeader ? `Game 1: ${matchTitle}` : matchTitle}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ borderBottom: '2px solid black', paddingBottom: '4px', color: 'black', margin: '0 0 8px 0', fontSize: '16px' }}>Batting Order</h2>
                <ol style={{ fontSize: '14px', lineHeight: '1.4', margin: 0, paddingLeft: '24px', color: 'black', whiteSpace: 'nowrap' }}>
                  {activePlayers.filter(p => p.isActive).map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ol>
              </div>
              <div style={{ marginTop: '16px' }}>
                <img src="/StreamSplitterLogo.png" alt="StreamSplitter" style={{width: '120px', height: 'auto'}} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ borderBottom: '2px solid black', paddingBottom: '4px', color: 'black', margin: '0 0 8px 0', fontSize: '16px' }}>Defensive Rotation</h2>
              <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'black', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Player</th>
                    {Array.from({ length: numInnings }, (_, idx) => idx + 1).map(i => (
                      <th key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activePlayers.filter(p => p.isActive).map(p => {
                    const row = rotation.find(r => r.id === p.id) || {};
                    return (
                      <tr key={p.id}>
                        <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}><strong>{p.name}</strong></td>
                        {Array.from({ length: numInnings }, (_, idx) => idx + 1).map(i => (
                          <td key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>
                            {locks[p.id]?.[i] || row[i.toString()] || '-'}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Minors Dugout Tracker */}
              {team?.League === 'Minors' && (
                <div style={{ marginTop: '24px' }}>
                  <h2 style={{ borderBottom: '2px solid black', paddingBottom: '4px', color: 'black', margin: '0 0 8px 0', fontSize: '16px' }}>Dugout Tracker (Minors)</h2>
                  <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'black', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left', width: '20%' }}>Metric</th>
                        {[1, 2, 3, 4, 5].map(i => (
                          <th key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{i}</th>
                        ))}
                        <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>Runs (Max 5)</td>
                        {[1, 2, 3, 4, 5].map(i => (
                          <td key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontSize: '14px', letterSpacing: '4px' }}>
                            □ □ □ □ □
                          </td>
                        ))}
                        <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>Walks (Max 5)</td>
                        {[1, 2, 3, 4, 5].map(i => (
                          <td key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontSize: '14px', letterSpacing: '4px' }}>
                            □ □ □ □ □
                          </td>
                        ))}
                        <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>Steals (Max 5, 1 Home)</td>
                        {[1, 2, 3, 4, 5, 'Last'].map(i => (
                          <td key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontSize: '14px', letterSpacing: '2px', whiteSpace: 'nowrap' }}>
                            □ □ □ □ <span style={{fontSize: '11px'}}>□H</span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game 2 Printable Chart (Only if double-header) */}
        {isDoubleHeader && (
          <div style={{ pageBreakBefore: 'always', paddingTop: '0.5in' }}>
            <div style={{ marginBottom: '12px' }}>
              <h1 style={{ margin: 0, color: 'black', fontSize: '20px' }}>
                MBLL {team.League} Dugout Chart - {gameDate} | Game 2: {isHomeG2 ? `${allTeams.find(t => t.id === opponentG2)?.Team_Name || 'TBD'} @ ${team.Team_Name}` : `${team.Team_Name} @ ${allTeams.find(t => t.id === opponentG2)?.Team_Name || 'TBD'}`}
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ borderBottom: '2px solid black', paddingBottom: '4px', color: 'black', margin: '0 0 8px 0', fontSize: '16px' }}>Batting Order</h2>
                  <ol style={{ fontSize: '14px', lineHeight: '1.4', margin: 0, paddingLeft: '24px', color: 'black', whiteSpace: 'nowrap' }}>
                    {activePlayers.filter(p => p.isActive).map((p) => (
                      <li key={p.id}>{p.name}</li>
                    ))}
                  </ol>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <img src="/StreamSplitterLogo.png" alt="StreamSplitter" style={{width: '120px', height: 'auto'}} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ borderBottom: '2px solid black', paddingBottom: '4px', color: 'black', margin: '0 0 8px 0', fontSize: '16px' }}>Defensive Rotation (Game 2)</h2>
                <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'black', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Player</th>
                      {Array.from({ length: numInningsG2 }, (_, idx) => idx + 1).map(i => (
                        <th key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activePlayers.filter(p => p.isActive).map(p => {
                      const row = rotation.find(r => r.id === p.id) || {};
                      return (
                        <tr key={p.id}>
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}><strong>{p.name}</strong></td>
                          {Array.from({ length: numInningsG2 }, (_, idx) => idx + 1).map(i => (
                            <td key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>
                              {locks[p.id]?.[(numInnings + i).toString()] || row[(numInnings + i).toString()] || '-'}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Minors Dugout Tracker */}
                {team?.League === 'Minors' && (
                  <div style={{ marginTop: '24px' }}>
                    <h2 style={{ borderBottom: '2px solid black', paddingBottom: '4px', color: 'black', margin: '0 0 8px 0', fontSize: '16px' }}>Dugout Tracker (Minors)</h2>
                    <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'black', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left', width: '20%' }}>Metric</th>
                          {[1, 2, 3, 4, 5].map(i => (
                            <th key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{i}</th>
                          ))}
                          <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Last</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>Runs (Max 5)</td>
                          {[1, 2, 3, 4, 5].map(i => (
                            <td key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontSize: '14px', letterSpacing: '4px' }}>
                              □ □ □ □ □
                            </td>
                          ))}
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}></td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>Walks (Max 5)</td>
                          {[1, 2, 3, 4, 5].map(i => (
                            <td key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontSize: '14px', letterSpacing: '4px' }}>
                              □ □ □ □ □
                            </td>
                          ))}
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}></td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid black', padding: '4px', textAlign: 'left', fontWeight: 'bold' }}>Steals (Max 5, 1 Home)</td>
                          {[1, 2, 3, 4, 5, 'Last'].map(i => (
                            <td key={i} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', fontSize: '14px', letterSpacing: '2px', whiteSpace: 'nowrap' }}>
                              □ □ □ □ <span style={{fontSize: '11px'}}>□H</span>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Validation Chart for Print */}
        <div className="validation-print-section" style={{ pageBreakBefore: 'always', paddingTop: '0.5in' }}>
          <div style={{ marginBottom: '12px' }}>
            <h1 style={{ margin: 0, color: 'black', fontSize: '20px' }}>MBLL {team.League} Validation - {gameDate} | {matchTitle}</h1>
          </div>
          <h2 style={{ borderBottom: '2px solid black', paddingBottom: '4px', color: 'black', margin: '0 0 8px 0', fontSize: '16px' }}>Inning Requirements Validation</h2>
          <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'black', fontSize: '11px' }}>
            <thead>
              {isDoubleHeader ? (
                <tr>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'left' }}>Player</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>G1 IF</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>G1 OF</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>G2 IF</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>G2 OF</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>Total Sits</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>Valid</th>
                </tr>
              ) : (
                <tr>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'left' }}>Player</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>IF Innings</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>OF Innings</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>Bench</th>
                  <th style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>Valid</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activePlayers.filter(p => p.isActive).map(p => {
                const stats = getPlayerStats(p.id);
                if (isDoubleHeader) {
                  const sitsTotal = stats.g1.benchCount + stats.g2.benchCount;
                  const sitsViol = sitsViolationPlayers.has(p.id);
                  const isValid = stats.meetsOFG1 && stats.meetsOFG2 && !sitsViol;
                  return (
                    <tr key={`print-val-${p.id}`}>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'left' }}>{p.name}</td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center', backgroundColor: stats.g1.ifCount >= 3 ? 'transparent' : '#fef08a' }}>
                        {stats.g1.ifCount} / 3
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center', backgroundColor: stats.meetsOFG1 ? 'transparent' : '#fca5a5' }}>
                        {stats.g1.ofCount}
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center', backgroundColor: stats.g2.ifCount >= 3 ? 'transparent' : '#fef08a' }}>
                        {stats.g2.ifCount} / 3
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center', backgroundColor: stats.meetsOFG2 ? 'transparent' : '#fca5a5' }}>
                        {stats.g2.ofCount}
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center', backgroundColor: sitsViol ? '#fca5a5' : 'transparent' }}>
                        {sitsTotal}
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>{isValid ? '✅' : '❌'}</td>
                    </tr>
                  );
                } else {
                  const minIF = team?.League === 'Minors' ? 2 : 0;
                  const isValid = stats.meetsIFG1 && stats.meetsOFG1;
                  return (
                    <tr key={`print-val-${p.id}`}>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'left' }}>{p.name}</td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center', backgroundColor: stats.meetsIFG1 ? 'transparent' : '#fca5a5' }}>
                        {stats.g1.ifCount} {minIF > 0 ? `(Min ${minIF})` : ''}
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center', backgroundColor: stats.meetsOFG1 ? 'transparent' : '#fca5a5' }}>
                        {stats.g1.ofCount} (Min 1)
                      </td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>{stats.g1.benchCount}</td>
                      <td style={{ border: '1px solid black', padding: '2px 4px', textAlign: 'center' }}>{isValid ? '✅' : '❌'}</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="no-print" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
      

      {/* Game Settings & Matchup */}
      <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
        <div style={{display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap'}}>
          <h3 style={{margin: 0, marginRight: 'auto'}}>Game Settings</h3>
          
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500'}}>
            <input 
              type="checkbox" 
              checked={isDoubleHeader} 
              onChange={e => handleToggleDoubleHeader(e.target.checked)} 
              style={{accentColor: 'var(--accent)'}}
            />
            Double-Header
          </label>
          
          {isDoubleHeader && (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>Game 1 Innings:</span>
              <select 
                className="select-field" 
                style={{width: 'auto', padding: '4px 8px'}} 
                value={numInnings} 
                onChange={e => setNumInnings(parseInt(e.target.value))}
              >
                {[3,4,5,6].map(i => <option key={i} value={i}>{i} Innings</option>)}
              </select>
            </div>
          )}
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
            <input type="date" className="input-field" style={{width: 'auto'}} value={gameDate} onChange={e => setGameDate(e.target.value)} />
            <span style={{fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic'}}>Manasquan Time</span>
          </div>

          <button className="btn" onClick={saveGame} disabled={rotation.length === 0}>Save Game Setup</button>
        </div>

        <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', gap: '16px', flexDirection: 'column'}}>
          <h4 style={{margin: 0, color: 'var(--accent)'}}>{isDoubleHeader ? 'Game 1 Matchup' : 'Game Matchup'}: {opponent ? `${matchTitle} (${numInnings} inn)` : 'Not Configured'}</h4>
          <div style={{display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap'}}>
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
              <option value="Postponed">Postponed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            {gameStatus === 'Active' && (
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--accent)'}}>
                <span style={{fontSize: '14px', color: 'var(--accent)', fontWeight: 'bold'}}>Entering Inning:</span>
                <select className="select-field" style={{width: 'auto', padding: '4px 8px'}} value={currentInning} onChange={e => setCurrentInning(parseInt(e.target.value))}>
                  {Array.from({ length: numInnings }, (_, idx) => idx + 1).map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {isDoubleHeader && (
          <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', gap: '16px', flexDirection: 'column'}}>
            <h4 style={{margin: 0, color: 'var(--accent)'}}>Game 2 Matchup: {opponentG2 ? `${isHomeG2 ? `${opponentTeams.find(t => t.id === opponentG2)?.Team_Name || 'TBD'} @ ${team.Team_Name}` : `${team.Team_Name} @ ${opponentTeams.find(t => t.id === opponentG2)?.Team_Name || 'TBD'}`} (${numInningsG2} inn)` : 'Not Configured'}</h4>
            <div style={{display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap'}}>
              <select className="select-field" style={{width: 'auto'}} value={isHomeG2 ? 'home' : 'away'} onChange={e => setIsHomeG2(e.target.value === 'home')}>
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
              <select className="select-field" style={{width: 'auto'}} value={opponentG2} onChange={e => setOpponentG2(e.target.value)}>
                <option value="">Select Opponent</option>
                {opponentTeams.map(t => <option key={t.id} value={t.id}>{t.Team_Name}</option>)}
              </select>
              <select className="select-field" style={{width: 'auto', border: gameStatusG2 === 'Active' ? '1px solid var(--accent)' : ''}} value={gameStatusG2} onChange={e => setGameStatusG2(e.target.value as any)}>
                <option value="Planned">Planned</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Postponed">Postponed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>Game 2 Innings:</span>
                <select 
                  className="select-field" 
                  style={{width: 'auto', padding: '4px 8px'}} 
                  value={numInningsG2} 
                  onChange={e => setNumInningsG2(parseInt(e.target.value))}
                >
                  {[3,4,5,6].map(i => <option key={i} value={i}>{i} Innings</option>)}
                </select>
              </div>
              {gameStatusG2 === 'Active' && (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--accent)'}}>
                  <span style={{fontSize: '14px', color: 'var(--accent)', fontWeight: 'bold'}}>Entering Inning:</span>
                  <select className="select-field" style={{width: 'auto', padding: '4px 8px'}} value={currentInningG2} onChange={e => setCurrentInningG2(parseInt(e.target.value))}>
                    {Array.from({ length: numInningsG2 }, (_, idx) => idx + 1).map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
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
                            {isDoubleHeader && player.isActive && (
                              <div style={{display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap'}}>
                                <button 
                                  className="btn" 
                                  style={{
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    background: player.absentG1 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.2)',
                                    color: player.absentG1 ? '#ef4444' : 'var(--accent)',
                                    border: `1px solid ${player.absentG1 ? 'rgba(239, 68, 68, 0.2)' : 'var(--accent)'}`,
                                    borderRadius: '4px'
                                  }}
                                  onClick={() => toggleAttendance(player.id, 1)}
                                >
                                  G1: {player.absentG1 ? 'Absent' : 'Present'}
                                </button>
                                <button 
                                  className="btn" 
                                  style={{
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    background: player.absentG2 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.2)',
                                    color: player.absentG2 ? '#ef4444' : '#8b5cf6',
                                    border: `1px solid ${player.absentG2 ? 'rgba(239, 68, 68, 0.2)' : '#8b5cf6'}`,
                                    borderRadius: '4px'
                                  }}
                                  onClick={() => toggleAttendance(player.id, 2)}
                                >
                                  G2: {player.absentG2 ? 'Absent' : 'Present'}
                                </button>
                              </div>
                            )}
                            {!isDoubleHeader && player.isActive && (
                              <div style={{display: 'flex', gap: '8px', marginTop: '6px'}}>
                                <button 
                                  className="btn" 
                                  style={{
                                    padding: '2px 8px', 
                                    fontSize: '11px', 
                                    background: player.absentG1 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.2)',
                                    color: player.absentG1 ? '#ef4444' : 'var(--accent)',
                                    border: `1px solid ${player.absentG1 ? 'rgba(239, 68, 68, 0.2)' : 'var(--accent)'}`,
                                    borderRadius: '4px'
                                  }}
                                  onClick={() => toggleAttendance(player.id, 1)}
                                >
                                  {player.absentG1 ? 'Absent' : 'Present'}
                                </button>
                              </div>
                            )}
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
            ⚠️ <strong>Required:</strong> You must explicitly lock your Pitchers (P) and Catchers (C) for all active innings. 
            The generator will not automatically assign these unique positions.
          </p>

          <div className="table-container">
            <table>
              <thead>
                {isDoubleHeader && (
                  <tr>
                    <th rowSpan={2} style={{ borderBottom: '2px solid var(--border-color)', verticalAlign: 'bottom' }}>Player</th>
                    <th colSpan={numInnings} style={{ textAlign: 'center', borderBottom: '2px solid var(--accent)', color: 'var(--accent)', fontWeight: 'bold', fontSize: '14px', paddingBottom: '8px' }}>
                      Game 1 Rotation
                    </th>
                    <th colSpan={numInningsG2} style={{ textAlign: 'center', borderBottom: '2px solid #8b5cf6', color: '#8b5cf6', fontWeight: 'bold', fontSize: '14px', paddingBottom: '8px', borderLeft: '2px solid var(--border-color)' }}>
                      Game 2 Rotation
                    </th>
                  </tr>
                )}
                <tr>
                  {!isDoubleHeader && <th>Player</th>}
                  {inningColumns.map((col, idx) => {
                    let hasP = false;
                    let hasC = false;
                    Object.values(locks).forEach(playerLocks => {
                      if (playerLocks[col.backendInningStr] === 'P') hasP = true;
                      if (playerLocks[col.backendInningStr] === 'C') hasC = true;
                    });
                    const isMissingBattery = !(hasP && hasC);
                    const borderLeft = isDoubleHeader && col.gameIndex === 2 && col.displayInning === 1 
                      ? '2px solid var(--border-color)' 
                      : '';
                    return (
                      <th 
                        key={idx} 
                        style={{
                          textAlign: 'center', 
                          color: isMissingBattery ? '#ef4444' : 'var(--text-secondary)',
                          borderLeft
                        }}
                      >
                        {col.displayInning}
                      </th>
                    );
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
                      {inningColumns.map((col, idx) => {
                        const isPlayerAbsentForCol = col.gameIndex === 2 ? p.absentG2 : p.absentG1;
                        const borderLeft = isDoubleHeader && col.gameIndex === 2 && col.displayInning === 1 
                          ? '2px solid var(--border-color)' 
                          : '';

                        if (isPlayerAbsentForCol) {
                          return (
                            <td key={idx} align="center" style={{ borderLeft }}>
                              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '12px' }}>Absent</span>
                            </td>
                          );
                        }

                        const currentVal = locks[p.id]?.[col.backendInningStr] || row[col.backendInningStr] || '';
                        const isAlgo = !locks[p.id]?.[col.backendInningStr] && !!row[col.backendInningStr];
                        const isHighIF = ['1B', '2B', '3B', 'SS'].includes(currentVal) && (p.skillInfield >= 4);
                        const shouldGlow = isAlgo && isHighIF;
                        const currentStatus = col.gameIndex === 2 ? gameStatusG2 : gameStatus;
                        const currentInnVal = col.gameIndex === 2 ? currentInningG2 : currentInning;

                        return (
                          <td key={idx} align="center" style={{ borderLeft }}>
                            <select 
                              className="select-field" 
                              style={{
                                width: '70px', 
                                padding: '4px', 
                                fontSize: '12px',
                                border: locks[p.id]?.[col.backendInningStr] ? '1px solid var(--accent)' : (shouldGlow ? '1px solid rgba(251, 191, 36, 0.8)' : '1px solid var(--border-color)'),
                                background: locks[p.id]?.[col.backendInningStr] ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                boxShadow: shouldGlow ? '0 0 10px rgba(251, 191, 36, 0.3), inset 0 0 4px rgba(251, 191, 36, 0.2)' : 'none'
                              }}
                              value={currentVal}
                              onChange={(e) => updateLock(p.id, col.backendInningStr, e.target.value)}
                            >
                              <option value="">--</option>
                              {getPositionsForInning(col.backendInningStr).map(pos => (
                                <option 
                                  key={pos} 
                                  value={pos} 
                                  disabled={(pos === 'P' && !!pitchWarnings[p.id]) || (currentStatus === 'Active' && (col.gameIndex === 1 ? parseInt(col.backendInningStr) < currentInnVal : col.displayInning < currentInnVal))}
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

          {/* Validation Chart for UI */}
          {rotation.length > 0 && (
            <div style={{ marginTop: '24px', background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Requirements Confirmation</h3>
              <div className="table-container">
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    {isDoubleHeader ? (
                      <tr>
                        <th style={{ textAlign: 'left' }}>Player</th>
                        <th style={{ textAlign: 'center' }}>G1 IF (Target 3)</th>
                        <th style={{ textAlign: 'center' }}>G1 OF (Min 1)</th>
                        <th style={{ textAlign: 'center' }}>G2 IF (Target 3)</th>
                        <th style={{ textAlign: 'center' }}>G2 OF (Min 1)</th>
                        <th style={{ textAlign: 'center' }}>Total Sits</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    ) : (
                      <tr>
                        <th style={{ textAlign: 'left' }}>Player</th>
                        <th style={{ textAlign: 'center' }}>IF Innings</th>
                        <th style={{ textAlign: 'center' }}>OF Innings</th>
                        <th style={{ textAlign: 'center' }}>Bench</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {activePlayers.filter(p => p.isActive).map(p => {
                      const stats = getPlayerStats(p.id);
                      if (isDoubleHeader) {
                        const sitsTotal = stats.g1.benchCount + stats.g2.benchCount;
                        const sitsViol = sitsViolationPlayers.has(p.id);
                        const isValid = stats.meetsOFG1 && stats.meetsOFG2 && !sitsViol;
                        return (
                          <tr key={`val-${p.id}`}>
                            <td style={{ textAlign: 'left', fontWeight: '500' }}>{p.name}</td>
                            <td style={{ textAlign: 'center', color: stats.g1.ifCount >= 3 ? 'var(--text-primary)' : '#eab308' }}>
                              {stats.g1.ifCount} / 3
                            </td>
                            <td style={{ textAlign: 'center', color: stats.meetsOFG1 ? 'var(--text-primary)' : '#ef4444' }}>
                              {stats.g1.ofCount}
                            </td>
                            <td style={{ textAlign: 'center', color: stats.g2.ifCount >= 3 ? 'var(--text-primary)' : '#eab308' }}>
                              {stats.g2.ifCount} / 3
                            </td>
                            <td style={{ textAlign: 'center', color: stats.meetsOFG2 ? 'var(--text-primary)' : '#ef4444' }}>
                              {stats.g2.ofCount}
                            </td>
                            <td style={{ textAlign: 'center', color: sitsViol ? '#ef4444' : 'var(--text-primary)' }}>
                              {sitsTotal} {sitsViol && <span style={{fontSize: '10px', color: '#ef4444'}}>(Sat 2+ times while roster player has 0 sits)</span>}
                            </td>
                            <td style={{ textAlign: 'center' }}>{isValid ? '✅' : '❌'}</td>
                          </tr>
                        );
                      } else {
                        const minIF = team?.League === 'Minors' ? 2 : 0;
                        const isValid = stats.meetsIFG1 && stats.meetsOFG1;
                        return (
                          <tr key={`val-${p.id}`}>
                            <td style={{ textAlign: 'left', fontWeight: '500' }}>{p.name}</td>
                            <td style={{ textAlign: 'center', color: stats.meetsIFG1 ? 'var(--text-primary)' : '#ef4444' }}>
                              {stats.g1.ifCount} {minIF > 0 ? <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>(Min {minIF})</span> : ''}
                            </td>
                            <td style={{ textAlign: 'center', color: stats.meetsOFG1 ? 'var(--text-primary)' : '#ef4444' }}>
                              {stats.g1.ofCount} <span style={{fontSize: '11px', color: 'var(--text-secondary)'}}>(Min 1)</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>{stats.g1.benchCount}</td>
                            <td style={{ textAlign: 'center' }}>{isValid ? '✅' : '❌'}</td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                  onClick={() => setShowPrintModal(true)}
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

      {/* Custom Print Modal */}
      {showPrintModal && (
        <div className="modal-backdrop">
          <div className="glass-panel" style={{ textAlign: 'center', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ marginTop: 0, fontSize: '20px' }}>Skip Validation Chart?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Skip printing the Fielding Requirements on a second page?
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="btn" 
                style={{ flex: 1, justifyContent: 'center', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'white' }}
                onClick={() => {
                  setShowPrintModal(false);
                  setTimeout(() => {
                    window.print();
                  }, 100);
                }}
              >
                No (Print 2 Pages)
              </button>
              <button 
                className="btn" 
                style={{ flex: 1, justifyContent: 'center', background: 'var(--accent)', color: 'white', border: 'none' }}
                autoFocus
                onClick={() => {
                  setShowPrintModal(false);
                  document.body.classList.add('hide-validation-print');
                  setTimeout(() => {
                    window.print();
                    document.body.classList.remove('hide-validation-print');
                  }, 100);
                }}
              >
                Yes (Skip)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
