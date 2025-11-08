"""Database Module

This module provides database connection pooling and management functionality.
"""

import os
from typing import Any, Optional
from urllib.parse import urlparse
from contextlib import contextmanager
from psycopg_pool import ConnectionPool
# Note: psycopg v3 doesn't have DictCursor in extras, using regular Cursor
# from psycopg.extras import DictCursor, Json
from app.core.exceptions import (
    DatabaseError, 
    RLSPolicyViolationError
)
from app.core.logging import get_logger
from threading import Lock
import psycopg
from flask import current_app
import re
import json

logger = get_logger(__name__)

# Initialize connection pool as None
_pool = None
_pool_lock = Lock()
_pool_database_url = None  # Track the DATABASE_URL used to initialize the pool

def parse_rls_error(error_message: str) -> dict:
    """Parse RLS error message to extract table and operation information.
    
    Args:
        error_message: The PostgreSQL RLS error message
        
    Returns:
        dict: Parsed information including table, operation, etc.
    """
    info = {
        'table': None,
        'operation': None,
        'policy': None
    }
    
    # Extract table name from "violates row-level security policy for table \"table_name\""
    table_match = re.search(r'for table "([^"]+)"', error_message, re.IGNORECASE)
    if table_match:
        info['table'] = table_match.group(1)
    
    # Extract operation type (INSERT, UPDATE, DELETE, SELECT)
    if 'insert' in error_message.lower():
        info['operation'] = 'create'
    elif 'update' in error_message.lower():
        info['operation'] = 'update'
    elif 'delete' in error_message.lower():
        info['operation'] = 'delete'
    elif 'select' in error_message.lower():
        info['operation'] = 'access'
    
    return info

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
        # Use a more robust validation query for Neon
        cur.execute('SELECT 1 as test')
        result = cur.fetchone()
        cur.close()
        return result is not None
    except (psycopg.OperationalError, psycopg.InterfaceError):
        return False
    except Exception as e:
        # Handle potential RLS errors during validation
        error_message = str(e).lower()
        if "access denied" in error_message or "violates row-level security policy" in error_message:
            # These indicate the connection is stale (Neon scaled down)
            logger.warning(f"Connection appears stale due to serverless scaling: {str(e)}")
            return False  # Force connection refresh
        return False

