"""Report Validators Module

This module contains validation schemas for report operations.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator

class ReportCreate(BaseModel):
    """Validation schema for report creation."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    default_report: bool = Field(False)

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Report name cannot be empty')
        return v.strip()

class ReportUpdate(BaseModel):
    """Validation schema for report updates."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    default_report: Optional[bool] = None

    @validator('name')
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Report name cannot be empty')
        return v.strip() if v else v

class ReportFilter(BaseModel):
    """Validation schema for report filtering."""
    status: Optional[str] = Field(None)
    search: Optional[str] = Field(None)

    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['Live', 'In Draft', 'Deleted']
            if v not in valid_statuses:
                raise ValueError(f'Invalid status. Must be one of: {", ".join(valid_statuses)}')
        return v

def validate_report_create(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate report creation data."""
    return ReportCreate(**data).dict(exclude_unset=True)

def validate_report_update(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate report update data."""
    return ReportUpdate(**data).dict(exclude_unset=True)

def validate_report_filter(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate report filter data."""
    return ReportFilter(**data).dict(exclude_unset=True) 