from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.models.project import Base
import datetime

class PowerBIFileSummary(Base):
    __tablename__ = 'powerbi_file_summaries'
    
    id = Column(Integer, primary_key=True)
    collection_name = Column(Text, nullable=False, unique=True, index=True)
    filename = Column(Text, nullable=False)
    upload_time = Column(DateTime, nullable=False)
    semantic_model_summary = Column(JSONB, nullable=False)
    power_query_summary = Column(JSONB, nullable=False)
    visuals_summary = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    def __repr__(self):
        return f"<PowerBIFileSummary(id={self.id}, collection_name='{self.collection_name}', filename='{self.filename}')>"
    
    def to_dict(self):
        """Convert the summary to a dictionary for API responses."""
        return {
            'id': self.id,
            'collection_name': self.collection_name,
            'filename': self.filename,
            'upload_time': self.upload_time.isoformat() if self.upload_time else None,
            'semantic_model_summary': self.semantic_model_summary,
            'power_query_summary': self.power_query_summary,
            'visuals_summary': self.visuals_summary,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