def init_db_pool(
    min_conn: int = None,
    max_conn: int = None,
    database_url: str = None,
    connection_timeout: int = None
) -> None:
    """Initialize the database connection pool.
    
    Args:
        min_conn: Minimum number of connections (defaults to config value)
        max_conn: Maximum number of connections (defaults to config value)
        database_url: Database URL (if not provided, will use DATABASE_URL env var)
        connection_timeout: Connection acquisition timeout in seconds (defaults to config value)
        
    Raises:
        DatabaseError: If pool initialization fails
    """
    from app.config.settings import config
    
    global _pool, _pool_database_url
    
    # Use config values if not provided
    if min_conn is None:
        min_conn = config.DB_POOL_MIN_CONN
    if max_conn is None:
        max_conn = config.DB_POOL_MAX_CONN
    if connection_timeout is None:
        connection_timeout = config.DB_CONNECTION_TIMEOUT
    
    # Validate configuration parameters
    if min_conn <= 0:
        raise DatabaseError(f"min_conn must be positive, got {min_conn}")
    if max_conn <= 0:
        raise DatabaseError(f"max_conn must be positive, got {max_conn}")
    if min_conn > max_conn:
        raise DatabaseError(f"min_conn ({min_conn}) cannot be greater than max_conn ({max_conn})")
    if max_conn > 100:
        raise DatabaseError(f"max_conn ({max_conn}) exceeds maximum allowed value of 100")
    if connection_timeout <= 0:
        raise DatabaseError(f"connection_timeout must be positive, got {connection_timeout}")
    
    with _pool_lock:
        # Always check environment variable first for comparison
        env_db_url = os.getenv('DATABASE_URL')
        # Get database URL from parameter or environment
        db_url = database_url or env_db_url
        if not db_url:
            raise DatabaseError("Database URL not provided")
        
        # Check if DATABASE_URL has changed - always compare against environment variable
        # This ensures we detect changes even if cached config is passed
        if _pool is not None and _pool_database_url is not None:
            # Compare against environment variable if available, otherwise use passed parameter
            comparison_url = env_db_url if env_db_url else db_url
            if _pool_database_url != comparison_url:
                logger.info(f"DATABASE_URL has changed. Closing old pool and reinitializing with new URL.")
                try:
                    _pool.close()
                except Exception as e:
                    logger.warning(f"Error closing existing pool: {e}")
                _pool = None
                _pool_database_url = None
            else:
                # DATABASE_URL hasn't changed, test existing pool
                try:
                    conn = _pool.getconn()
                    if validate_connection(conn):
                        _pool.putconn(conn)
                        return
                    else:
                        try:
                            _pool.putconn(conn)
                            conn.close()
                        except Exception as e:
                            logger.warning(f"Error closing invalid connection during pool test: {e}")
                except Exception as e:
                    logger.warning(f"Error testing existing pool: {e}")
                
                # Pool exists but validation failed, close it
                try:
                    _pool.close()
                except Exception as e:
                    logger.warning(f"Error closing existing pool: {e}")
                _pool = None
                _pool_database_url = None
        
        try:
            
            # Parse database URL into connection parameters
            db_config = parse_db_url(db_url)
            
            # Create connection parameters dict (avoid password in string)
            # Pass connection parameters via kwargs to avoid password in connection string
            conn_params = {
                'host': db_config['host'],
                'port': db_config['port'],
                'dbname': db_config['dbname'],
                'user': db_config['user'],
                'password': db_config['password']
            }
            
            # Create new pool with connection parameters dict and timeout
            # Use kwargs parameter to pass connection parameters as dict (avoids password in string)
            _pool = ConnectionPool(
                conninfo='',  # Empty string, parameters passed via kwargs
                kwargs=conn_params,
                min_size=min_conn,
                max_size=max_conn,
                timeout=connection_timeout
            )
            
            # Store the DATABASE_URL used for this pool (prefer environment variable for tracking)
            _pool_database_url = env_db_url if env_db_url else db_url
            
            # Note: psycopg v3 doesn't have register_default_json in extras
            # JSON adapters are handled automatically in psycopg v3
            # from psycopg.extras import register_default_json, register_default_jsonb
            # register_default_json(globally=True)
            # register_default_jsonb(globally=True)
            
            # Validate pool by testing a connection
            conn = None
            try:
                conn = _pool.getconn()
                if not validate_connection(conn):
                    raise DatabaseError("Failed to validate initial database connection")
                _pool.putconn(conn)
                conn = None
            except Exception as e:
                if conn:
                    try:
                        _pool.putconn(conn)
                        conn.close()
                    except:
                        pass
                # Reset pool state on validation failure
                _pool = None
                _pool_database_url = None
                raise e
            
            logger.info(f"Database connection pool initialized successfully with URL: {db_config['host']}:{db_config['port']}/{db_config['dbname']}")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {str(e)}")
            if _pool:
                try:
                    _pool.close()
                except Exception as close_error:
                    logger.warning(f"Error closing failed pool: {close_error}")
                _pool = None
                _pool_database_url = None
            raise DatabaseError(f"Failed to initialize database connection pool: {str(e)}")

def get_connection_pool() -> Optional[ConnectionPool]:
    """Get the database connection pool.
    
    Returns:
        ConnectionPool: The connection pool instance or None if not initialized
    """
    return _pool

def get_db_connection_string() -> str:
    """Get the pooled database connection string for services that need it (e.g., LangChain).
    
    This returns the pooled connection string (with -pooler) used by the connection pool.
    For Neon, this should be used for most operations via PgBouncer transaction mode.
    
    Returns:
        str: Pooled database connection string
        
    Raises:
        DatabaseError: If connection string is not available
    """
    from app.config.settings import config
    
    # Get the connection string from pool configuration or config
    if _pool_database_url:
        # Use the connection string that was used to initialize the pool
        return _pool_database_url
    elif config.DATABASE_URL:
        # Fall back to DATABASE_URL from config
        # Ensure it's a pooled connection string
        if config.is_pooled_connection_string(config.DATABASE_URL):
            return config.DATABASE_URL
        else:
            # Convert to pooled if needed
            return config.get_pooled_connection_string(config.DATABASE_URL)
    else:
        raise DatabaseError("Database connection string not available")

