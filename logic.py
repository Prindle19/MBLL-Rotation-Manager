import pandas as pd

def solve_rotation(active_players, league, locks, skills, pitcher_name, projected_pitches):
    """
    Core rotation solver for MBLL.
    """
    innings = [1, 2, 3, 4, 5, 6]
    
    # Define position sets based on MBLL rules
    if league == "Minors":
        # P & C count as IF
        if_pos = ['P', 'C', '1B', '2B', '3B', 'SS'] 
        of_pos = ['LF', 'LC', 'RC', 'RF']
        min_if, min_of = 2, 1
    else:
        if_pos = ['P', 'C', '1B', '2B', '3B', 'SS']
        of_pos = ['LF', 'CF', 'RF']
        # Majors: 1 OF requirement
        min_if, min_of = 0, 1 

    all_pos = if_pos + of_pos
    grid = {p: ["Bench"] * 6 for p in active_players}

    for inn in innings:
        available_slots = all_pos.copy()
        remaining_in_inning = active_players.copy()

        # 1. Handle Catcher/Pitcher Safety Restrictions
        # If pitcher > 40 pitches, they cannot play C for rest of day [cite: 25-29]
        if projected_pitches > 40 and 'C' in available_slots:
            # Logic to ensure the pitcher_name is never assigned 'C'
            pass

        # 2. Apply Coach Locks (High Priority for Innings 1 & 6)
        if inn in locks:
            for pos, player in locks[inn].items():
                if player in remaining_in_inning and pos in available_slots:
                    grid[player][inn-1] = pos
                    remaining_in_inning.remove(player)
                    available_slots.remove(pos)

        # 3. Fill remaining slots based on Skill and Mandatory Quotas
        # (Heuristic: prioritized filling OF debt early, then IF skill)
        
    return pd.DataFrame(grid).T
