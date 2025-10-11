# app/powerbi_chat/caching/cache_manager.py

import logging
import uuid
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class CacheManager:
    """A simple in-memory cache manager for handling clarification context."""
    
    def __init__(self, max_age_minutes: int = 30):
        self._cache = {}
        self.max_age = timedelta(minutes=max_age_minutes)

    def _cleanup_old_entries(self):
        """Removes expired entries from the cache."""
        now = datetime.now()
        expired_keys = [
            key for key, value in self._cache.items()
            if now - value['timestamp'] > self.max_age
        ]
        for key in expired_keys:
            del self._cache[key]
            logger.info(f"Cleaned up expired cache entry: {key}")

    def set(self, data: dict) -> str:
        """Stores data in the cache and returns a unique key."""
        self._cleanup_old_entries()
        key = f"clarification_context_{uuid.uuid4().hex}"
        self._cache[key] = {
            'data': data,
            'timestamp': datetime.now()
        }
        logger.info(f"Stored data in cache with key: {key}. Cache size: {len(self._cache)}")
        return key

    def get(self, key: str) -> dict | None:
        """Retrieves data from the cache and deletes it (one-time use)."""
        self._cleanup_old_entries()
        entry = self._cache.get(key)
        if not entry:
            logger.warning(f"Cache key not found: {key}")
            return None
        
        del self._cache[key]
        logger.info(f"Retrieved and removed cache entry for key: {key}. Cache size: {len(self._cache)}")
        return entry.get('data')

# Singleton instance to be used across the application
cache_manager = CacheManager()