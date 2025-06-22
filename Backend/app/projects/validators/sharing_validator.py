"""Project Sharing Validators Module

This module contains validation schemas for project sharing functionality.
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class AccessTypeEnum(str, Enum):
    """Access type enumeration."""
    reader = "reader"
    co_owner = "co_owner"

class ShareLinkSchema(BaseModel):
    """Schema for creating a share link."""
    access_type: AccessTypeEnum = Field(
        default=AccessTypeEnum.reader,
        description="Type of access to grant"
    )
    expiry_hours: Optional[int] = Field(
        default=None,
        ge=1,
        le=720,  # Max 30 days
        description="Hours until link expires"
    )

class ShareLinkExtend(BaseModel):
    """Schema for extending a share link."""
    extension_hours: int = Field(
        default=24,
        ge=1,
        le=720,  # Max 30 days
        description="Hours to extend share link by"
    )
    access_type: Optional[AccessTypeEnum] = Field(
        default=None,
        description="Type of access to extend"
    )

class ShareLinkRevoke(BaseModel):
    """Schema for revoking a share link."""
    revoke_access: bool = Field(
        default=False,
        description="Whether to also revoke access for users who used the link"
    )
    access_type: Optional[AccessTypeEnum] = Field(
        default=None,
        description="Type of access to revoke"
    )
    share_link_id: Optional[int] = Field(
        default=None,
        description="Specific share link ID to revoke"
    ) 