from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore
from .firebase_auth import verify_token
from .logic import solve_rotation
from pydantic import BaseModel
from google.cloud.firestore_v1.base_query import FieldFilter
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
    assigned_teams = []
    if user.get("role") in ["coach", "admin"]:
        teams_ref = db.collection("teams").where(filter=FieldFilter("coachEmails", "array_contains", user["email"])).stream()
        for t in teams_ref:
            assigned_teams.append({**t.to_dict(), "id": t.id})
            
    return {"user": user, "teams": assigned_teams}

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

@app.put("/api/teams/{team_id}")
def update_team(team_id: str, team_data: dict = Body(...), admin: dict = Depends(require_admin)):
    # Remove id from the update payload if it exists
    update_payload = {k: v for k, v in team_data.items() if k != "id"}
    db.collection("teams").document(team_id).update(update_payload)
    team_data["id"] = team_id
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
        if not team_doc.exists or user["email"] not in team_doc.to_dict().get("coachEmails", []):
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

class RotationRequest(BaseModel):
    ordered_lineup: list[str]
    league: str
    locks: dict = {}
    skills: dict = {}
    roster_map: dict = {}
    target_pitcher: str = None
    projected_pitches: int = 0
    active_count: int = 10
    ineligible_pitchers: list[str] = []

@app.post("/api/generate_rotation")
def generate_rotation_api(req: RotationRequest, user: dict = Depends(require_coach_or_admin)):
    try:
        grid_df = solve_rotation(
            req.ordered_lineup, 
            req.league, 
            req.locks,
            req.skills,
            req.target_pitcher, 
            req.projected_pitches,
            req.active_count,
            req.ineligible_pitchers
        )
        
        # Convert df to list of dicts for frontend
        result = []
        for player_id, row in grid_df.iterrows():
            result.append({
                "id": player_id,
                "1": row[1], "2": row[2], "3": row[3],
                "4": row[4], "5": row[5], "6": row[6]
            })
            
        return {"rotation": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/games/{team_id}")
def get_games(team_id: str, user: dict = Depends(require_coach_or_admin)):
    try:
        games = [{**doc.to_dict(), "id": doc.id} for doc in db.collection("games").where(filter=FieldFilter("team_id", "==", team_id)).stream()]
        return {"games": games}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/games")
def save_game(game_data: dict = Body(...), user: dict = Depends(require_coach_or_admin)):
    team_id = game_data.get("team_id")
    date = game_data.get("date")
    if not team_id or not date:
        raise HTTPException(status_code=400, detail="team_id and date required")
        
    doc_id = f"{team_id}_{date}"
    db.collection("games").document(doc_id).set(game_data)
    return {"success": True, "id": doc_id}

if os.path.isdir("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
