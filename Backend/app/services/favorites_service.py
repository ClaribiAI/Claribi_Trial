"""Favorites Services Module

This module contains business logic related to favorites management functionality.
"""

from sqlalchemy.exc import IntegrityError
from app.models.favorite_group import FavoriteGroup
from app.models.favorite_url import FavoriteUrl
from app.core.database import get_db_cursor
import psycopg2.extras
from datetime import datetime, timezone
from typing import List, Dict, Optional
import json
import logging

logger = logging.getLogger(__name__)

def serialize_datetime(dt):
    """Helper function to serialize datetime objects."""
    return dt.isoformat() if dt else None

def serialize_row(row):
    """Helper function to serialize a database row."""
    if not row:
        return None
    result = dict(row)
    # Convert datetime objects to ISO format strings
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = serialize_datetime(value)
        elif key == 'filters' and value:
            try:
                result[key] = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                result[key] = None
    return result

class FavoritesService:
    @staticmethod
    def get_user_groups(user_id: int) -> List[Dict]:
        """Get all favorite groups for a user."""
        try:
            with get_db_cursor() as cursor:
                cursor.execute(
                    'SELECT * FROM favorite_groups WHERE user_id = %s ORDER BY created_at DESC',
                    (user_id,)
                )
                groups = cursor.fetchall()
                return [serialize_row(dict(group)) for group in groups]
        except Exception as e:
            logger.error(f"Error getting user groups: {e}")
            return []

    @staticmethod
    def create_group(user_id: int, name: str) -> Dict:
        """Create a new favorite group."""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    'INSERT INTO favorite_groups (user_id, name, created_at, updated_at) VALUES (%s, %s, %s, %s) RETURNING *',
                    (user_id, name, datetime.now(timezone.utc), datetime.now(timezone.utc))
                )
                return serialize_row(dict(cursor.fetchone()))
        except psycopg2.IntegrityError:
            logger.error("A group with this name already exists")
            raise ValueError("A group with this name already exists")
        except Exception as e:
            logger.error(f"Error creating group: {e}")
            raise

    @staticmethod
    def update_group(group_id: int, user_id: int, name: str) -> Dict:
        """Update a favorite group."""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    'UPDATE favorite_groups SET name = %s, updated_at = %s WHERE id = %s AND user_id = %s RETURNING *',
                    (name, datetime.now(timezone.utc), group_id, user_id)
                )
                result = cursor.fetchone()
                if not result:
                    raise ValueError("Group not found")
                return serialize_row(dict(result))
        except psycopg2.IntegrityError:
            logger.error("A group with this name already exists")
            raise ValueError("A group with this name already exists")
        except Exception as e:
            logger.error(f"Error updating group: {e}")
            raise

    @staticmethod
    def delete_group(group_id: int, user_id: int) -> bool:
        """Delete a favorite group."""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute(
                    'DELETE FROM favorite_groups WHERE id = %s AND user_id = %s RETURNING id',
                    (group_id, user_id)
                )
                result = cursor.fetchone()
                if not result:
                    raise ValueError("Group not found")
                return True
        except Exception as e:
            logger.error(f"Error deleting group: {e}")
            raise

    @staticmethod
    def get_group_urls(group_id: int, user_id: int) -> List[Dict]:
        """Get all URLs in a favorite group."""
        try:
            with get_db_cursor() as cursor:
                cursor.execute('''
                    SELECT fu.* 
                    FROM favorite_urls fu
                    JOIN favorite_groups fg ON fu.group_id = fg.id
                    WHERE fg.id = %s AND fg.user_id = %s
                    ORDER BY fu.created_at DESC
                ''', (group_id, user_id))
                urls = cursor.fetchall()
                return [serialize_row(dict(url)) for url in urls]
        except Exception as e:
            logger.error(f"Error getting group URLs: {e}")
            return []

    @staticmethod
    def add_url_to_group(group_id: int, user_id: int, url: str, title: str, filters: Optional[Dict] = None) -> Dict:
        """Add a URL to a favorite group."""
        try:
            with get_db_cursor(commit=True) as cursor:
                # First verify the group exists and belongs to the user
                cursor.execute(
                    'SELECT id FROM favorite_groups WHERE id = %s AND user_id = %s',
                    (group_id, user_id)
                )
                if not cursor.fetchone():
                    raise ValueError("Group not found")

                # Check if URL already exists in this group
                cursor.execute(
                    'SELECT id FROM favorite_urls WHERE group_id = %s AND url = %s',
                    (group_id, url)
                )
                if cursor.fetchone():
                    raise ValueError("This URL is already saved in this group")

                # Convert filters to JSON string if it's not None
                filters_json = json.dumps(filters) if filters is not None else None

                # Add the URL
                cursor.execute('''
                    INSERT INTO favorite_urls (group_id, url, title, filters, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING *
                ''', (group_id, url, title, filters_json, datetime.now(timezone.utc), datetime.now(timezone.utc)))
                return serialize_row(dict(cursor.fetchone()))
        except Exception as e:
            logger.error(f"Error adding URL to group: {e}")
            raise

    @staticmethod
    def delete_url(url_id: int, user_id: int) -> bool:
        """Delete a URL from favorites."""
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute('''
                    DELETE FROM favorite_urls fu
                    USING favorite_groups fg
                    WHERE fu.id = %s
                    AND fu.group_id = fg.id
                    AND fg.user_id = %s
                    RETURNING fu.id
                ''', (url_id, user_id))
                result = cursor.fetchone()
                if not result:
                    raise ValueError("URL not found")
                return True
        except Exception as e:
            logger.error(f"Error deleting URL: {e}")
            raise