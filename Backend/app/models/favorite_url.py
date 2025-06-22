from sqlalchemy import Column, Integer, Text, DateTime, MetaData, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class FavoriteUrl(Base):
    __tablename__ = 'favorite_urls'

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey('favorite_groups.id', ondelete='CASCADE'), nullable=False)
    url = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    filters = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    group = relationship('FavoriteGroup', back_populates='urls')

    def __repr__(self):
        return f"<FavoriteUrl(id={self.id}, title='{self.title}', group_id={self.group_id})>"

    def to_dict(self):
        return {
            'id': self.id,
            'url': self.url,
            'title': self.title,
            'filters': self.filters,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'group_id': self.group_id
        } 