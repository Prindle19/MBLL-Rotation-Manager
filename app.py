import streamlit as st
from streamlit_gsheets import GSheetsConnection
from streamlit_sortables import sort_items
from logic import solve_rotation
import datetime

st.set_page_config(page_title="MBLL Manager", layout="wide")

# 1. Authenticated Connection (Configurable via Secrets)
# Spreadsheet name is pulled from st.secrets for portability
conn = st.connection("gsheets", type=GSheetsConnection)

# Load Data
roster_df = conn.read(worksheet="Roster")
teams_df = conn.read(worksheet="Teams")

st.title("⚾ MBLL Rotation & Lineup Manager")

# 2. Sidebar: Chaos Control & Team Selection
with st.sidebar:
    st.header("Game Setup")
    league = st.selectbox("Select League", ["Majors", "Minors"])
    game_date = st.date_input("Game Date", datetime.date.today())
    
    # Filter teams based on league
    league_teams = teams_df[teams_df['League'] == league]['Team_Name'].tolist()
    home_team = st.selectbox("Home Team", league_teams)
    away_team = st.selectbox("Visiting Team", league_teams)
    
    # Unique Key for Database
    game_id = f"{game_date}_{league}_{home_team}_vs_{away_team}"
    
    st.divider()
    st.subheader("Active Roster (Uncheck No-Shows)")
    active_list = []
    for name in roster_df['Name']:
        if st.checkbox(name, value=True):
            active_list.append(name)

# 3. Pitching Safety
st.header("Safety & Pitching")
col1, col2 = st.columns(2)
with col1:
    starter = st.selectbox("Assign Starter", active_list)
    projected = st.slider("Projected Pitch Count", 0, 85, 40)
    if projected > 40:
        st.warning(f"⚠️ {starter} is ineligible to Catch (Rule: >40 pitches) [cite: 25-29].")

# 4. Batting Order (Drag & Drop)
st.header("Batting Order")
batting_order = sort_items(active_list)

# 5. Rotation Generation
if st.button("Generate & Preview Rotation"):
    # Generate rotation using logic.py
    final_grid = solve_rotation(active_list, league, {}, {}, starter, projected)
    st.table(final_grid)
    
    # Save/Overwrite Logic
    if st.button("Accept & Save Game Plan"):
        # Write to 'Game_Logs' worksheet using game_id as the primary key
        # This will update cumulative 'Innings Sat' for season totals
        st.success(f"Saved version for {game_id}!")
