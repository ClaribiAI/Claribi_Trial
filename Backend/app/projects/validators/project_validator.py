"""Project Validator Module

This module contains validation schemas for project operations.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, constr, validator
from app.core.exceptions import ProjectValidationError

# Valid status values
VALID_PROJECT_STATUSES = {'Live', 'In Draft'}
VALID_ACCESS_TYPES = {'read', 'write', 'admin'}
VALID_FILTER_STATUSES = {'Draft', 'Active', 'Archived', 'Deleted'}

class ProjectCreate(BaseModel):
    """Validation schema for project creation."""
    name: constr(min_length=1, max_length=100) = Field(
        ...,
        description="Project name"
    )
    description: Optional[constr(max_length=1000)] = Field(
        None,
        description="Project description"
    )

    @validator('name')
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Project name cannot be empty")
        return v.strip()

class ProjectUpdate(BaseModel):
    """Validation schema for project updates."""
    name: Optional[constr(min_length=1, max_length=100)] = Field(
        None,
        description="Project name"
    )
    description: Optional[constr(max_length=1000)] = Field(
        None,
        description="Project description"
    )

    @validator('name')
    def name_not_empty(cls, v):
        if v is not None and not v.strip():
            raise ValueError("Project name cannot be empty")
        return v.strip() if v else v

class ProjectStatus(BaseModel):
    """Validation schema for project status updates."""
    status: str = Field(
        ...,
        description="Project status"
    )

    @validator('status')
    def status_must_be_valid(cls, v):
        if v not in VALID_PROJECT_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_PROJECT_STATUSES)}")
        return v

class ProjectShare(BaseModel):
    """Validation schema for project sharing."""
    user_ids: List[str] = Field(
        ...,
        description="List of user IDs to share with",
        min_items=1,
        max_items=50
    )
    access_type: str = Field(
        ...,
        description="Access type to grant"
    )
    expiry_date: Optional[datetime] = Field(
        None,
        description="Optional share expiry date"
    )

    @validator('access_type')
    def access_type_must_be_valid(cls, v):
        if v not in VALID_ACCESS_TYPES:
            raise ValueError(f"Access type must be one of: {', '.join(VALID_ACCESS_TYPES)}")
        return v

    @validator('expiry_date')
    def expiry_date_must_be_future(cls, v):
        if v and v < datetime.utcnow():
            raise ValueError("Expiry date must be in the future")
        return v

class ProjectFilter(BaseModel):
    """Validation schema for project filtering."""
    status: Optional[str] = Field(
        None,
        description="Filter by project status"
    )
    search: Optional[constr(max_length=100)] = Field(
        None,
        description="Search term for project name/description"
    )

    @validator('status')
    def status_must_be_valid(cls, v):
        if v is not None and v not in VALID_FILTER_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_FILTER_STATUSES)}")
        return v

def validate_project_data(data: Dict[str, Any], schema_class: BaseModel) -> Dict[str, Any]:
    """Validate project data against a Pydantic schema.
    
    Args:
        data: Data to validate
        schema_class: Pydantic model class to validate against
        
    Returns:
        dict: Validated data
        
    Raises:
        ProjectValidationError: If validation fails
    """
    try:
        validated = schema_class(**data)
        return validated.dict(exclude_unset=True)
    except Exception as e:
        raise ProjectValidationError(str(e))

# Helper functions for common validations
def validate_project_create(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate project creation data."""
    return validate_project_data(data, ProjectCreate)

def validate_project_update(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate project update data."""
    if not data:
        raise ProjectValidationError("No update data provided")
    return validate_project_data(data, ProjectUpdate)

def validate_project_status(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate project status update data."""
    return validate_project_data(data, ProjectStatus) 