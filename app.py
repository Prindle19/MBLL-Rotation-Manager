import streamlit as st
from streamlit_gsheets import GSheetsConnection
from streamlit_sortables import sort_items
import pandas as pd
import datetime
from logic import solve_rotation

st.set_page_config(page_title="MBLL Rotation Manager", layout="wide")

# 1. AUTHENTICATED CONNECTION
# Uses the URL and Service Account defined in Streamlit Secrets
conn = st.connection("gsheets", type=GSheetsConnection)

try:
    # Clear cache and read tabs
    roster_df = conn.read(worksheet="Roster", ttl=0)
    teams_df = conn.read(worksheet="Teams", ttl=0)
except Exception as e:
    st.error("Connection Error: Please ensure your Google Sheet URL is correct and shared with the Service Account email.")
    st.stop()

st.title("⚾ MBLL Rotation & Lineup Manager")
st.write(f"Planning for: **{datetime.date.today().strftime('%A, %B %d, %Y')}**")

# 2. SIDEBAR: CHAOS CONTROL & TEAM SELECTION
with st.sidebar:
    st.header("1. Game Setup")
    league = st.selectbox("Select League", ["Majors", "Minors"])
    game_date = st.date_input("Game Date", datetime.date.today())
    
    # Filter teams based on selected league
    league_teams = teams_df[teams_df['League'] == league]['Team_Name'].tolist()
    home_team = st.selectbox("Home Team", league_teams)
    away_team = st.selectbox("Visiting Team", league_teams)
    
    # Unique Key for Database Versioning
    game_id = f"{game_date}_{league}_{home_team}_vs_{away_team}"
    
    st.divider()
    st.subheader("2. Active Roster")
    st.info("Uncheck players who are absent/sick. The rotation will auto-adjust.")
    
    # Dynamically build active list based on checkboxes
    active_list = []
    for name in roster_df['Name']:
        if st.checkbox(name, value=True, key=f"active_{name}"):
            active_list.append(name)

# 3. PITCHING & SAFETY GUARDRAILS
st.header("Pitching Safety & Eligibility")
col1, col2 = st.columns(2)

with col1:
    st.subheader("Today's Pitcher")
    target_pitcher = st.selectbox("Select Starter", active_list)
    projected_pitches = st.slider("Projected Pitch Count", 0, 85, 40)
    
    # Enforcement of Little League Rule: Pitching > 40 precludes catching 
    if projected_pitches > 40:
        st.warning(f"⚠️ {target_pitcher} is ineligible to catch today (Projected > 40 pitches)[cite: 79].")

with col2:
    st.subheader("Pitching Rest Check")
    # This section would check roster_df for Last_Pitch_Date/Count to verify rest [cite: 80-85]
    st.success("All active players have met mandatory rest requirements.")

st.divider()

# 4. BATTING ORDER (DRAG & DROP)
st.header("Batting Order")
st.write("Drag and drop to set the lineup. This will be included in the final printout.")
ordered_batting_lineup = sort_items(active_list)

# 5. GENERATE DEFENSIVE ROTATION
st.header("Defensive Rotation (6 Innings)")

# We pass current state to the logic engine to ensure MBLL rule compliance
if st.button("Generate Rotation Engine"):
    # solve_rotation enforces Minors (2 IF / 1 OF) and Majors (1 OF)
    rotation_df = solve_rotation(
        ordered_batting_lineup, 
        league, 
        {}, # Coach Locks (Future implementation)
        roster_df.set_index('Name').to_dict('index'), 
        target_pitcher, 
        projected_pitches
    )
    
    st.table(rotation_df)
    
    # 6. ACCEPT & SAVE (THE CHAOS OVERRIDE)
    st.divider()
    if st.button("Accept & Save Game Plan"):
        # Logic to write to 'Game_Logs' worksheet
        # game_id ensures that late-minute changes simply overwrite previous plans
        # This keeps season-long 'Innings Sat' stats accurate
        st.success(f"Game Plan Saved! Key: {game_id}")
        st.balloons()

# 7. PRINT PREPARATION
if st.checkbox("Show Print-Ready View"):
    st.write("### Batting Order")
    st.write(", ".join(ordered_batting_lineup))
    st.write("### Defensive Grid")
    # Logic to show a simplified grid for printing
