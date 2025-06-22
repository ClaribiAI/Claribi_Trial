# Report Pages Module

from flask import Blueprint

# Create blueprint
report_pages_bp = Blueprint('report_pages', __name__)

from app.report_pages.report_pages_routes import *

# # Register routes with the blueprint
report_pages_bp.add_url_rule('/project/<int:project_id>/report/<int:report_id>/pages', 'get_report_pages', get_report_pages, methods=['GET'])
report_pages_bp.add_url_rule('/project/<int:project_id>/report/<int:report_id>/page', 'create_report_page_endpoint', create_report_page_endpoint, methods=['POST'])
report_pages_bp.add_url_rule('/project/<int:project_id>/report/<int:report_id>/page/<int:page_id>/delete', 'delete_report_page_endpoint', delete_report_page_endpoint, methods=['POST'])
report_pages_bp.add_url_rule('/project/<int:project_id>/report/<int:report_id>/page/<int:page_id>/edit', 'edit_report_page_endpoint', edit_report_page_endpoint, methods=['POST'])