"""
Stats Routes Module

Routes for retrieving user statistics.
"""
import logging
from flask import jsonify, g
from app.stats import stats_bp
from app.stats.services import stats_service
from app.auth2.middleware import auth_required

logger = logging.getLogger(__name__)


@stats_bp.route('/user', methods=['GET'])
@auth_required
def get_user_stats():
    """
    Get statistics for the current authenticated user.
    
    Returns:
        JSON response with user statistics:
        - documents_generated: Sum of generation_count
        - chat_queries: Total queries count
        - time_saved: Calculated time saved in hours
    """
    try:
        # Get current user from request context (set by auth_required)
        current_user = g.current_user
        if not current_user:
            return jsonify({
                "success": False,
                "error": "unauthorized",
                "message": "User not authenticated"
            }), 401
        
        user_ms_object_id = current_user.get('ms_object_id')
        if not user_ms_object_id:
            return jsonify({
                "success": False,
                "error": "invalid_request",
                "message": "User ID not found in token"
            }), 400
        
        # Get user stats
        stats = stats_service.get_user_stats(user_ms_object_id)
        
        return jsonify({
            "success": True,
            "data": stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrieving user stats: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to retrieve statistics"
        }), 500


@stats_bp.route('/user/breakdown', methods=['GET'])
@auth_required
def get_user_stats_breakdown():
    """
    Get statistics breakdown by PBIX file for the current authenticated user.
    
    Returns:
        JSON response with breakdown:
        - documents_breakdown: List of dicts with collection_name and generation_count
        - chat_queries: Total queries (not broken down by file)
    """
    try:
        # Get current user from request context (set by auth_required)
        current_user = g.current_user
        if not current_user:
            return jsonify({
                "success": False,
                "error": "unauthorized",
                "message": "User not authenticated"
            }), 401
        
        user_ms_object_id = current_user.get('ms_object_id')
        if not user_ms_object_id:
            return jsonify({
                "success": False,
                "error": "invalid_request",
                "message": "User ID not found in token"
            }), 400
        
        # Get user stats breakdown
        breakdown = stats_service.get_user_stats_breakdown(user_ms_object_id)
        
        return jsonify({
            "success": True,
            "data": breakdown
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrieving user stats breakdown: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to retrieve statistics breakdown"
        }), 500


@stats_bp.route('/user/tokens', methods=['GET'])
@auth_required
def get_user_token_usage():
    """
    Get usage counts and limits for the current authenticated user.
    
    Returns:
        JSON response with usage statistics and limits:
        - documents_generated: Number of documents generated
        - chat_queries: Number of chat queries
        - documents_limit: Limit for documents (None if unlimited)
        - chat_limit: Limit for chat queries (None if unlimited)
        - plan_name: User's subscription plan name
    """
    try:
        # Get current user from request context (set by auth_required)
        current_user = g.current_user
        if not current_user:
            return jsonify({
                "success": False,
                "error": "unauthorized",
                "message": "User not authenticated"
            }), 401
        
        user_ms_object_id = current_user.get('ms_object_id')
        if not user_ms_object_id:
            return jsonify({
                "success": False,
                "error": "invalid_request",
                "message": "User ID not found in token"
            }), 400
        
        # Get user usage data with limits
        usage_data = stats_service.get_user_token_usage(user_ms_object_id)
        
        return jsonify({
            "success": True,
            "data": usage_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error retrieving user usage data: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "server_error",
            "message": "Failed to retrieve usage data"
        }), 500
