from flask import Blueprint

# Create the blueprint
powerbi_docs_bp = Blueprint('powerbi_docs', __name__)

# Import routes
from . import powerbi_docs_routes

# The PowerBIPbixService is imported directly in routes
# No need to import it here as it's not exposed as a public API