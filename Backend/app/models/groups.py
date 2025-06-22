from sqlalchemy import Column, Integer, Text, DateTime, MetaData
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class Group(Base):
    __tablename__ = 'groups'
    
    id = Column(Integer, primary_key=True)
    
    # Microsoft AD Group Object ID (GUID)
    ad_group_id = Column(Text, unique=True, nullable=False)
    
    # Microsoft AD Tenant ID (to associate with a specific organization or client)
    organization_id = Column(Text, nullable=False)
    
    # Display identifier (optional), could be the group name or domain identifier
    display_id = Column(Text)
    
    # Timestamp for when the group was created
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Group(id={self.id}, ad_group_id='{self.ad_group_id}', organization_id='{self.organization_id}')>"
