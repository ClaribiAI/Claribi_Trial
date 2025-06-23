"""Analytics Routes Module

This module contains routes for analytics functionality.
"""

from flask import Blueprint, jsonify, g
from typing import Dict, Any, Tuple
from datetime import datetime

from app.core.security import login_required, rate_limit, csrf_protected
from app.services.query_analytics_service import QueryAnalyticsService
from app.core.logging import get_logger

logger = get_logger(__name__)
analytics_bp = Blueprint('analytics', __name__)
# Rate limit configuration
ANALYTICS_LIMIT = 1000  # requests per hour

@analytics_bp.route('/queries', methods=['GET'])
@login_required
@csrf_protected
@rate_limit(limit=ANALYTICS_LIMIT)
def get_query_analytics() -> Tuple[Dict[str, Any], int]:
    """Get query analytics data.
    
    Returns:
        tuple: (Response data, HTTP status code)
    """
    try:
        analytics = QueryAnalyticsService.get_query_analytics()
        
        return jsonify({
            'success': True,
            'analytics': analytics
        })
        
    except Exception as e:
        logger.error(f"Error getting query analytics: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to get analytics'
        }), 500 