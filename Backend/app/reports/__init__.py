# Reports module initialization

from flask import Blueprint
from app.reports.reports_routes import reports_bp

# Export the blueprint and all functions
__all__ = [
    'reports_bp',
    'get_reports_for_project',
    'create_report_endpoint',
    'select_report',
    'delete_report_endpoint',
    'edit_report_endpoint',
    'clear_report_session',
    'get_report_config',
    'save_report_fields',
    'save_report_synonyms',
    'save_report_url',
    'delete_table_endpoint',
    'update_report_status',
    'api_manage_value_rules',
    'api_generate_value_rules'
]