# Projects module initialization

from flask import Blueprint

# Import routes
from app.projects.project_routes import project_bp as project_routes, get_projects, get_project
# Import old sharing routes (commented out but kept for reference)
# from app.projects.projects_routes import (
#     share_project,
#     revoke_project_share,
#     access_shared_project,
#     save_project_data
# )

# Import new sharing routes
from app.projects.sharing_routes import sharing_bp
from app.projects.services.project_service import ProjectService

# Create blueprint
projects_bp = Blueprint('projects', __name__)

# Register v2 routes
projects_bp.register_blueprint(project_routes)

# Register new sharing routes
projects_bp.register_blueprint(sharing_bp)

# Register sharing routes from original implementation (commented out but kept for reference)
# projects_bp.add_url_rule('/projects/<int:project_id>/share', 'share_project', share_project, methods=['GET', 'POST'])
# projects_bp.add_url_rule('/projects/<int:project_id>/share/revoke', 'revoke_project_share', revoke_project_share, methods=['POST'])
# projects_bp.add_url_rule('/shared-project/<token>', 'access_shared_project', access_shared_project, methods=['GET'])

# Register project routes
projects_bp.add_url_rule('/project/<int:project_id>', 'get_project', get_project, methods=['GET'])

# Export functions needed by other modules
__all__ = [
    'projects_bp',
    'get_projects',
    'get_project',
    'ProjectService'  # Export the service class instead of individual function
]