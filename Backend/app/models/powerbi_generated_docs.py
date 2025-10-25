from sqlalchemy import Column, Integer, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from app.models.project import Base
import datetime

class PowerBIGeneratedDoc(Base):
    __tablename__ = 'powerbi_generated_docs'
    
    id = Column(Integer, primary_key=True)
    collection_name = Column(Text, nullable=False, index=True)
    section_name = Column(Text, nullable=False, index=True)
    generated_content = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def __repr__(self):
        return f"<PowerBIGeneratedDoc(id={self.id}, collection_name='{self.collection_name}', section_name='{self.section_name}')>"
    
    def to_dict(self):
        """Convert the generated doc to a dictionary for API responses."""
        return {
            'id': self.id,
            'collection_name': self.collection_name,
            'section_name': self.section_name,
            'generated_content': self.generated_content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
