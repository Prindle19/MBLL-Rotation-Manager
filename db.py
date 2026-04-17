import streamlit as st
from firebase_admin import credentials, firestore, initialize_app, get_app
import os

@st.cache_resource
def get_db():
    try:
        app = get_app()
    except ValueError:
        # If running in Cloud Run, we can use default credentials or service account
        # If running locally, we need secrets
        firebase_creds = st.secrets.get("firebase", None)
        
        if firebase_creds:
            # We convert it to a dict because st.secrets is essentially a dict
            cred = credentials.Certificate(dict(firebase_creds))
            app = initialize_app(cred)
        else:
            # Fallback for Cloud Run application default credentials
            app = initialize_app()
            
    return firestore.client()

def get_teams_for_coach(coach_email):
    db = get_db()
    teams_ref = db.collection("teams").where("coach_email", "==", coach_email)
    docs = teams_ref.stream()
    
    teams = []
    for doc in docs:
        team_data = doc.to_dict()
        team_data["id"] = doc.id
        teams.append(team_data)
    return teams

def get_roster_for_team(team_id):
    db = get_db()
    # Assuming roster is a subcollection of a team, or we store an array of players
    # Let's assume a subcollection "roster" for each team
    roster_ref = db.collection("teams").document(team_id).collection("roster")
    docs = roster_ref.stream()
    
    roster = []
    for doc in docs:
        player = doc.to_dict()
        player["id"] = doc.id
        roster.append(player)
    return roster

def save_game_plan(coach_email, game_id, game_data):
    db = get_db()
    # Save the game plan under the coach's specific 'games' collection
    doc_ref = db.collection("coaches").document(coach_email).collection("games").document(game_id)
    doc_ref.set(game_data)
