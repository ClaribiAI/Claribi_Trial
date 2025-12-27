from flask import g, current_app
from app.core.database import init_db_pool, get_connection_pool, get_db_connection, get_direct_db_connection_string
from app.core.exceptions import DatabaseError
from app.core.session_token import get_or_create_session_token
import psycopg
import psycopg.sql
import time

def set_user_context():
    """Set user context for Row Level Security (RLS) using session token"""
    try:
        # Get or create session token for this request
        session_token = get_or_create_session_token()
        
        # Store in Flask g for use in routes and database connections
        # The session variable will be set on each database connection
        # when get_db_cursor() is called (see database.py)
        g.session_token = session_token
    except Exception as e:
        # If session token generation fails, continue without it
        # Routes should handle missing tokens appropriately
        current_app.logger.warning(f"Failed to set user context: {e}")
        g.session_token = None

def ensure_db_pool():
    """Ensure database pool is initialized"""
    import os
    from app.config.settings import config
    
    max_retries = config.DB_CONNECTION_RETRIES
    retry_count = 0
    last_error = None

    while retry_count < max_retries:
        try:
            pool = get_connection_pool()
            if not pool:
                # Always read DATABASE_URL directly from environment to detect changes
                db_url = os.getenv('DATABASE_URL') or current_app.config.get('DATABASE_URL')
                if not db_url:
                    raise DatabaseError("DATABASE_URL not found in environment or config")
                # Use config values for pool initialization
                init_db_pool(
                    min_conn=config.DB_POOL_MIN_CONN,
                    max_conn=config.DB_POOL_MAX_CONN,
                    database_url=db_url,
                    connection_timeout=config.DB_CONNECTION_TIMEOUT
                )
                pool = get_connection_pool()
                if not pool:
                    raise DatabaseError("Failed to initialize database pool")
            return  # Success, exit the function
            
        except Exception as e:
            last_error = str(e)
            current_app.logger.warning(f"Database pool initialization error on attempt {retry_count + 1}: {str(e)}")
            retry_count += 1
            
            if retry_count < max_retries:
                # Wait before retrying, with exponential backoff
                time.sleep(2 ** retry_count)
                continue
    
    # If we've exhausted all retries, raise the error
    raise DatabaseError(f"Could not initialize database pool after {max_retries} attempts. Last error: {last_error}")

def db_context_middleware(app):
    @app.before_request
    def before_request():
        try:
            ensure_db_pool()
            set_user_context()
        except DatabaseError as e:
            current_app.logger.error(f"Database initialization error: {str(e)}")
            raise

    @app.teardown_appcontext
    def teardown_appcontext(exception=None):
        # Legacy cleanup: Return any connection from flask.g to pool if it was used
        # Note: This is mainly for backward compatibility as the new context managers
        # handle their own cleanup. The get_db() function has been removed.
        conn = g.pop('db_connection', None)
        if conn is not None:
            try:
                pool = get_connection_pool()
                if pool and not conn.closed:
                    pool.putconn(conn)
                elif conn and not conn.closed:
                    # If no pool available, close the connection directly
                    conn.close()
            except Exception as e:
                current_app.logger.error(f"Error returning legacy connection to pool: {str(e)}")
                try:
                    if conn and not conn.closed:
                        conn.close()
                except Exception:
                    pass  # Already closed
