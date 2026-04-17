import streamlit as st
from streamlit_sortables import sort_items
import pandas as pd
import datetime
from logic import solve_rotation
from auth import check_auth
from db import get_teams_for_coach, get_roster_for_team, save_game_plan

# Page Configuration
st.set_page_config(page_title="MBLL Rotation Manager", layout="wide", page_icon="⚾")

# 1. AUTHENTICATION
check_auth()

coach_email = st.session_state["user_email"]
coach_name = st.session_state["user_name"]

# Logout button
with st.sidebar:
    st.write(f"Logged in as: **{coach_name}** ({coach_email})")
    if st.button("Logout"):
        st.session_state.clear()
        st.rerun()
    st.divider()

# 2. DATABASE CONNECTION & DATA LOADING
@st.cache_data(ttl=60)
def load_data(email):
    teams_list = get_teams_for_coach(email)
    
    if not teams_list:
        return pd.DataFrame(), pd.DataFrame()
        
    teams_df = pd.DataFrame(teams_list)
    
    all_rosters = []
    for team in teams_list:
        roster_list = get_roster_for_team(team["id"])
        # ensure each player knows their team
        for player in roster_list:
            player["team_name"] = team.get("Team_Name", "Unknown")
        all_rosters.extend(roster_list)
        
    roster_df = pd.DataFrame(all_rosters) if all_rosters else pd.DataFrame(columns=["Name"])
    
    return roster_df, teams_df

roster_df, teams_df = load_data(coach_email)

st.title("⚾ MBLL Rotation & Lineup Manager")

if teams_df.empty:
    st.warning("No teams found for your account. Please set up your teams in Firestore under the 'teams' collection with 'coach_email' matching your Google email.")
    st.stop()

# 3. SIDEBAR: GAME SETUP & CHAOS CONTROL
with st.sidebar:
    st.header("1. Game Setup")
    league = st.selectbox("Select League", ["Majors", "Minors"])
    game_date = st.date_input("Game Date", datetime.date.today())
    
    # Dynamic Team Dropdowns filtered by League
    league_teams = teams_df[teams_df['League'] == league]['Team_Name'].tolist() if 'League' in teams_df.columns and 'Team_Name' in teams_df.columns else []
    home_team = st.selectbox("Home Team", league_teams if league_teams else ["No Teams Found"])
    away_team = st.selectbox("Visiting Team", league_teams if league_teams else ["No Teams Found"])
    
    # The 'Chaos Key' for overwriting existing plans
    game_id = f"{game_date}_{league}_{home_team}_vs_{away_team}"
    
    st.divider()
    st.subheader("2. Active Roster")
    st.write("Uncheck players who are absent today.")
    
    managed_team = home_team if home_team in league_teams else away_team
    
    if 'team_name' in roster_df.columns:
        team_roster = roster_df[roster_df['team_name'] == managed_team]
    else:
        team_roster = roster_df
        
    # Active list handles late-minute no-shows
    active_players = []
    if 'Name' in team_roster.columns:
        for name in team_roster['Name'].dropna():
            if st.checkbox(name, value=True, key=f"check_{name}"):
                active_players.append(name)

# 4. PITCHING SAFETY & ELIGIBILITY
st.header("Pitching Safety")
col1, col2 = st.columns(2)

with col1:
    target_pitcher = st.selectbox("Assigned Pitcher", active_players) if active_players else None
    # Projected pitches warn about catcher eligibility
    projected_pitches = st.slider("Projected Pitch Count", 0, 85, 40)
    
    if target_pitcher and projected_pitches > 40:
        st.warning(f"⚠️ {target_pitcher} cannot play Catcher today (Rule: >40 pitches). [cite: 75-79]")

with col2:
    st.info("The algorithm will automatically enforce rest days based on previous pitch counts stored in Firestore. [cite: 80-85]")

st.divider()

# 5. BATTING ORDER (DRAG & DROP)
st.header("Batting Order")
st.write("Arrange the players in the dugout order. This will be saved with the grid.")
ordered_lineup = sort_items(active_players) if active_players else []

# 6. GENERATE ROTATION
st.header("Defensive Rotation")

if st.button("Generate MBLL Compliant Rotation") and active_players:
    skills_dict = roster_df.set_index('Name').to_dict('index') if 'Name' in roster_df.columns else {}
    
    # The solver in logic.py handles the 2 IF/1 OF (Minors) or 1 OF (Majors) rules
    rotation_df = solve_rotation(
        ordered_lineup,
        league,
        {}, # Placeholder for future manual locks
        skills_dict,
        target_pitcher,
        projected_pitches
    )
    
    st.dataframe(rotation_df.style.highlight_max(axis=0, color='lightgreen'))
    st.session_state["rotation_df"] = rotation_df

# 7. ACCEPT & SAVE TO FIREBASE
st.divider()
if st.button("Accept & Finalize Game Plan"):
    if "rotation_df" in st.session_state:
        game_data = {
            "game_date": game_date.isoformat(),
            "league": league,
            "home_team": home_team,
            "away_team": away_team,
            "ordered_lineup": ordered_lineup,
            "rotation": st.session_state["rotation_df"].to_dict(),
            "target_pitcher": target_pitcher,
            "projected_pitches": projected_pitches
        }
        
        try:
            save_game_plan(coach_email, game_id, game_data)
            st.success(f"Lineup for {game_id} accepted and saved to Firebase!")
            st.balloons()
        except Exception as e:
            st.error(f"Failed to save to Firebase: {e}")
    else:
        st.warning("Please generate a rotation first.")

# 8. PRINT VIEW
if st.checkbox("Show Print-Friendly Summary"):
    st.subheader(f"Game Summary: {home_team} vs {away_team}")
    st.write(f"**Date:** {game_date} | **League:** {league}")
    st.write(f"**Batting Order:** {', '.join(ordered_lineup)}")
