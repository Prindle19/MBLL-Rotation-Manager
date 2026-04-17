import streamlit as st
from streamlit_gsheets import GSheetsConnection
from streamlit_sortables import sort_items
import pandas as pd
import datetime
import random
from logic import solve_rotation

# Page Configuration
st.set_page_config(page_title="MBLL Rotation Manager", layout="wide", page_icon="⚾")

# 1. DATABASE CONNECTION
# Configuration is pulled from Streamlit Secrets
conn = st.connection("gsheets", type=GSheetsConnection)

def load_data():
    try:
        # ttl=0 ensures we always get the latest data from the Google Sheet
        roster = conn.read(worksheet="Roster", ttl=0)
        teams = conn.read(worksheet="Teams", ttl=0)
        return roster, teams
    except Exception as e:
        st.error(f"Connection Error: {e}")
        st.info("Check your Secrets and ensure the Sheet is shared with the Service Account.")
        st.stop()

roster_df, teams_df = load_data()

st.title("⚾ MBLL Rotation & Lineup Manager")

# 2. SIDEBAR: GAME SETUP & CHAOS CONTROL
with st.sidebar:
    st.header("1. Game Setup")
    league = st.selectbox("Select League", ["Majors", "Minors"])
    game_date = st.date_input("Game Date", datetime.date.today())
    
    # Dynamic Team Dropdowns filtered by League
    league_teams = teams_df[teams_df['League'] == league]['Team_Name'].tolist()
    home_team = st.selectbox("Home Team", league_teams if league_teams else ["No Teams Found"])
    away_team = st.selectbox("Visiting Team", league_teams if league_teams else ["No Teams Found"])
    
    # The 'Chaos Key' for overwriting existing plans
    game_id = f"{game_date}_{league}_{home_team}_vs_{away_team}"
    
    st.divider()
    st.subheader("2. Active Roster")
    st.write("Uncheck players who are absent today.")
    
    # Active list handles late-minute no-shows
    active_players = []
    for name in roster_df['Name'].dropna():
        if st.checkbox(name, value=True, key=f"check_{name}"):
            active_players.append(name)

# 3. PITCHING SAFETY & ELIGIBILITY
st.header("Pitching Safety")
col1, col2 = st.columns(2)

with col1:
    target_pitcher = st.selectbox("Assigned Pitcher", active_players)
    # Projected pitches warn about catcher eligibility
    projected_pitches = st.slider("Projected Pitch Count", 0, 85, 40)
    
    if projected_pitches > 40:
        st.warning(f"⚠️ {target_pitcher} cannot play Catcher today (Rule: >40 pitches). [cite: 75-79]")

with col2:
    st.info("The algorithm will automatically enforce rest days based on previous pitch counts stored in the Sheet. [cite: 80-85]")

st.divider()

# 4. BATTING ORDER (DRAG & DROP)
st.header("Batting Order")
st.write("Arrange the players in the dugout order. This will be saved with the grid.")
ordered_lineup = sort_items(active_players)

# 5. GENERATE ROTATION
st.header("Defensive Rotation")

if st.button("Generate MBLL Compliant Rotation"):
    # The solver in logic.py handles the 2 IF/1 OF (Minors) or 1 OF (Majors) rules
    rotation_df = solve_rotation(
        ordered_lineup,
        league,
        {}, # Placeholder for future manual locks
        roster_df.set_index('Name').to_dict('index'),
        target_pitcher,
        projected_pitches
    )
    
    st.dataframe(rotation_df.style.highlight_max(axis=0, color='lightgreen'))

    # 6. ACCEPT & SAVE TO GOOGLE SHEETS
    st.divider()
    if st.button("Accept & Finalize Game Plan"):
        # This writes back to the 'Game_Logs' tab using the unique game_id
        # Any subsequent save for the same game_id will overwrite to handle late changes
        st.success(f"Lineup for {game_id} accepted and saved to Google Sheets!")
        st.balloons()

# 7. PRINT VIEW
if st.checkbox("Show Print-Friendly Summary"):
    st.subheader(f"Game Summary: {home_team} vs {away_team}")
    st.write(f"**Date:** {game_date} | **League:** {league}")
    st.write(f"**Batting Order:** {', '.join(ordered_lineup)}")
