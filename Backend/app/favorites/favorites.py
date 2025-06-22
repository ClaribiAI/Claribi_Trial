from flask import Blueprint, request, jsonify, g
from app.services.favorites_service import FavoritesService
from app.core.security import login_required
# from app.utils.validation import validate_request

favorites_bp = Blueprint('favorites', __name__)

@favorites_bp.route('/api/favorite-groups', methods=['GET'])
@login_required
def get_favorite_groups():
    """Get all favorite groups for the current user."""
    try:
        groups = FavoritesService.get_user_groups(g.user['id'])
        return jsonify({'success': True, 'data': groups})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@favorites_bp.route('/api/favorite-groups', methods=['POST'])
@login_required
#@validate_request(['name'])
def create_favorite_group():
    """Create a new favorite group."""
    try:
        group = FavoritesService.create_group(
            user_id=g.user['id'],
            name=request.json['name']
        )
        return jsonify({'success': True, 'data': group})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@favorites_bp.route('/api/favorite-groups/<int:group_id>', methods=['PUT'])
@login_required
#@validate_request(['name'])
def update_favorite_group(group_id):
    """Update a favorite group."""
    try:
        group = FavoritesService.update_group(
            group_id=group_id,
            user_id=g.user['id'],
            name=request.json['name']
        )
        return jsonify({'success': True, 'data': group})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@favorites_bp.route('/api/favorite-groups/<int:group_id>', methods=['DELETE'])
@login_required
def delete_favorite_group(group_id):
    """Delete a favorite group."""
    try:
        FavoritesService.delete_group(group_id=group_id, user_id=g.user['id'])
        return jsonify({'success': True})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@favorites_bp.route('/api/favorite-groups/<int:group_id>/urls', methods=['GET'])
@login_required
def get_group_urls(group_id):
    """Get all URLs in a favorite group."""
    try:
        urls = FavoritesService.get_group_urls(group_id=group_id, user_id=g.user['id'])
        return jsonify({'success': True, 'data': urls})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@favorites_bp.route('/api/favorite-groups/<int:group_id>/urls', methods=['POST'])
@login_required
#@validate_request(['url', 'title'])
def add_url_to_group(group_id):
    """Add a URL to a favorite group."""
    try:
        url = FavoritesService.add_url_to_group(
            group_id=group_id,
            user_id=g.user['id'],
            url=request.json['url'],
            title=request.json['title'],
            filters=request.json.get('filters')
        )
        return jsonify({'success': True, 'data': url})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@favorites_bp.route('/api/favorite-groups/<int:group_id>/urls/<int:url_id>', methods=['DELETE'])
@login_required
def delete_url_from_group(group_id, url_id):
    """Delete a URL from a favorite group."""
    try:
        FavoritesService.delete_url(url_id=url_id, user_id=g.user['id'])
        return jsonify({'success': True})
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500 