"""Analytics Package

This package provides functionality for tracking and analyzing usage statistics.
"""

from flask import Blueprint
from app.analytics.analytics_routes import get_query_analytics

analytics_bp = Blueprint('analytics', __name__)

analytics_bp.add_url_rule('/analytics/queries', 'get_query_analytics', get_query_analytics, methods=['GET'])



from app.analytics import analytics_routes

__all__ = ['analytics_bp'] 