from flask import Blueprint

# Create the auth2 blueprint with proper URL prefix
auth2_bp = Blueprint('auth2', __name__, url_prefix='/api/auth')

# Import route modules to register them with the blueprint
from app.auth2 import routes
from app.auth2 import middleware 