"""Project Sharing Routes Module

This module contains routes for project sharing functionality, including share links
and direct user sharing.
"""

from flask import Blueprint, request, g, jsonify, current_app, url_for
from typing import Dict, Any, Tuple, Optional
from datetime import datetime

from app.core.security import login_required, csrf_protected, rate_limit
from app.core.validation import validate_request
from app.projects.validators.sharing_validator import ShareLinkSchema, AccessTypeEnum
from app.projects.services.project_sharing_service import ProjectSharingService
from app.core.exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ShareLinkError,
    ShareLinkExpiredError,
    ShareLinkInvalidError,
    ShareLinkMaxUsesError,
    ShareLinkDeactivatedError
)
from app.core.logging import get_logger

logger = get_logger(__name__)

# Initialize blueprint
sharing_bp = Blueprint('project_sharing', __name__)

# Rate limit for sharing operations
SHARE_LIMIT = 50  # requests per hour

@sharing_bp.route('/projects/<int:project_id>/share', methods=['GET', 'POST'])
@login_required
@csrf_protected
@rate_limit(limit=SHARE_LIMIT)
def share_project(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Generate or view share links for a project.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: Share URL and metadata for POST, or sharing info for GET
    """
    if request.method == 'POST':
        # Handle share link generation
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Content-Type must be application/json'
            }), 415
            
        data = request.get_json()
        
        # Get parameters with defaults
        access_type = data.get('access_type', AccessTypeEnum.reader)
        expiry_hours = data.get('expiry_hours')
        
        # Validate access type
        if access_type not in [AccessTypeEnum.reader, AccessTypeEnum.co_owner]:
            return jsonify({
                'success': False,
                'error': f'Invalid access type: {access_type}'
            }), 400
            
        # Convert expiry to int if needed
        if expiry_hours is not None:
            try:
                expiry_hours = int(expiry_hours)
                if expiry_hours <= 0:
                    return jsonify({
                        'success': False,
                        'error': 'Expiry hours must be positive'
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'error': 'Invalid expiry value'
                }), 400
        
        # Generate share link
        share_url, error = ProjectSharingService.generate_share_link(
            project_id=project_id,
            user_id=g.user['ms_object_id'],
            expiry_hours=expiry_hours,
            access_type=access_type
        )
        
        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400
            
        # Ensure HTTPS for share URL
        if share_url and share_url.startswith('http://'):
            share_url = 'https://' + share_url[7:]
            
        return jsonify({
            'success': True,
            'share_url': share_url
        })
    
    # GET request - return sharing info
    shares, error = ProjectSharingService.get_project_shares(
        project_id=project_id,
        user_id=g.user['ms_object_id']
    )
    
    if error:
        return jsonify({
            'success': False,
            'error': error
        }), 400
        
    # Format response to match original structure
    share_urls = {
        'co_owner': [],
        'reader': []
    }
    
    if shares and 'share_links' in shares:
        for link in shares['share_links']:
            if link['access_type'] in ['co_owner', 'reader']:
                # Generate the full URL with scheme
                scheme = 'http' if request.host.startswith('127.0.0.1') or request.host.startswith('localhost') else 'https'
                url = url_for('projects.project_sharing.access_shared_project', token=link['encrypted_token'], _external=True, _scheme=scheme)
                
                # Make sure the URL is using HTTPS
                if url.startswith('http://'):
                    url = 'https://' + url[7:]
                
                url_data = {
                    'id': link['id'],
                    'url': url,
                    'created_at': link['created_at'],
                    'expires_at': link['expires_at'],
                    'access_count': link['access_count'],
                    'is_active': link.get('is_active', False),
                    'is_expired': link.get('is_expired', False),
                    'can_be_used': link.get('can_be_used', False)
                }
                share_urls[link['access_type']].append(url_data)
    
    return jsonify({
        'success': True,
        'sharing_info': shares,
        'share_urls': share_urls
    })

@sharing_bp.route('/projects/<int:project_id>/share/extend', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=SHARE_LIMIT)
def extend_project_share(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Extend a share link's expiration.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: Success message
    """
    # Get extension hours and link ID from request
    extension_hours = 24
    access_type = None
    share_link_id = None
    
    if request.is_json:
        data = request.get_json()
        extension_hours = data.get('extension_hours', 24)
        access_type = data.get('access_type')
        share_link_id = data.get('share_link_id')
    else:
        extension_hours = request.form.get('extension_hours', type=int, default=24)
        access_type = request.form.get('access_type')
        share_link_id = request.form.get('share_link_id')
    
    if extension_hours <= 0:
        extension_hours = 24
    
    success, error = ProjectSharingService.extend_share_link(
        project_id=project_id,
        user_id=g.user['ms_object_id'],
        extension_hours=extension_hours,
        share_link_id=share_link_id,
        access_type=access_type
    )
    
    if error:
        return jsonify({'success': False, 'error': error}), 400
        
    return jsonify({
        'success': True,
        'message': f"Share link expiration extended by {extension_hours} hours"
    })

@sharing_bp.route('/projects/<int:project_id>/share/revoke', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=SHARE_LIMIT)
def revoke_project_share(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Revoke a share link.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: Success message
    """
    # Get revocation parameters
    revoke_access = False
    access_type = None
    share_link_id = None
    
    if request.is_json:
        data = request.get_json()
        revoke_access = data.get('revoke_access', False)
        access_type = data.get('access_type')
        share_link_id = data.get('share_link_id')
    else:
        revoke_access = request.form.get('revoke_access', 'false').lower() == 'true'
        access_type = request.form.get('access_type')
        share_link_id = request.form.get('share_link_id')
    
    success, error = ProjectSharingService.revoke_share_link(
            project_id=project_id,
        user_id=g.user['ms_object_id'],
        revoke_access=revoke_access,
        access_type=access_type,
        share_link_id=share_link_id
    )
    
    if error:
        return jsonify({'success': False, 'error': error}), 400
        
    access_type_desc = ''
    if access_type:
        access_type_desc = 'co-owner ' if access_type == AccessTypeEnum.co_owner else 'reader '
    
    return jsonify({
        'success': True,
        'message': f"{access_type_desc}Share link revoked successfully" + 
                  (f" and {access_type_desc}access removed" if revoke_access else "")
    })

@sharing_bp.route('/shared-project/<token>')
@rate_limit(limit=SHARE_LIMIT)
def access_shared_project(token: str) -> Tuple[Dict[str, Any], int]:
    """Access a project via share link.
    
    Args:
        token: Share link token
        
    Returns:
        tuple: Project data or redirect
    """
    current_user = g.user if hasattr(g, 'user') else None
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://localhost:5173')
    
    # Check if client wants HTML or JSON
    wants_html = 'text/html' in request.headers.get('Accept', '')
    
    project_data, status = ProjectSharingService.process_shared_link(
        token=token,
        current_user=current_user
    )
    
    # Handle authentication requirement
    if status == 'authentication_required':
        if wants_html:
            return jsonify({
                'success': False,
                'redirect': f"{frontend_url}/#/login?share_token={token}"
            }), 401
        else:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'redirect': url_for('auth.login'),
                'token': token
            }), 401
    
    # Handle errors
    if not project_data:
        error_messages = {
            'invalid_link': 'Invalid or expired share link',
            'link_inactive': 'This share link has been deactivated',
            'link_expired': 'This share link has expired',
            'max_uses_reached': 'This share link has reached its maximum uses',
            'rate_limited': 'Too many access attempts. Please try again later.',
            'error': 'An error occurred processing the share link'
        }
        error_msg = error_messages.get(status, 'Invalid share link')
        
        if wants_html:
            return jsonify({
                'success': False,
                'redirect': f"{frontend_url}/#/login?error={error_msg}"
            }), 400
        else:
            return jsonify({'success': False, 'error': error_msg}), 400
    
    # Handle successful access
    if status in ['access_granted', 'already_has_access']:
        if wants_html:
            return jsonify({
                'success': True,
                'redirect': f"{frontend_url}/#/projects/{project_data['id']}"
            })
        else:
            return jsonify({
                'success': True,
                'message': 'You now have access to this project',
                'project': project_data,
                'redirect': url_for('project_sharing.view_project', project_id=project_data['id'], _external=True)
            })
    
    # Fallback for unexpected status
    if wants_html:
        return jsonify({
            'success': False,
            'redirect': f"{frontend_url}/#/login?error=Unexpected+status:+{status}"
        }), 400
    else:
        return jsonify({
            'success': False,
            'error': f"Unexpected status: {status}"
        }), 400

@sharing_bp.route('/projects/<int:project_id>/share/analytics')
@login_required
@csrf_protected
@rate_limit(limit=SHARE_LIMIT)
def project_share_analytics(project_id: int) -> Tuple[Dict[str, Any], int]:
    """Get analytics for project sharing.
    
    Args:
        project_id: Project ID
        
    Returns:
        tuple: Analytics data
    """
    analytics, error = ProjectSharingService.get_share_link_analytics(
            project_id=project_id,
        user_id=g.user['ms_object_id']
    )
    
    if error:
        return jsonify({'success': False, 'error': error}), 400
        
    return jsonify({
        'success': True,
        'sharing_info': analytics
    })

@sharing_bp.route('/admin/cleanup-expired-links', methods=['POST'])
@login_required
@csrf_protected
@rate_limit(limit=SHARE_LIMIT)
def admin_cleanup_expired_links() -> Tuple[Dict[str, Any], int]:
    """Admin route to cleanup expired links.
    
    Returns:
        tuple: Cleanup results
    """
    # Check if user is admin
    if not g.user.get('is_admin', False):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    links_cleaned = ProjectSharingService.cleanup_expired_links()
    
    return jsonify({
        'success': True,
        'links_cleaned': links_cleaned,
        'message': f"Cleaned up {links_cleaned} expired share links"
    }) 