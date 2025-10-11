import psycopg2
from app.config.settings import config
from flask import current_app, g
from app.core.database import get_connection_pool, init_db_pool, validate_connection
from app.core.exceptions import DatabaseError
#from app.database.neon_auth import get_auth_token

def register_db_teardown(app):
    """Register database teardown handlers with the application"""
    def cleanup(e=None):
        conn = g.pop('db_connection', None)
        if conn:
            try:
                if not conn.closed:
                    pool = get_connection_pool()
                    if pool:
                        pool.putconn(conn)
                    else:
                        # If pool is not available, close connection directly
                        conn.close()
            except Exception as cleanup_error:
                try:
                    if conn and not conn.closed:
                        conn.close()
                except Exception as close_error:
                    current_app.logger.exception(f"Error closing connection: {close_error}")
    
    app.teardown_appcontext(cleanup)