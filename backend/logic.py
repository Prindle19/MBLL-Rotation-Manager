import pandas as pd
import random

def solve_rotation(active_players, league, locks, skills, pitcher_name=None, projected_pitches=0, active_count=10, ineligible_pitchers=None):
    if ineligible_pitchers is None:
        ineligible_pitchers = []
    innings = [1, 2, 3, 4, 5, 6]
    
    if league == "Minors":
        if_pos = ['P', 'C', '1B', '2B', '3B', 'SS'] 
        if active_count < 10:
            of_pos = ['LF', 'CF', 'RF']
        else:
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
                    
        # Do not allow the random solver to assign Pitcher or Catcher
        if 'P' in available_slots:
            available_slots.remove('P')
        if 'C' in available_slots:
            available_slots.remove('C')
                    
        unassigned_players = [p for p in active_players if pd.isna(grid.at[p, inn])]
        
        # Determine who was benched last inning
        benched_last = set()
        if inn > 1:
            for p in unassigned_players:
                prev_pos = grid.at[p, inn - 1]
                if pd.isna(prev_pos) or prev_pos == "Bench":
                    benched_last.add(p)
                    
        def get_urgency(p):
            open_slots = sum(1 for i in range(inn, 7) if pd.isna(grid.at[p, i]))
            needs_of_flag = of_counts[p] < 1 and not str(p).startswith("sub_")
            needs_if_flag = (if_counts[p] < 2 if league == "Minors" else False) and not str(p).startswith("sub_")
            
            reqs_needed = 0
            if needs_of_flag: reqs_needed += 1
            if needs_if_flag: reqs_needed += 1
            
            urgency = 0
            
            # Absolute Priority Mode: They have exactly enough (or fewer) open slots to meet their needs. 
            # They MUST go first.
            if reqs_needed > 0 and reqs_needed >= open_slots:
                urgency = 1000000 + (reqs_needed * 1000) - open_slots
            # High Priority: They need requirements, and the fewer open slots they have, the higher priority.
            elif reqs_needed > 0:
                urgency = 10000 + (10 - open_slots) * 100
            # Base Priority: Fills based on skills, but heavily locked players still need priority 
            # so they don't accidentally get benched and lose their only open slot.
            else:
                urgency = 1000 - open_slots
                
            benched_score = 500000 if p in benched_last else 0
            
            # Additional penalty for total times benched already
            times_benched = sum(1 for i in range(1, inn) if pd.isna(grid.at[p, i]) or grid.at[p, i] == "Bench")
            total_bench_score = times_benched * 50000
            
            return urgency + benched_score + total_bench_score
            
        # Sort unassigned randomly, then by urgency (stable sort preserves random order for ties)
        random.shuffle(unassigned_players)
        unassigned_players.sort(key=get_urgency, reverse=True)
        
        for p_id in unassigned_players:
            if not available_slots:
                break
                
            p_skills = skills.get(p_id, {"IF": 3, "OF": 3})
            
            # Determine needs
            is_sub = str(p_id).startswith("sub_")
            needs_of = of_counts[p_id] < 1 or is_sub
            needs_if = (if_counts[p_id] < 2 if league == "Minors" else False) and not is_sub
            
            chosen_pos = None
            
            # Create a copy of available slots for this specific player to apply constraints
            player_slots = available_slots.copy()
            if p_id in ineligible_pitchers and 'P' in player_slots:
                player_slots.remove('P')
                
            possible_if = [s for s in player_slots if s in if_pos]
            possible_of = [s for s in player_slots if s in of_pos]
            
            if is_sub and 'RF' in player_slots:
                chosen_pos = 'RF'
            elif needs_of and possible_of:
                chosen_pos = random.choice(possible_of)
            elif needs_if and possible_if:
                chosen_pos = random.choice(possible_if)
            else:
                # Based on skills (pick zone randomly if both exist, then use skill for specific position)
                zone_choices = []
                if possible_if: zone_choices.append("IF")
                if possible_of: zone_choices.append("OF")
                
                if is_sub and possible_of:
                    zone = "OF"
                elif zone_choices:
                    zone = random.choice(zone_choices)
                else:
                    zone = None
                    
                if zone == "OF":
                    of_skill = p_skills["OF"]
                    premium_of = [p for p in possible_of if p in ['CF', 'LC', 'LF']]
                    hidden_of = [p for p in possible_of if p in ['RF', 'RC']]
                    if of_skill >= 4 and premium_of:
                        chosen_pos = random.choice(premium_of)
                    elif of_skill <= 2 and hidden_of:
                        chosen_pos = random.choice(hidden_of)
                    else:
                        chosen_pos = random.choice(possible_of)
                elif zone == "IF":
                    if_skill = p_skills["IF"]
                    premium_if = [p for p in possible_if if p in ['SS', '1B', '3B']]
                    hidden_if = [p for p in possible_if if p in ['2B']]
                    if if_skill >= 4 and premium_if:
                        chosen_pos = random.choice(premium_if)
                    elif if_skill <= 2 and hidden_if:
                        chosen_pos = random.choice(hidden_if)
                    else:
                        chosen_pos = random.choice(possible_if)
                    
            if chosen_pos:
                grid.at[p_id, inn] = chosen_pos
                available_slots.remove(chosen_pos)
            
            if chosen_pos in if_pos:
                if_counts[p_id] += 1
            elif chosen_pos in of_pos:
                of_counts[p_id] += 1

    return grid.fillna("Bench")
