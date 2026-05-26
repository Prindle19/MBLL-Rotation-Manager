import pandas as pd
import random

def solve_rotation(active_players, league, locks, skills, pitcher_name=None, projected_pitches=0, active_count=10, ineligible_pitchers=None, num_innings=6, is_double_header=False, num_innings_g2=4):
    if ineligible_pitchers is None:
        ineligible_pitchers = []
    
    num_innings = int(num_innings)
    num_innings_g2 = int(num_innings_g2)
    
    total_innings = num_innings
    if is_double_header:
        total_innings = num_innings + num_innings_g2
        
    innings = list(range(1, total_innings + 1))
    
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
                if p_id in active_players and inn in innings:
                    grid.at[p_id, inn] = pos

    for inn in innings:
        available_slots = all_pos.copy()
        
        # Determine which game the current inning belongs to and the corresponding innings list
        if is_double_header:
            if inn <= num_innings:
                g_inns = list(range(1, num_innings + 1))
            else:
                g_inns = list(range(num_innings + 1, total_innings + 1))
        else:
            g_inns = innings
            
        # Calculate counts so far in the current game
        if_counts_game = {}
        of_counts_game = {}
        for p in active_players:
            if_cnt = 0
            of_cnt = 0
            for i in g_inns:
                pos = grid.at[p, i]
                if pd.notna(pos):
                    if pos in if_pos: if_cnt += 1
                    elif pos in of_pos: of_cnt += 1
            if_counts_game[p] = if_cnt
            of_counts_game[p] = of_cnt
            
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
                    
        def get_bench_urgency(p):
            open_slots_game = sum(1 for i in g_inns if i >= inn and pd.isna(grid.at[p, i]))
            needs_of_flag = of_counts_game[p] < 1 and not str(p).startswith("sub_")
            
            if is_double_header:
                min_if = 3
            else:
                min_if = 2 if league == "Minors" else 0
                
            needs_if_flag = if_counts_game[p] < min_if and not str(p).startswith("sub_")
            
            reqs_needed = 0
            if needs_of_flag: reqs_needed += 1
            if needs_if_flag: reqs_needed += 1
            
            urgency = 0
            if reqs_needed > 0 and reqs_needed >= open_slots_game:
                urgency = 1000000 + (reqs_needed * 1000) - open_slots_game
            else:
                urgency = 1000 + (reqs_needed * 50) - open_slots_game
                
            benched_score = 500000 if p in benched_last else 0
            
            # Bench calculations are tracked for the whole day
            benches_realized = sum(1 for i in range(1, inn) if pd.isna(grid.at[p, i]) or grid.at[p, i] == "Bench")
            future_locked_benches = sum(1 for i in range(inn, total_innings + 1) if grid.at[p, i] == "Bench")
            guaranteed_benches = benches_realized + future_locked_benches
            
            total_bench_slots_day = max(0, (active_count * total_innings) - (len(all_pos) * total_innings))
            max_benches = (total_bench_slots_day + active_count - 1) // active_count if active_count > 0 else 0
            min_benches = total_bench_slots_day // active_count if active_count > 0 else 0
            
            total_bench_score = guaranteed_benches * 50000
            if guaranteed_benches >= max_benches and max_benches > 0:
                total_bench_score += 5000000
                
            min_bench_emergency = 0
            open_slots_day = sum(1 for i in range(inn, total_innings + 1) if pd.isna(grid.at[p, i]))
            if guaranteed_benches < min_benches:
                benches_needed = min_benches - guaranteed_benches
                if open_slots_day <= benches_needed:
                    min_bench_emergency = -2000000
            
            # Double-header benching constraint:
            # "a player can't sit twice until all players have sat one inning for the whole day, not by game"
            if is_double_header and not str(p).startswith("sub_"):
                committed_sits = {}
                for pl in active_players:
                    if str(pl).startswith("sub_"):
                        committed_sits[pl] = 999
                        continue
                    b_real = sum(1 for i in range(1, inn) if pd.isna(grid.at[pl, i]) or grid.at[pl, i] == "Bench")
                    b_fut = sum(1 for i in range(inn, total_innings + 1) if grid.at[pl, i] == "Bench")
                    committed_sits[pl] = b_real + b_fut
                
                any_zero_sits = any(committed_sits[pl] == 0 for pl in active_players if not str(pl).startswith("sub_"))
                if any_zero_sits and committed_sits[p] >= 1:
                    # Player already sat, but someone has sat 0 times, so force this player to play
                    urgency += 10000000
            
            p_skills = skills.get(p, {"IF": 3, "OF": 3})
            skill_score = (p_skills["IF"] + p_skills["OF"]) * 1000
            
            return urgency + benched_score + total_bench_score + min_bench_emergency + skill_score + random.randint(0, 2000)

        def get_position_urgency(p):
            open_slots = sum(1 for i in g_inns if i >= inn and pd.isna(grid.at[p, i]))
            needs_of_flag = of_counts_game[p] < 1 and not str(p).startswith("sub_")
            
            if is_double_header:
                min_if = 3
            else:
                min_if = 2 if league == "Minors" else 0
                
            needs_if_flag = if_counts_game[p] < min_if and not str(p).startswith("sub_")
            
            reqs_needed = 0
            if needs_of_flag: reqs_needed += 1
            if needs_if_flag: reqs_needed += 1
            
            base = 0
            if reqs_needed > 0 and reqs_needed >= open_slots:
                base = 1000000 + (reqs_needed * 1000) - open_slots
            elif reqs_needed > 0:
                base = 10000 + (10 - open_slots) * 100
            else:
                base = 1000 - open_slots
                
            p_skills = skills.get(p, {"IF": 3, "OF": 3})
            if p_skills["IF"] > 3 and of_counts_game[p] >= 1 and reqs_needed == 0:
                base += 5000
                
            # Prioritize weak IF players to pick their positions first when they need IF
            if needs_if_flag:
                base += (5 - p_skills["IF"]) * 50
                
            return base + random.randint(0, 500)
            
        # 1. Determine WHO PLAYS this inning (Bench avoidance)
        random.shuffle(unassigned_players)
        unassigned_players.sort(key=get_bench_urgency, reverse=True)
        
        num_available = len(available_slots)
        playing_players = unassigned_players[:num_available]
        
        # 2. Determine PICK ORDER for positions (Requirement priority)
        playing_players.sort(key=get_position_urgency, reverse=True)
        
        for p_id in playing_players:
            if not available_slots:
                break
                
            p_skills = skills.get(p_id, {"IF": 3, "OF": 3})
            
            # Determine needs
            is_sub = str(p_id).startswith("sub_")
            needs_of = of_counts_game[p_id] < 1 or is_sub
            
            if is_double_header:
                min_if = 3
            else:
                min_if = 2 if league == "Minors" else 0
                
            needs_if = (if_counts_game[p_id] < min_if) and not is_sub
            
            chosen_pos = None
            
            # Create a copy of available slots for this specific player to apply constraints
            player_slots = available_slots.copy()
            if p_id in ineligible_pitchers and 'P' in player_slots:
                player_slots.remove('P')
                
            possible_if = [s for s in player_slots if s in if_pos]
            possible_of = [s for s in player_slots if s in of_pos]
            
            # Enforce rule: >3 IF skill should only play 1 OF inning max
            if p_skills["IF"] > 3 and of_counts_game[p_id] >= 1 and possible_if:
                possible_of = []
                
            # Prevent players from taking OF if they don't strictly need it, 
            # AND doing so would steal it from someone who DOES need it.
            if not needs_of and possible_of and possible_if:
                idx = playing_players.index(p_id)
                unassigned_need_of = sum(1 for p in playing_players[idx+1:] if pd.isna(grid.at[p, inn]) and of_counts_game[p] < 1 and not str(p).startswith("sub_"))
                if len(possible_of) <= unassigned_need_of:
                    possible_of = []
            
            zone = None
            if is_sub and 'RF' in player_slots:
                chosen_pos = 'RF'
            elif needs_of and possible_of:
                zone = "OF"
            elif needs_if and possible_if:
                # If they are a weak infielder, try to wait for 2B unless it's an emergency
                if p_skills["IF"] <= 2 and '2B' not in possible_if:
                    open_slots = sum(1 for i in g_inns if i >= inn and pd.isna(grid.at[p_id, i]))
                    reqs = min_if - if_counts_game[p_id]
                    if open_slots > reqs and possible_of:
                        zone = "OF"
                    else:
                        zone = "IF"
                else:
                    zone = "IF"
            else:
                # Based on skills (pick zone randomly if both exist, then use skill for specific position)
                zone_choices = []
                if possible_if: zone_choices.append("IF")
                if possible_of: zone_choices.append("OF")
                
                if is_sub and possible_of:
                    zone = "OF"
                elif zone_choices:
                    zone = random.choice(zone_choices)
                    
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

    return grid.fillna("Bench")
