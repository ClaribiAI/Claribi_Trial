"""Share Link Model Module

This module contains the ShareLink model class and related functionality.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, ClassVar
from app.core.exceptions import ProjectError

@dataclass
class ShareLink:
    """Share link model class."""
    
    # Class constants
    DEFAULT_EXPIRY_HOURS: ClassVar[int] = 24
    MAX_EXPIRY_HOURS: ClassVar[int] = 720  # 30 days
    
    # Instance attributes
    id: int
    project_id: int
    encrypted_token: str
    created_by_user_id: int  # numeric user id of creator
    created_at: datetime
    expires_at: Optional[datetime]
    access_count: int
    max_uses: Optional[int]
    access_type: str  # 'reader' or 'co_owner'
    is_active: bool
    last_accessed_at: Optional[datetime] = None
    
    @classmethod
    def from_db_dict(cls, data: Dict[str, Any]) -> 'ShareLink':
        """Create a ShareLink instance from database dictionary.
        
        Args:
            data: Dictionary containing share link data
            
        Returns:
            ShareLink: New ShareLink instance
            
        Raises:
            ProjectError: If required fields are missing
        """
        required_fields = {'id', 'project_id', 'encrypted_token', 'created_by_user_id', 'created_at', 'access_type', 'is_active'}
        missing_fields = required_fields - set(data.keys())
        if missing_fields:
            raise ProjectError(f"Missing required fields: {missing_fields}")
            
        return cls(
            id=data['id'],
            project_id=data['project_id'],
            encrypted_token=data['encrypted_token'],
            created_by_user_id=data['created_by_user_id'],
            created_at=data['created_at'],
            expires_at=data.get('expires_at'),
            access_count=data.get('access_count', 0),
            max_uses=data.get('max_uses'),
            access_type=data['access_type'],
            is_active=data['is_active'],
            last_accessed_at=data.get('last_accessed_at')
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert ShareLink instance to dictionary.
        
        Returns:
            dict: Share link data dictionary
        """
        return {
            'id': self.id,
            'project_id': self.project_id,
            'encrypted_token': self.encrypted_token,
            'created_by_user_id': self.created_by_user_id,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'access_count': self.access_count,
            'max_uses': self.max_uses,
            'access_type': self.access_type,
            'is_active': self.is_active,
            'last_accessed_at': self.last_accessed_at.isoformat() if self.last_accessed_at else None,
            'is_expired': self.is_expired,
            'has_reached_max_uses': self.has_reached_max_uses,
            'can_be_used': self.can_be_used
        }
    
    @property
    def is_expired(self) -> bool:
        """Check if share link is expired.
        
        Returns:
            bool: True if link is expired
        """
        if not self.expires_at:
            return False
        return datetime.now() >= self.expires_at
    
    @property
    def has_reached_max_uses(self) -> bool:
        """Check if share link has reached maximum uses.
        
        Returns:
            bool: True if maximum uses reached
        """
        if not self.max_uses:
            return False
        return self.access_count >= self.max_uses
    
    @property
    def can_be_used(self) -> bool:
        """Check if share link can still be used.
        
        Returns:
            bool: True if link can be used
        """
        return (
            self.is_active and
            not self.is_expired and
            not self.has_reached_max_uses
        )
    
    def increment_access_count(self) -> None:
        """Increment the access count and update last accessed time."""
        self.access_count += 1
        self.last_accessed_at = datetime.now()
    
    def deactivate(self) -> None:
        """Deactivate the share link."""
        self.is_active = False
        
    def extend_expiry(self, hours: int) -> None:
        """Extend the expiry time of the share link.
        
        Args:
            hours: Number of hours to extend by
            
        Raises:
            ProjectError: If hours is invalid or would exceed maximum
        """
        if hours < 1:
            raise ProjectError("Extension hours must be positive")
            
        if hours > self.MAX_EXPIRY_HOURS:
            raise ProjectError(f"Cannot extend more than {self.MAX_EXPIRY_HOURS} hours")
            
        current_expiry = self.expires_at or datetime.now()
        self.expires_at = current_expiry + timedelta(hours=hours)
        
        # Ensure we don't exceed maximum duration from now
        max_expiry = datetime.now() + timedelta(hours=self.MAX_EXPIRY_HOURS)
        if self.expires_at > max_expiry:
            self.expires_at = max_expiry 