from flask import session, g, current_app
from app.database.connection import get_db
from app.core.database import init_db_pool, get_connection_pool
from app.core.exceptions import DatabaseError
import psycopg2
import time

def set_user_context():
    """Set user context for Row Level Security (RLS)"""
    user = session.get("user")
    if not user:
        current_app.logger.debug("No user session data")
        return  # Not logged in
        
    # Validate required fields
    required_fields = ["ms_object_id", "organization_id"]
    missing_fields = [field for field in required_fields if not user.get(field)]
    if missing_fields:
        current_app.logger.warning(f"Missing required user fields: {', '.join(missing_fields)}")
        return

    max_retries = 3
    retry_count = 0
    last_error = None

    while retry_count < max_retries:
        conn = None
        cursor = None
        try:
            ms_object_id = str(user["ms_object_id"]).strip()
            organization_id = str(user["organization_id"]).strip()

            if not ms_object_id or not organization_id:
                current_app.logger.warning("Invalid user ID or organization ID")
                return

            conn = get_db()
            if not conn:
                raise DatabaseError("Could not get database connection")
                
            if conn.closed:
                # Reinitialize the pool if connection is closed
                init_db_pool(database_url=current_app.config['DATABASE_URL'])
                conn = get_db()
                if not conn or conn.closed:
                    raise DatabaseError("Could not establish database connection")

            cursor = conn.cursor()
            if cursor.closed:
                raise DatabaseError("Cursor is closed immediately after creation")

            # Execute both statements and commit in one transaction
            cursor.execute("SET app.current_user_ms_object_id = %s", (ms_object_id,))
            cursor.execute("SET app.current_organization_id = %s", (organization_id,))
            conn.commit()
            return  # Success, exit the function

        except (psycopg2.Error, DatabaseError) as e:
            last_error = str(e)
            current_app.logger.warning(f"Database error on attempt {retry_count + 1}: {str(e)}")
            
            if conn and not conn.closed:
                try:
                    conn.rollback()
                except Exception as rollback_error:
                    current_app.logger.warning(f"Failed to rollback connection: {str(rollback_error)}")
            
            retry_count += 1
            if retry_count < max_retries:
                # Wait before retrying, with exponential backoff
                time.sleep(2 ** retry_count)
                continue
            
            # If we've exhausted all retries, raise the error
            raise DatabaseError(f"Failed to set user context after {max_retries} attempts. Last error: {last_error}")
            
        finally:
            if cursor and not cursor.closed:
                try:
                    cursor.close()
                except Exception as e:
                    current_app.logger.warning(f"Failed to close cursor in cleanup: {str(e)}")

def ensure_db_pool():
    """Ensure database pool is initialized"""
    max_retries = 3
    retry_count = 0
    last_error = None

    while retry_count < max_retries:
        try:
            pool = get_connection_pool()
            if not pool:
                init_db_pool(
                    min_conn=5,
                    max_conn=20,
                    database_url=current_app.config['DATABASE_URL']
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
        # Return connection to pool if it was used
        conn = g.pop('db_connection', None)
        if conn is not None:
            try:
                pool = get_connection_pool()
                if pool:
                    pool.putconn(conn)
            except Exception as e:
                current_app.logger.error(f"Error returning connection to pool: {str(e)}")
                try:
                    conn.close()
                except Exception:
                    pass  # Already closed
