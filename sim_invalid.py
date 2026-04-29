from backend.logic import solve_rotation

active_players = ["York", "Wohltman", "Eichner", "Buontempo", "StClair", "Villiani", "Skokos", "LJ", "Hagaman", "Driscoll", "Ahern", "Peisel"]
league = "Minors"
locks = {
    "Eichner": {"1": "P", "2": "P", "3": "P"},
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

for i in range(100):
    grid = solve_rotation(active_players, league, locks, skills, active_count=12)
    invalid = False
    for p in active_players:
        if_count = sum(1 for inn in range(1, 7) if grid.at[p, inn] in ['P', 'C', '1B', '2B', '3B', 'SS'])
        of_count = sum(1 for inn in range(1, 7) if grid.at[p, inn] in ['LF', 'LC', 'RC', 'RF', 'CF'])
        if if_count < 2 or of_count < 1:
            print(f"INVALID: {p} IF:{if_count} OF:{of_count} Assignments: {[grid.at[p, inn] for inn in range(1,7)]}")
            invalid = True
    if invalid:
        print(f"Found invalid solution on run {i}")
        break
else:
    print("No invalid solutions found")
