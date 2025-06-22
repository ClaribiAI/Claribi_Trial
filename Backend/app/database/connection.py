import psycopg2
from app.config.settings import config
from flask import current_app, g
from app.core.database import get_connection_pool, init_db_pool
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
            except:
                try:
                    conn.close()
                except Exception as e:
                    current_app.logger.exception("Error closing connection")
    
    app.teardown_appcontext(cleanup)


def get_db():
    """Get database connection from request context"""
    if 'db_connection' not in g:
        try:
            # Ensure pool exists
            pool = get_connection_pool()
            if not pool:
                init_db_pool(database_url=config.DATABASE_URL)
                pool = get_connection_pool()
                if not pool:
                    raise DatabaseError("Failed to initialize database pool")
            
            # Get connection from pool
            conn = pool.getconn()
            
            # Test connection is alive
            try:
                cur = conn.cursor()
                cur.execute('SELECT 1')
                cur.close()
            except (psycopg2.OperationalError, psycopg2.InterfaceError):
                # Connection is dead, close and get new one
                try:
                    pool.putconn(conn, close=True)
                except:
                    pass
                conn = pool.getconn()
            
            # Store in flask.g
            g.db_connection = conn
            
        except Exception as e:
            current_app.logger.error(f"Database connection error: {str(e)}")
            raise DatabaseError(f"Could not establish database connection: {str(e)}")
    
    return g.db_connection