from flask import g, current_app
from app.core.database import init_db_pool, get_connection_pool, get_db_connection
from app.core.exceptions import DatabaseError, ProjectNotFoundError
import psycopg
import psycopg.sql
import time

def set_user_context():
    """Set user context for Row Level Security (RLS)"""
    # Get user from JWT token via auth2 middleware
    from app.auth2.middleware import get_current_user_from_token
    user = get_current_user_from_token()
    if not user:
        return  # Not logged in
        
    # Validate required fields
    required_fields = ["ms_object_id"]
    missing_fields = [field for field in required_fields if not user.get(field)]
    if missing_fields:
        current_app.logger.warning(f"Missing required user fields: {', '.join(missing_fields)}")
        return

    max_retries = 5
    retry_count = 0
    last_error = None

    while retry_count < max_retries:
        try:
            ms_object_id = str(user["ms_object_id"]).strip()

            if not ms_object_id:
                current_app.logger.warning("Invalid user ID")
                return

            # Use the context manager to ensure proper connection handling
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # Execute both statements and commit in one transaction
                    # SET statements don't work with parameterized queries, use string formatting with proper escaping
                    cursor.execute(psycopg.sql.SQL("SET app.current_user_ms_object_id = {}").format(psycopg.sql.Literal(ms_object_id)))
                    conn.commit()
                    return  # Success, exit the function

        except (psycopg.Error, DatabaseError) as e:
            error_message = str(e)
            
            # Check for Neon serverless scaling issues
            if isinstance(e, ProjectNotFoundError) or "project not found" in error_message.lower():
                current_app.logger.warning(f"ProjectNotFoundError during user context setup - likely Neon scaling issue: {error_message}")
                # This is likely due to Neon scaling down and connections becoming stale
                # Continue without user context rather than crashing the app
                return
            
            # Check if this is an RLS policy violation (not a connection issue)
            if "violates row-level security policy" in error_message.lower():
                current_app.logger.warning(f"RLS policy violation during user context setup: {error_message}")
                # RLS violations are expected security behavior, not connection errors
                # Continue without user context rather than crashing the app
                return
            
            # Check for other non-fatal database errors that shouldn't trigger retries
            non_fatal_errors = [
                "permission denied",
                "access denied", 
                "insufficient privilege",
                "authentication failed",
                "project not found"
            ]
            
            if any(error_pattern in error_message.lower() for error_pattern in non_fatal_errors):
                current_app.logger.warning(f"Non-fatal database error during user context setup: {error_message}")
                return
            
            # For other errors (connection issues, etc.), use retry logic
            last_error = error_message
            current_app.logger.warning(f"Database error on attempt {retry_count + 1}: {error_message}")
            
            retry_count += 1
            if retry_count < max_retries:
                # Wait before retrying, with exponential backoff
                time.sleep(2 ** retry_count)
                continue
            
            # If we've exhausted all retries, raise the error
            raise DatabaseError(f"Failed to set user context after {max_retries} attempts. Last error: {last_error}")

def ensure_db_pool():
    """Ensure database pool is initialized"""
    import os
    max_retries = 3
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
                init_db_pool(
                    min_conn=5,
                    max_conn=20,
                    database_url=db_url
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