def get_direct_db_connection_string() -> str:
    """Get the direct database connection string (without pooler).
    
    This is needed for operations that require session-level features not supported
    in PgBouncer transaction mode, such as:
    - SET/RESET statements (e.g., RLS context setting)
    - Schema migrations
    - Logical replication
    
    For Neon, this removes the -pooler from the endpoint to get a direct connection.
    
    Returns:
        str: Direct database connection string (without -pooler)
        
    Raises:
        DatabaseError: If connection string is not available
    """
    from app.config.settings import config
    
    # Get the pooled connection string first
    pooled_conn_str = get_db_connection_string()
    
    # Convert to direct connection string (remove -pooler)
    return config.get_direct_connection_string(pooled_conn_str)

@contextmanager
def get_db_connection():
    """Get a database connection from the pool.
    
    Yields:
        connection: Database connection object
        
    Raises:
        DatabaseError: If connection acquisition fails
    """
    from app.config.settings import config
    
    conn = None
    pool = None
    max_retries = config.DB_CONNECTION_RETRIES
    retry_count = 0
    last_error = None
    
    # Atomically get pool reference with lock protection to prevent race condition
    with _pool_lock:
        pool = _pool
        if not pool:
            raise DatabaseError("Database pool not initialized")
    
    # Retry logic OUTSIDE the context manager yield
    while retry_count < max_retries:
        try:
            # Use timeout from pool configuration (set during initialization)
            conn = pool.getconn()
            
            # Single validation - if it fails, return connection and retry
            if not validate_connection(conn):
                # Clean up invalid connection
                try:
                    pool.putconn(conn)
                    conn.close()
                except Exception as e:
                    logger.warning(f"Error closing invalid connection: {e}")
                    # If putconn fails, the connection might be corrupted, just close it
                    try:
                        conn.close()
                    except:
                        pass
                conn = None
                
                # Retry to get a new connection
                if retry_count < max_retries - 1:
                    retry_count += 1
                    continue
                else:
                    raise DatabaseError("Failed to get valid database connection after validation")
            
            break  # Success, exit retry loop
            
        except Exception as e:
            logger.error(f"Error getting database connection: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error occurred during connection acquisition (attempt {retry_count + 1})")
            
            if conn:
                try:
                    if not conn.closed:
                        pool.putconn(conn)
                        conn.close()
                except Exception as putconn_error:
                    logger.warning(f"Error returning failed connection to pool: {putconn_error}")
                    # If putconn fails, close connection directly
                    try:
                        conn.close()
                    except:
                        pass
                conn = None
            
            # Store the error for potential re-raising
            last_error = e
            
            # Check if this is an RLS policy violation exception that should not be wrapped
            if isinstance(e, RLSPolicyViolationError):
                # Re-raise RLS exceptions directly
                logger.error(f"RLS policy violation during connection after {retry_count + 1} attempts: {type(e).__name__}: {str(e)}")
                raise e
            
            # For other errors, retry if we haven't exhausted attempts
            if retry_count < max_retries - 1:
                logger.warning(f"Database error on attempt {retry_count + 1}, retrying: {str(e)}")
                retry_count += 1
                continue
            else:
                # Exhausted all retries
                break
    
    # Check if we have a valid connection after retries
    if not conn:
        if last_error:
            if isinstance(last_error, RLSPolicyViolationError):
                raise last_error
            else:
                raise DatabaseError(f"Failed to get database connection after {max_retries} attempts: {str(last_error)}")
        else:
            raise DatabaseError("Failed to get database connection after all retries")
    
    # Now yield the connection in a clean context manager
    try:
        yield conn
    finally:
        if conn and pool:
            try:
                if not conn.closed:
                    pool.putconn(conn)
            except Exception as e:
                logger.error(f"Error returning connection to pool: {str(e)}")
                # If putconn fails, try to close the connection directly
                try:
                    if conn and not conn.closed:
                        conn.close()
                except Exception as close_error:
                    logger.error(f"Error closing connection after putconn failed: {close_error}")
        elif conn:
            # No pool available, close connection directly
            try:
                if not conn.closed:
                    conn.close()
            except Exception as e:
                logger.error(f"Error closing connection (no pool): {str(e)}")

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
            cursor = conn.cursor()
            if cursor.closed:
                raise DatabaseError("Database cursor is closed immediately after creation")

            yield cursor

            if commit:
                conn.commit()
        except Exception as e:
            if commit and conn and not conn.closed:
                try:
                    conn.rollback()
                except Exception as rollback_error:
                    logger.warning(f"Error during rollback: {rollback_error}")
            
            error_message = str(e)
            
            # Check if this is an RLS policy violation exception that should not be wrapped
            if isinstance(e, RLSPolicyViolationError):
                # Re-raise RLS exceptions directly
                raise e
            
            # Check if this is an RLS policy violation
            if "violates row-level security policy" in error_message.lower():
                logger.warning(f"RLS policy violation: {error_message}")
                # Parse the error to extract useful information
                rls_info = parse_rls_error(error_message)
                # Re-raise as specific RLS exception with parsed information
                raise RLSPolicyViolationError(
                    message=f"Access denied: Row Level Security policy violation",
                    table=rls_info.get('table'),
                    operation=rls_info.get('operation')
                )
            
            # Check for other permission-related errors that shouldn't be wrapped
            permission_errors = [
                "permission denied",
                "access denied",
                "insufficient privilege", 
                "authentication failed",
                "not authorized"
            ]
            
            if any(error_pattern in error_message.lower() for error_pattern in permission_errors):
                logger.warning(f"Permission error: {error_message}")
                # Re-raise the original exception to preserve error details
                raise e
            
            # For other errors (connection issues, etc.), wrap in DatabaseError
            logger.error(f"Database cursor error: {error_message}")
            raise DatabaseError(f"Database operation failed: {error_message}")
        finally:
            if cursor and not cursor.closed:
                try:
                    cursor.close()
                except Exception as e:
                    logger.warning(f"Failed to close cursor: {str(e)}")

