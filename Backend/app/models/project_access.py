from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, PrimaryKeyConstraint, UniqueConstraint, MetaData
from sqlalchemy.dialects.postgresql import UUID
import uuid
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy import Enum as SAEnum
from enum import Enum as PyEnum

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class SubjectTypeEnum(PyEnum):
    user = "user"
    group = "group"

class AccessTypeEnum(PyEnum):
    reader = "reader"
    admin = "admin"
    owner = "owner"  # Original owner
    co_owner = "co_owner"  # Added via sharing


class ProjectAccess(Base):
    __tablename__ = 'project_access'

    _table_args__ = (
        PrimaryKeyConstraint('id', name='project_access_pkey'),
        UniqueConstraint('project_id', 'subject_type', 'subject_id', name='uix_project_subject')
    )

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, nullable=False)
    subject_type = Column(SAEnum(SubjectTypeEnum, name='subjecttypeenum'), nullable=False)
    subject_id = Column(UUID(as_uuid=True), nullable=False)
    access_type = Column(SAEnum(AccessTypeEnum, name='accesstypeenum'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ProjectAccess(id={self.id}, project_id={self.project_id}, subject_type='{self.subject_type}', subject_id={self.subject_id}, access_type='{self.access_type}')>"
