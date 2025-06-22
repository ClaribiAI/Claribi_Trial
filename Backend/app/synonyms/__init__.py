# Synonyms Module

from flask import Blueprint

# Create blueprint
synonyms_bp = Blueprint('synonyms', __name__)

# # Import routes to register them with the blueprint
# from app.synonyms.synonyms_routes import *

# # Register routes with the blueprint
# synonyms_bp.add_url_rule('/add_synonym', 'add_synonym', add_synonym, methods=['GET', 'POST'])
# synonyms_bp.add_url_rule('/delete_synonym', 'delete_synonym', delete_synonym, methods=['POST'])
# synonyms_bp.add_url_rule('/clear_all_synonyms', 'clear_all_synonyms', clear_all_synonyms, methods=['POST'])
# synonyms_bp.add_url_rule('/save_synonyms', 'save_synonyms', save_synonyms, methods=['POST'])