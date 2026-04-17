from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth, initialize_app, get_app
import os

security = HTTPBearer()

try:
    get_app()
except ValueError:
    initialize_app(options={"projectId": os.environ.get("GOOGLE_CLOUD_PROJECT", "mbll-rotation-manager")})  # Uses Application Default Credentials in Cloud Run

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )
