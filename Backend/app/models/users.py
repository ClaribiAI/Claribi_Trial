from sqlalchemy import Column, Integer, Text, DateTime, MetaData, PrimaryKeyConstraint, UniqueConstraint, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime  
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class User(Base):
    __tablename__ = 'users'
    
    __table_args__ = (
        PrimaryKeyConstraint('id', name='users_pkey'),
        UniqueConstraint('ms_object_id', name='users_ms_object_id_key')
    )

    id = Column(Integer, primary_key=True)
    ms_object_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    organization_id = Column(Text, nullable=False)
    display_id = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)  

    # Use string reference to avoid circular imports
    projects = relationship("Project", back_populates='owner_user')
    favorite_groups = relationship("FavoriteGroup", back_populates='user', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<User(id={self.id}, ms_object_id='{self.ms_object_id}', organization_id='{self.organization_id}')>"
