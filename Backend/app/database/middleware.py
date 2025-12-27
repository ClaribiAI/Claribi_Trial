from flask import g, current_app
from app.core.database import init_db_pool, get_connection_pool, get_db_connection, get_direct_db_connection_string
from app.core.exceptions import DatabaseError
from app.core.session_token import get_or_create_session_token
import psycopg
import psycopg.sql
import time
import os
from app.config.settings import config

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
    """Ensure database pool is initialized and responsive"""
    
    max_retries = config.DB_CONNECTION_RETRIES # Set this to at least 5
    retry_count = 0
    last_error = None

    while retry_count < max_retries:
        try:
            pool = get_connection_pool()
            
            if not pool:
                db_url = os.getenv('DATABASE_URL') or current_app.config.get('DATABASE_URL')
                
                # 1. Initialize the pool
                init_db_pool(
                    min_conn=config.DB_POOL_MIN_CONN,
                    max_conn=config.DB_POOL_MAX_CONN,
                    database_url=db_url,
                    # Ensure the underlying driver allows enough time for Neon to wake up
                    connection_timeout=30 
                )
                pool = get_connection_pool()

            # 2. VITAL: "Ping" the database to force the wake-up
            # Getting the pool isn't enough; we need to execute a simple query
            conn = pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                pool.putconn(conn)
                return  # Success! Database is awake and responding.
            except Exception as e:
                # Close the tainted connection directly instead of returning to pool
                try:
                    conn.close()
                except Exception:
                    pass  # Connection might already be closed
                raise e

        except Exception as e:
            last_error = str(e)
            retry_count += 1
            wait_time = (2 ** retry_count) + (retry_count * 2) # Slightly more aggressive backoff
            
            current_app.logger.warning(
                f"Neon cold start: Attempt {retry_count}/{max_retries} failed. "
                f"Retrying in {wait_time}s... Error: {last_error}"
            )
            
            if retry_count < max_retries:
                time.sleep(wait_time)
            else:
                break

    raise DatabaseError(f"Neon failed to wake up after {max_retries} attempts. Last error: {last_error}")

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
