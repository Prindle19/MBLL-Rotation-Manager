from backend.logic import solve_rotation
import random

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

# we'll run it 100 times to see if Peisel ever gets 0 OF innings
fails = 0
for i in range(100):
    grid = solve_rotation(active_players, league, locks, skills, active_count=12)
    of_counts = sum(1 for inn in range(1, 7) if grid.at['Peisel', inn] in ['LF', 'LC', 'RC', 'RF', 'CF'])
    if of_counts == 0:
        fails += 1
        if fails == 1:
            print("Failed on run", i)
            print("Peisel assignments:", [grid.at['Peisel', inn] for inn in range(1, 7)])

print(f"Total failures: {fails}/100")
