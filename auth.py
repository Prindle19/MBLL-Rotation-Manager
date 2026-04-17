import streamlit as st
import requests
from google_auth_oauthlib.flow import Flow
import os

def get_flow():
    # If using st.secrets, you can construct the config dict
    client_config = {
        "web": {
            "client_id": st.secrets.get("gcp", {}).get("client_id", os.environ.get("CLIENT_ID", "")),
            "project_id": st.secrets.get("gcp", {}).get("project_id", os.environ.get("PROJECT_ID", "")),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": st.secrets.get("gcp", {}).get("client_secret", os.environ.get("CLIENT_SECRET", ""))
        }
    }
    
    # Needs to match what is configured in GCP OAuth Client ID Authorized redirect URIs
    # For local testing, use http://localhost:8501/
    # For Cloud Run, use the actual URL
    redirect_uri = st.secrets.get("gcp", {}).get("redirect_uri", os.environ.get("REDIRECT_URI", "http://localhost:8501/"))
    
    scopes = ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"]
    
    # os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1" # ONLY for local testing without HTTPS
    
    flow = Flow.from_client_config(
        client_config,
        scopes=scopes,
        redirect_uri=redirect_uri
    )
    return flow

def login_button():
    try:
        flow = get_flow()
        auth_url, _ = flow.authorization_url(prompt='consent')
        st.markdown(f'<a href="{auth_url}" target="_self" style="display:inline-block;padding:8px 16px;background-color:#4285F4;color:white;text-decoration:none;border-radius:4px;font-weight:bold;">Sign in with Google</a>', unsafe_allow_html=True)
    except Exception as e:
        st.error(f"Error configuring OAuth: {e}")
        st.info("Make sure you have set up GCP secrets in .streamlit/secrets.toml")

def handle_oauth():
    if "code" in st.query_params:
        code = st.query_params["code"]
        
        try:
            flow = get_flow()
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            # Fetch user info
            user_info_response = requests.get(
                "https://www.googleapis.com/oauth2/v1/userinfo",
                headers={"Authorization": f"Bearer {credentials.token}"}
            )
            if user_info_response.status_code == 200:
                user_info = user_info_response.json()
                st.session_state["user_email"] = user_info.get("email")
                st.session_state["user_name"] = user_info.get("name")
                
                # Clear the query param so we don't try to re-auth
                st.query_params.clear()
                st.rerun()
            else:
                st.error("Failed to get user profile from Google.")
        except Exception as e:
            st.error(f"Authentication failed: {e}")

def check_auth():
    if "user_email" not in st.session_state:
        handle_oauth()
        
    if "user_email" not in st.session_state:
        st.title("⚾ MBLL Rotation Manager")
        st.write("Please log in to manage your teams.")
        login_button()
        st.stop()
