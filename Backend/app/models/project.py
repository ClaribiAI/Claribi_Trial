from sqlalchemy import Column, Integer, Text, DateTime, MetaData, ForeignKey, ForeignKeyConstraint, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime  # Use the module, not the class

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class Project(Base):
    __tablename__ = 'projects'
    __table_args__ = (
        ForeignKeyConstraint(['owner_user_id'], ['users.id'], ondelete='SET NULL', name='fk_projects_owner_user_id'),
        PrimaryKeyConstraint('id', name='projects_pkey')
    )

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)  # Now using the datetime module
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    owner_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    owner_user = relationship('User', back_populates='projects')
    project_share_links = relationship('ProjectShareLinks', back_populates='project')
    reports = relationship('Report', back_populates='project', cascade='all, delete-orphan')
    project_data = relationship('ProjectData', back_populates='project', cascade='all, delete-orphan')
    share_links = relationship('ProjectShareLink', back_populates='project', cascade='all, delete-orphan')
    query_analytics = relationship('QueryAnalytics', back_populates='project', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', owner_user_id={self.owner_user_id})>"
