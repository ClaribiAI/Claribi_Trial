"""Neon Database Authentication Module

This module provides functionality for authenticated connections to Neon PostgreSQL
using JWT tokens from the user's session, similar to the approach shown in the
TypeScript examples (server_component.tsx and client_component.tsx).

It implements both server-side and client-side authentication patterns for Neon.

THIS IS NOT BEING USED FOR NOW AS NEON AUTH DOES NOT SUPPORT PYTHON YET!!!!
"""

import psycopg2
from flask import current_app, session, g
from app.config.settings import config  
from app.auth.token_storage import RedisTokenStorage


def get_auth_token():
    """Get the authentication token from the user session
    
    Returns:
        str: The authentication token or None if not available
    """
    # Check if user is logged in and has tokens in session
    if 'user' not in session:
        return None
        
    # Try to get token from session directly first
    if 'tokens' in session and 'access_token' in session['tokens']:
        return session['tokens']['access_token']
    
    # If not in session, try to get from token storage
    try:
        token_storage = RedisTokenStorage()
        user_id = session['user'].get('ms_object_id')
        if user_id:
            tokens = token_storage.get_tokens(user_id)
            if tokens and 'access_token' in tokens:
                #current_app.logger.info(f"Neon var: {tokens['access_token']}, {session['user'].get('organization_id') if 'user' in session else 'N/A'}")
                return tokens['access_token']

    except Exception as e:
        current_app.logger.error(f"Error retrieving token from storage: {e}")
    
    return None


def get_authenticated_db():
    """Get a database connection with authentication token for Neon PostgreSQL
    
    This implements the server-side pattern shown in server_component.tsx
    
    Returns:
        psycopg2.connection: An authenticated connection to Neon PostgreSQL
    """
    # Check if we already have an authenticated connection in the request context
    if 'db_authenticated_connection' in g:
        return g.db_authenticated_connection
    
    try:
        # Get the authentication token
        auth_token = get_auth_token()
        
        if not auth_token:
            current_app.logger.warning("No authentication token available for Neon connection")
            # Fall back to regular connection
            from Backend.database.connection import get_db
            return get_db()
        
        # Get the authenticated database URL
        db_url = config.DATABASE_AUTHENTICATED_URL
        if not db_url:
            current_app.logger.warning("No authenticated database URL configured, falling back to regular connection")
            # Fall back to regular connection
            from Backend.database.connection import get_db
            return get_db()
        
        # Create an authenticated connection
        conn = psycopg2.connect(db_url, auth_token=auth_token)
        
        # Store in request context
        g.db_authenticated_connection = conn
        
        # Set RLS context if needed
        if 'user' in session and 'id' in session['user'] and 'organization_id' in session['user']:
            try:
                cursor = conn.cursor()
                cursor.execute("SET app.current_user_id = %s", (str(session['user']['id']),))
                cursor.execute("SET app.current_organization_id = %s", (str(session['user']['organization_id']),))
                conn.commit()
                cursor.close()
            except Exception as e:
                current_app.logger.error(f"Failed to set RLS context in authenticated connection: {e}")
        
        return conn
    except Exception as e:
        current_app.logger.error(f"Error creating authenticated database connection: {e}")
        # Fall back to regular connection
        from Backend.database.connection import get_db
        return get_db()


class NeonAuthenticatedClient:
    """Client for authenticated connections to Neon PostgreSQL
    
    This implements the client-side pattern shown in client_component.tsx
    """
    
    def __init__(self, token=None):
        """Initialize the client with an optional token
        
        Args:
            token (str, optional): Authentication token. If not provided, will try to get from session.
        """
        self.token = token or get_auth_token()
        self.conn = None
    
    def connect(self):
        """Create an authenticated connection to Neon PostgreSQL
        
        Returns:
            psycopg2.connection: An authenticated connection
        """
        if not self.token:
            raise ValueError("No authentication token available")
        
        db_url = config.NEXT_PUBLIC_DATABASE_AUTHENTICATED_URL
        if not db_url:
            raise ValueError("No authenticated database URL configured")
        
        self.conn = psycopg2.connect(db_url, auth_token=self.token)
        return self.conn
    
    def execute(self, query, params=None):
        """Execute a query on the authenticated connection
        
        Args:
            query (str): SQL query to execute
            params (tuple, optional): Parameters for the query
            
        Returns:
            list: Query results
        """
        if not self.conn:
            self.connect()
        
        cursor = self.conn.cursor()
        try:
            cursor.execute(query, params or ())
            results = cursor.fetchall()
            self.conn.commit()
            return results
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def close(self):
        """Close the connection"""
        if self.conn:
            self.conn.close()
            self.conn = None