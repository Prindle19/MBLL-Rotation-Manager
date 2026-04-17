from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore
from .firebase_auth import verify_token
from .logic import solve_rotation
import os

app = FastAPI()

try:
    db = firestore.client()
except Exception as e:
    db = None
    print(f"Firestore not initialized: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(token: dict = Depends(verify_token)):
    email = token.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email found in token")
    
    user_ref = db.collection("users").document(email)
    user_doc = user_ref.get()
    
    if not user_doc.exists:
        users = list(db.collection("users").limit(1).stream())
        role = "admin" if not users else "pending"
            
        new_user = {
            "email": email,
            "role": role,
            "name": token.get("name", ""),
        }
        user_ref.set(new_user)
        return new_user
    
    return user_doc.to_dict()

def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def require_coach_or_admin(user: dict = Depends(get_current_user)):
    role = user.get("role")
    if role not in ["admin", "coach"]:
        raise HTTPException(status_code=403, detail="Coach access required")
    return user

@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    assigned_team = None
    if user.get("role") in ["coach", "admin"]:
        teams_ref = db.collection("teams").where("coachEmail", "==", user["email"]).stream()
        for t in teams_ref:
            assigned_team = {**t.to_dict(), "id": t.id}
            break
            
    return {"user": user, "team": assigned_team}

@app.get("/api/users")
def get_users(admin: dict = Depends(require_admin)):
    users = [doc.to_dict() for doc in db.collection("users").stream()]
    return {"users": users}

@app.post("/api/users/{email}/role")
def update_user_role(email: str, role_data: dict = Body(...), admin: dict = Depends(require_admin)):
    role = role_data.get("role")
    if role not in ["admin", "coach", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    db.collection("users").document(email).update({"role": role})
    return {"success": True}

@app.get("/api/teams")
def get_teams(user: dict = Depends(get_current_user)):
    teams = [{**doc.to_dict(), "id": doc.id} for doc in db.collection("teams").stream()]
    return {"teams": teams}

@app.post("/api/teams")
def create_team(team_data: dict = Body(...), admin: dict = Depends(require_admin)):
    doc_ref = db.collection("teams").document()
    team_data["id"] = doc_ref.id
    doc_ref.set(team_data)
    return team_data

@app.delete("/api/teams/{team_id}")
def delete_team(team_id: str, admin: dict = Depends(require_admin)):
    db.collection("teams").document(team_id).delete()
    return {"success": True}

@app.get("/api/roster/{team_id}")
def get_roster(team_id: str, user: dict = Depends(require_coach_or_admin)):
    players = [{**doc.to_dict(), "id": doc.id} for doc in db.collection("teams").document(team_id).collection("roster").stream()]
    return {"roster": players}

@app.post("/api/roster/{team_id}")
def save_roster(team_id: str, roster_data: dict = Body(...), user: dict = Depends(require_coach_or_admin)):
    if user.get("role") != "admin":
        team_doc = db.collection("teams").document(team_id).get()
        if not team_doc.exists or team_doc.to_dict().get("coachEmail") != user["email"]:
            raise HTTPException(status_code=403, detail="Not your team")

    players = roster_data.get("players", [])
    batch = db.batch()
    roster_ref = db.collection("teams").document(team_id).collection("roster")
    
    for player in players:
        pid = player.get("id")
        if not pid:
            pid = roster_ref.document().id
            player["id"] = pid
        batch.set(roster_ref.document(pid), player)
        
    batch.commit()
    return {"success": True, "roster": players}

@app.post("/api/generate_rotation")
def generate_rotation(data: dict = Body(...), user: dict = Depends(require_coach_or_admin)):
    try:
        ordered_lineup = data.get("ordered_lineup", [])
        league = data.get("league", "Majors")
        target_pitcher = data.get("target_pitcher", None)
        projected_pitches = data.get("projected_pitches", 0)
        skills = data.get("skills", {}) 
        
        rotation_df = solve_rotation(
            active_players=ordered_lineup,
            league=league,
            locks={},
            skills=skills,
            pitcher_name=target_pitcher,
            projected_pitches=projected_pitches
        )
        
        rotation_dict = rotation_df.reset_index().to_dict(orient="records")
        return {"rotation": rotation_dict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if os.path.isdir("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
