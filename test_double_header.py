from backend.logic import solve_rotation

def test_dynamic_innings_single_game():
    print("--- Testing Dynamic Innings Single Game (4 Innings) ---")
    active_players = [f"p{i}" for i in range(1, 12)] # 11 active players
    league = "Minors"
    locks = {
        "p1": {"1": "P", "2": "C"},
        "p2": {"3": "P", "4": "C"},
        "p3": {"1": "C", "2": "P"},
        "p4": {"3": "C", "4": "P"},
    }
    skills = {p: {"IF": 3, "OF": 3} for p in active_players}
    
    grid = solve_rotation(
        active_players=active_players,
        league=league,
        locks=locks,
        skills=skills,
        active_count=11,
        num_innings=4,
        is_double_header=False
    )
    
    print(grid)
    # Check that columns are exactly 1 to 4
    assert list(grid.columns) == [1, 2, 3, 4]
    print("SUCCESS: Dynamic Innings Single Game Test Passed!")

def test_double_header_rules():
    print("\n--- Testing Double Header Rules (4 Innings each) ---")
    active_players = [f"p{i}" for i in range(1, 12)] # 11 active players
    league = "Minors"
    # Lock pitchers and catchers for all innings of Game 1 (1-4) and Game 2 (5-8)
    locks = {
        "p1": {"1": "P", "2": "C", "5": "P", "6": "C"},
        "p2": {"3": "P", "4": "C", "7": "P", "8": "C"},
        "p3": {"1": "C", "2": "P", "5": "C", "6": "P"},
        "p4": {"3": "C", "4": "P", "7": "C", "8": "P"},
    }
    skills = {p: {"IF": 3, "OF": 3} for p in active_players}
    
    grid = solve_rotation(
        active_players=active_players,
        league=league,
        locks=locks,
        skills=skills,
        active_count=11,
        num_innings=4,
        is_double_header=True,
        num_innings_g2=4
    )
    
    print(grid)
    # Check columns
    assert list(grid.columns) == [1, 2, 3, 4, 5, 6, 7, 8]
    
    # Check outfield minimum rule: 1 outfield inning in Game 1 and 1 in Game 2
    of_pos = ['LF', 'LC', 'RC', 'RF'] # since active_count = 11 >= 10
    
    for p in active_players:
        # Game 1 outfield count
        of_cnt_g1 = sum(1 for i in range(1, 5) if grid.at[p, i] in of_pos)
        # Game 2 outfield count
        of_cnt_g2 = sum(1 for i in range(5, 9) if grid.at[p, i] in of_pos)
        print(f"Player {p} OF counts -> G1: {of_cnt_g1}, G2: {of_cnt_g2}")
        assert of_cnt_g1 >= 1, f"Player {p} failed OF requirement in Game 1"
        assert of_cnt_g2 >= 1, f"Player {p} failed OF requirement in Game 2"
        
    # Check double-header sits rule: "a player can't sit twice until all players have sat one inning for the whole day"
    # Let's count total sits for each player
    sits = {}
    for p in active_players:
        sits[p] = sum(1 for i in range(1, 9) if grid.at[p, i] == "Bench")
        
    print("Sits per player for the whole day:", sits)
    any_zero_sits = any(sits[p] == 0 for p in active_players)
    if any_zero_sits:
        # If someone has 0 sits, no one else can have >= 2 sits
        for p, count in sits.items():
            assert count < 2, f"Player {p} sat twice ({count} times) while another player had 0 sits!"
            
    print("SUCCESS: Double Header Sits Rule Test Passed!")

if __name__ == "__main__":
    test_dynamic_innings_single_game()
    test_double_header_rules()
