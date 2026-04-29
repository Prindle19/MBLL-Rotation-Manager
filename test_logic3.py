from backend.logic import solve_rotation

active_players = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11", "p12"]
league = "Minors"
locks = {
    "p12": {"4": "C", "5": "C", "6": "C"} # Landon Peisel
}
skills = {p: {"IF": 3, "OF": 3} for p in active_players}
skills["p12"] = {"IF": 5, "OF": 5}
skills["p1"] = {"IF": 4, "OF": 4} # Landon York
skills["p2"] = {"IF": 4, "OF": 4} # Nolan Wohltman
skills["p8"] = {"IF": 1, "OF": 1} # Jackson
skills["p9"] = {"IF": 1, "OF": 1} # Logan

import pandas as pd
grid = pd.DataFrame(index=active_players, columns=[1,2,3,4,5,6])
if_pos = ['P', 'C', '1B', '2B', '3B', 'SS']
of_pos = ['LF', 'LC', 'RC', 'RF']
for p_id, p_locks in locks.items():
    for inn_str, pos in p_locks.items():
        grid.at[p_id, int(inn_str)] = pos

if_counts = {p: 0 for p in active_players}
of_counts = {p: 0 for p in active_players}

for p in active_players:
    for inn in range(1,7):
        pos = grid.at[p, inn]
        if pd.notna(pos):
            if pos in if_pos: if_counts[p] += 1
            elif pos in of_pos: of_counts[p] += 1

def get_position_urgency(p):
    inn = 1
    open_slots = sum(1 for i in range(inn, 7) if pd.isna(grid.at[p, i]))
    needs_of_flag = of_counts[p] < 1 and not str(p).startswith("sub_")
    needs_if_flag = (if_counts[p] < 2 if league == "Minors" else False) and not str(p).startswith("sub_")
    
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
    if p_skills["IF"] > 3 and of_counts[p] >= 1 and reqs_needed == 0:
        base += 5000
        
    if needs_if_flag:
        base += (5 - p_skills["IF"]) * 50
        
    return base

for p in active_players:
    print(f"{p}: {get_position_urgency(p)}")
