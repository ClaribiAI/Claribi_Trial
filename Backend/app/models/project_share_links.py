from sqlalchemy import Column, Integer, Text, DateTime, Boolean, MetaData, ForeignKey, ForeignKeyConstraint, PrimaryKeyConstraint, UniqueConstraint, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class ProjectShareLink(Base):
    __tablename__ = 'project_share_links'
    __table_args__ = (
        ForeignKeyConstraint(['created_by_user_id'], ['users.id'], name='project_share_links_created_by_user_id_fkey'),
        ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE', name='project_share_links_project_id_fkey'),
        PrimaryKeyConstraint('id', name='project_share_links_pkey'),
        UniqueConstraint('encrypted_token', name='project_share_links_encrypted_token_key')
    )
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    encrypted_token = Column(Text, unique=True, nullable=False)  # Only store encrypted version of the token
    expires_at = Column(DateTime, nullable=False)  # Making expiration mandatory
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_accessed_at = Column(DateTime, nullable=True)  # Track when the link was last accessed
    access_count = Column(Integer, default=0)  # Track how many times the link was accessed
    
    # Relationships
    created_by_user = relationship('Users', back_populates='project_share_links')
    project = relationship('Projects', back_populates='project_share_links')
    project_share_access_logs = relationship('ProjectShareAccessLogs', back_populates='share_link')

    # Table constraints
    __table_args__ = (
        # Regular basic constraints
        UniqueConstraint('project_id', name='uix_active_project_link'),
    )
    
    # NOTE: The following partial index should be created via a migration:
    # CREATE UNIQUE INDEX uix_active_project_link_partial ON project_share_links (project_id) WHERE is_revoked = false;
    
    def __repr__(self):
        return f"<ProjectShareLinks(id={self.id}, project_id={self.project_id}, encrypted_token='{self.encrypted_token}')>"