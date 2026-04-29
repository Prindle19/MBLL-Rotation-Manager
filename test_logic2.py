from backend.logic import solve_rotation

active_players = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11", "p12"]
league = "Minors"
locks = {
    "p12": {"4": "C", "5": "C", "6": "C"} # Landon Peisel
}
skills = {p: {"IF": 3, "OF": 3} for p in active_players}
skills["p12"] = {"IF": 5, "OF": 5}

grid = solve_rotation(active_players, league, locks, skills, active_count=12)
print("P12 assignments:")
for inn in range(1, 7):
    print(f"Inning {inn}: {grid.at['p12', inn]}")
