"""Database Module

This module provides database connection pooling and management functionality.
"""

import os
from typing import Any, Optional
from urllib.parse import urlparse
from contextlib import contextmanager
from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import DictCursor
from app.core.exceptions import DatabaseError
from app.core.logging import get_logger
from threading import Lock
import psycopg2
from flask import current_app

logger = get_logger(__name__)

# Initialize connection pool as None
_pool = None
_pool_lock = Lock()

def parse_db_url(url: str) -> dict:
    """Parse database URL into connection parameters.
    
    Args:
        url: Database URL in format: 
            postgresql://user:password@host:port/dbname
            
    Returns:
        dict: Database connection parameters
    """
    parsed = urlparse(url)
    return {
        'dbname': parsed.path[1:],  # Remove leading '/'
        'user': parsed.username,
        'password': parsed.password,
        'host': parsed.hostname,
        'port': parsed.port or 5432
    }

def validate_connection(conn) -> bool:
    """Validate if a connection is alive and usable."""
    if conn is None or conn.closed:
        return False
    try:
        cur = conn.cursor()
        cur.execute('SELECT 1')
        cur.close()
        return True
    except (psycopg2.OperationalError, psycopg2.InterfaceError):
        return False

def init_db_pool(
    min_conn: int = 5,
    max_conn: int = 20,
    database_url: str = None
) -> None:
    """Initialize the database connection pool.
    
    Args:
        min_conn: Minimum number of connections
        max_conn: Maximum number of connections
        database_url: Database URL (if not provided, will use DATABASE_URL env var)
        
    Raises:
        DatabaseError: If pool initialization fails
    """
    global _pool
    
    with _pool_lock:
        if _pool is not None:
            # Test existing pool
            try:
                conn = _pool.getconn()
                if validate_connection(conn):
                    _pool.putconn(conn)
                    return
                _pool.putconn(conn, close=True)
            except:
                pass
            
            try:
                _pool.closeall()
            except:
                pass
            _pool = None
        
        try:
            # Get database URL from environment if not provided
            db_url = database_url or os.getenv('DATABASE_URL')
            if not db_url:
                raise DatabaseError("Database URL not provided")
            
            # Parse database URL into connection parameters
            config = parse_db_url(db_url)
            
            # Create new pool
            _pool = ThreadedConnectionPool(
                minconn=min_conn,
                maxconn=max_conn,
                **config
            )
            
            # Validate pool by testing a connection
            conn = _pool.getconn()
            if not validate_connection(conn):
                _pool.putconn(conn, close=True)
                raise DatabaseError("Failed to validate database pool")
            _pool.putconn(conn)
            
            logger.info("Database connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {str(e)}")
            if _pool:
                try:
                    _pool.closeall()
                except:
                    pass
                _pool = None
            raise DatabaseError(f"Failed to initialize database connection pool: {str(e)}")

def get_connection_pool() -> Optional[ThreadedConnectionPool]:
    """Get the database connection pool.
    
    Returns:
        ThreadedConnectionPool: The connection pool instance or None if not initialized
    """
    return _pool

@contextmanager
def get_db_connection():
    """Get a database connection from the pool.
    
    Yields:
        connection: Database connection object
        
    Raises:
        DatabaseError: If connection acquisition fails
    """
    conn = None
    pool = get_connection_pool()
    if not pool:
        raise DatabaseError("Database pool not initialized")
        
    try:
        conn = pool.getconn()
        if not validate_connection(conn):
            pool.putconn(conn, close=True)
            conn = pool.getconn()
            if not validate_connection(conn):
                raise DatabaseError("Failed to get valid database connection")
        yield conn
    except Exception as e:
        logger.error(f"Error getting database connection: {str(e)}")
        if conn:
            try:
                pool.putconn(conn, close=True)
            except:
                pass
        raise DatabaseError(f"Failed to get database connection: {str(e)}")
    finally:
        if conn and pool:
            try:
                if not conn.closed:
                    pool.putconn(conn)
            except Exception as e:
                logger.error(f"Error returning connection to pool: {str(e)}")
                try:
                    conn.close()
                except:
                    pass

@contextmanager
def get_db_cursor(commit: bool = False):
    """Get a database cursor.

    Args:
        commit: Whether to commit the transaction

    Yields:
        cursor: Database cursor object

    Raises:
        DatabaseError: If cursor operation fails
    """
    with get_db_connection() as conn:
        cursor = None
        try:
            cursor = conn.cursor(cursor_factory=DictCursor)
            if cursor.closed:
                raise DatabaseError("Database cursor is closed immediately after creation")

            yield cursor

            if commit:
                conn.commit()
        except Exception as e:
            if commit and conn and not conn.closed:
                conn.rollback()
            logger.error(f"Database cursor error: {str(e)}")
            raise DatabaseError(f"Database operation failed: {str(e)}")
        finally:
            if cursor and not cursor.closed:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"Failed to close cursor: {str(e)}")

def close_db_pool() -> None:
    """Close the database connection pool."""
    global _pool
    with _pool_lock:
        if _pool:
            try:
                # Only close if we're shutting down the app
                if not current_app or current_app.config.get('TESTING', False):
                    _pool.closeall()
                    _pool = None
                    logger.info("Database connection pool closed")
            except Exception as e:
                logger.error(f"Error closing database pool: {str(e)}")
                try:
                    _pool.closeall()
                except:
                    pass
                _pool = None 