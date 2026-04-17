from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .firebase_auth import verify_token
from .logic import solve_rotation
import os

app = FastAPI()

# Allow CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict to actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/generate_rotation")
def generate_rotation(
    data: dict = Body(...),
    user: dict = Depends(verify_token)
):
    try:
        ordered_lineup = data.get("ordered_lineup", [])
        league = data.get("league", "Majors")
        target_pitcher = data.get("target_pitcher", None)
        projected_pitches = data.get("projected_pitches", 0)
        skills = data.get("skills", {}) # Expect dict of {PlayerName: {position info}}
        
        # solve_rotation(active_players, league, locks, skills, pitcher_name, projected_pitches)
        rotation_df = solve_rotation(
            active_players=ordered_lineup,
            league=league,
            locks={},
            skills=skills,
            pitcher_name=target_pitcher,
            projected_pitches=projected_pitches
        )
        
        # Convert DataFrame to JSON serializable list of dicts
        # DataFrame has players as index and innings as columns
        rotation_dict = rotation_df.reset_index().to_dict(orient="records")
        return {"rotation": rotation_dict}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# In production, serve the built Vite frontend
if os.path.isdir("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
