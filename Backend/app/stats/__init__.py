from flask import Blueprint

# Create the stats blueprint with proper URL prefix
stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')

# Import route modules to register them with the blueprint
from app.stats import routes

