from sqlalchemy import Column, Integer, Text, DateTime, MetaData, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class FavoriteGroup(Base):
    __tablename__ = 'favorite_groups'
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='unique_user_group_name'),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    urls = relationship('FavoriteUrl', back_populates='group', cascade='all, delete-orphan')
    user = relationship('User', back_populates='favorite_groups')

    def __repr__(self):
        return f"<FavoriteGroup(id={self.id}, name='{self.name}', user_id={self.user_id})>"

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'urls_count': len(self.urls)
        } 