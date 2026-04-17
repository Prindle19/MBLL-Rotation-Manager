import pandas as pd
import random

def solve_rotation(active_players, league, locks, skills, pitcher_name=None, projected_pitches=0):
    innings = [1, 2, 3, 4, 5, 6]
    
    if league == "Minors":
        if_pos = ['P', 'C', '1B', '2B', '3B', 'SS'] 
        of_pos = ['LF', 'LC', 'RC', 'RF']
    else:
        if_pos = ['P', 'C', '1B', '2B', '3B', 'SS']
        of_pos = ['LF', 'CF', 'RF']
        
    all_pos = if_pos + of_pos
    
    grid = pd.DataFrame(index=active_players, columns=innings)
    
    # 1. Apply locks
    if locks:
        for p_id, p_locks in locks.items():
            for inn_str, pos in p_locks.items():
                if pos == '': continue
                inn = int(inn_str)
                if p_id in active_players:
                    grid.at[p_id, inn] = pos

    # Track counts
    if_counts = {p: 0 for p in active_players}
    of_counts = {p: 0 for p in active_players}

    # Pre-count locks
    for p in active_players:
        for inn in innings:
            pos = grid.at[p, inn]
            if pd.notna(pos):
                if pos in if_pos: if_counts[p] += 1
                elif pos in of_pos: of_counts[p] += 1

    for inn in innings:
        available_slots = all_pos.copy()
        
        # Remove locked slots from available
        for p_id in active_players:
            pos = grid.at[p_id, inn]
            if pd.notna(pos):
                if pos in available_slots:
                    available_slots.remove(pos)
                    
        unassigned_players = [p for p in active_players if pd.isna(grid.at[p, inn])]
        
        # Sort unassigned randomly
        random.shuffle(unassigned_players)
        
        for p_id in unassigned_players:
            if not available_slots:
                break
                
            p_skills = skills.get(p_id, {"IF": 3, "OF": 3})
            
            # Determine needs
            needs_of = of_counts[p_id] < 1
            needs_if = if_counts[p_id] < 2 if league == "Minors" else False
            
            chosen_pos = None
            possible_if = [s for s in available_slots if s in if_pos]
            possible_of = [s for s in available_slots if s in of_pos]
            
            if needs_of and possible_of:
                chosen_pos = random.choice(possible_of)
            elif needs_if and possible_if:
                chosen_pos = random.choice(possible_if)
            else:
                # Based on skills
                if p_skills["IF"] >= p_skills["OF"] and possible_if:
                    chosen_pos = random.choice(possible_if)
                elif p_skills["OF"] > p_skills["IF"] and possible_of:
                    chosen_pos = random.choice(possible_of)
                else:
                    chosen_pos = random.choice(available_slots)
                    
            grid.at[p_id, inn] = chosen_pos
            available_slots.remove(chosen_pos)
            
            if chosen_pos in if_pos:
                if_counts[p_id] += 1
            elif chosen_pos in of_pos:
                of_counts[p_id] += 1

    return grid.fillna("Bench")
