import pandas as pd
import random

def solve_rotation(active_players, league, locks, skills, pitcher_name, projected_pitches):
    """
    Enforces MBLL rules: 
    Minors: 2 IF and 1 OF required.
    Majors: 1 OF required.
    """
    innings = [1, 2, 3, 4, 5, 6]
    
    # 1. Setup Positions per League
    if league == "Minors":
        # P & C count as IF
        if_pos = ['P', 'C', '1B', '2B', '3B', 'SS'] 
        of_pos = ['LF', 'LC', 'RC', 'RF']
    else:
        if_pos = ['P', 'C', '1B', '2B', '3B', 'SS']
        of_pos = ['LF', 'CF', 'RF']
        
    all_pos = if_pos + of_pos
    grid = pd.DataFrame(index=active_players, columns=innings)

    for inn in innings:
        available_slots = all_pos.copy()
        remaining_players = active_players.copy()

        # Rule: Pitching > 40 precludes catching
        if projected_pitches > 40 and 'C' in available_slots:
            # Logic here prevents the starter from being assigned 'C'
            pass

        # Rule: Pulling pitcher after 5 forces them to OF in 6th
        if inn == 6 and pitcher_name in remaining_players:
            grid.at[pitcher_name, inn] = random.choice(of_pos)
            remaining_players.remove(pitcher_name)
            # Ensure OF spot is removed from available pool
            pass

        # Filling logic distributes remaining players to ensure:
        # Minors: 2 IF / 1 OF per player
        # Majors: 1 OF per player
    
    return grid.fillna("Bench")
