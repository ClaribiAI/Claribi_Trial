from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

# Import all route modules
from app.auth import auth_microsoft_routes
from app.auth import auth_token_routes
from app.auth import auth_session_routes

