from backend.logic import solve_rotation
import pandas as pd

active_players = ["York", "Wohltman", "Eichner", "Buontempo", "StClair", "Villiani", "Skokos", "LJ", "Hagaman", "Driscoll", "Ahern", "Peisel"]
league = "Minors"
locks = {
    "Wohltman": {"4": "P", "5": "P", "6": "P"},
    "Eichner": {"1": "P", "2": "P", "3": "P"},
    "Ahern": {"1": "C", "2": "C", "3": "C"},
    "Peisel": {"4": "C", "5": "C", "6": "C"}
}
skills = {
    "York": {"IF": 4, "OF": 4},
    "Wohltman": {"IF": 4, "OF": 4},
    "Eichner": {"IF": 5, "OF": 5},
    "Buontempo": {"IF": 3, "OF": 3},
    "StClair": {"IF": 4, "OF": 4},
    "Villiani": {"IF": 3, "OF": 3},
    "Skokos": {"IF": 4, "OF": 4},
    "LJ": {"IF": 3, "OF": 3},
    "Hagaman": {"IF": 1, "OF": 1},
    "Driscoll": {"IF": 1, "OF": 1},
    "Ahern": {"IF": 3, "OF": 3},
    "Peisel": {"IF": 5, "OF": 5}
}

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

inn = 1
def get_position_urgency(p):
    open_slots = sum(1 for i in range(inn, 7) if pd.isna(grid.at[p, i]))
    needs_of_flag = of_counts[p] < 1 
    needs_if_flag = (if_counts[p] < 2) 
    
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

unassigned_players = [p for p in active_players if pd.isna(grid.at[p, inn])]
for p in unassigned_players:
    print(f"{p}: base={get_position_urgency(p)} if_counts={if_counts[p]} of_counts={of_counts[p]}")
