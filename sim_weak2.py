from backend.logic import solve_rotation

active_players = ["York", "Wohltman", "Eichner", "Buontempo", "StClair", "Villiani", "Skokos", "LJ", "Hagaman", "Driscoll", "Ahern", "Peisel"]
league = "Minors"
locks = {}
skills = {
    "York": {"IF": 5, "OF": 5},
    "Wohltman": {"IF": 5, "OF": 5},
    "Eichner": {"IF": 5, "OF": 5},
    "Buontempo": {"IF": 5, "OF": 5},
    "StClair": {"IF": 1, "OF": 1},
    "Villiani": {"IF": 1, "OF": 1},
    "Skokos": {"IF": 1, "OF": 1},
    "LJ": {"IF": 1, "OF": 1},
    "Hagaman": {"IF": 1, "OF": 1},
    "Driscoll": {"IF": 1, "OF": 1},
    "Ahern": {"IF": 1, "OF": 1},
    "Peisel": {"IF": 1, "OF": 1}
}

grid = solve_rotation(active_players, league, locks, skills, active_count=12)
for p in active_players:
    if_count = sum(1 for inn in range(1, 7) if grid.at[p, inn] in ['P', 'C', '1B', '2B', '3B', 'SS'])
    of_count = sum(1 for inn in range(1, 7) if grid.at[p, inn] in ['LF', 'LC', 'RC', 'RF', 'CF'])
    print(f"{p} IF:{if_count} OF:{of_count} Assignments: {[grid.at[p, inn] for inn in range(1,7)]}")
