"""Project Model Module

This module contains the Project model class and related functionality.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict, Any

@dataclass
class Project:
    """Project model class."""
    
    id: int
    name: str
    description: str
    status: str
    owner_user_id: str
    created_at: datetime
    updated_at: datetime
    access_type: Optional[str] = None
    
    @classmethod
    def from_db_dict(cls, data: Dict[str, Any]) -> 'Project':
        """Create a Project instance from database dictionary.
        
        Args:
            data: Dictionary containing project data
            
        Returns:
            Project: New Project instance
        """
        return cls(
            id=data['id'],
            name=data['name'],
            description=data.get('description', ''),
            status=data['status'],
            owner_user_id=data['owner_user_id'],
            created_at=data['created_at'],
            updated_at=data['updated_at'],
            access_type=data.get('access_type')
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert Project instance to dictionary.
        
        Returns:
            dict: Project data dictionary
        """
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'owner_user_id': self.owner_user_id,
            'created_at': self.created_at.isoformat() if hasattr(self.created_at, 'isoformat') else self.created_at,
            'updated_at': self.updated_at.isoformat() if hasattr(self.updated_at, 'isoformat') else self.updated_at,
            'access_type': self.access_type
        }
    
    @property
    def is_live(self) -> bool:
        """Check if project is live.
        
        Returns:
            bool: True if project is live
        """
        return self.status == 'Live'
    
    @property
    def is_draft(self) -> bool:
        """Check if project is in draft.
        
        Returns:
            bool: True if project is in draft
        """
        return self.status == 'In Draft'
    
    @property
    def is_deleted(self) -> bool:
        """Check if project is deleted.
        
        Returns:
            bool: True if project is deleted
        """
        return self.status == 'Deleted'
    
    def can_edit(self, access_type: str) -> bool:
        """Check if given access type can edit project.
        
        Args:
            access_type: User's access type
            
        Returns:
            bool: True if user can edit project
        """
        return access_type in ['owner', 'co_owner']
    
    def can_share(self, access_type: str) -> bool:
        """Check if given access type can share project.
        
        Args:
            access_type: User's access type
            
        Returns:
            bool: True if user can share project
        """
        return access_type in ['owner', 'co_owner', 'editor']
    
    def can_view(self, access_type: str) -> bool:
        """Check if given access type can view project.
        
        Args:
            access_type: User's access type
            
        Returns:
            bool: True if user can view project
        """
        return access_type in ['owner', 'co_owner', 'editor', 'viewer'] 