def refresh_connection_pool() -> None:
    """Refresh stale connections in the pool - useful for Neon serverless scaling."""
    global _pool, _pool_database_url
    with _pool_lock:
        if _pool:
            try:
                # Close all connections and reinitialize
                logger.info("Refreshing connection pool due to serverless scaling")
                _pool.close()
                _pool = None
                _pool_database_url = None
                # Pool will be reinitialized on next request
            except Exception as e:
                logger.error(f"Error refreshing connection pool: {str(e)}")

def close_db_pool() -> None:
    """Close the database connection pool with graceful shutdown.
    
    Waits for active connections to be returned before closing, with a timeout.
    """
    import time
    
    global _pool, _pool_database_url
    with _pool_lock:
        if _pool:
            try:
                # Only close if we're shutting down the app (not in testing mode)
                if current_app and not current_app.config.get('TESTING', False):
                    # Graceful shutdown: wait for active connections with timeout
                    shutdown_timeout = 10  # seconds
                    start_time = time.time()
                    
                    # Check if there are active connections
                    # Note: psycopg_pool doesn't expose active connection count directly
                    # We'll attempt graceful close and force close after timeout
                    try:
                        # Try to close gracefully - this will wait for connections to be returned
                        _pool.close()
                        logger.info("Database connection pool closed gracefully")
                    except Exception as close_error:
                        logger.warning(f"Error during graceful pool close: {close_error}")
                        # Force close if graceful close fails
                        try:
                            _pool.close()
                        except:
                            pass
                    
                    # Check if we exceeded timeout
                    elapsed = time.time() - start_time
                    if elapsed > shutdown_timeout:
                        logger.warning(f"Pool shutdown took {elapsed:.2f}s (exceeded {shutdown_timeout}s timeout)")
                    
                    _pool = None
                    _pool_database_url = None
                elif not current_app:
                    # No app context (e.g., during shutdown), close immediately
                    try:
                        _pool.close()
                        logger.info("Database connection pool closed (no app context)")
                    except Exception as e:
                        logger.warning(f"Error closing pool during shutdown: {e}")
                    _pool = None
                    _pool_database_url = None
            except Exception as e:
                logger.error(f"Error closing database pool: {str(e)}")
                try:
                    _pool.close()
                except:
                    pass
                _pool = None
                _pool_database_url = None 