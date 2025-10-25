from sqlalchemy import Column, Integer, Text, DateTime, MetaData, PrimaryKeyConstraint, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class PowerBIDocsTokenUsage(Base):
    __tablename__ = 'powerbi_docs_token_usage'
    
    __table_args__ = (
        PrimaryKeyConstraint('id', name='powerbi_docs_token_usage_pkey'),
        UniqueConstraint('user_ms_object_id', 'collection_name', 'section', name='powerbi_docs_token_usage_user_collection_section_key')
    )

    id = Column(Integer, primary_key=True)
    user_ms_object_id = Column(Text, nullable=False)
    collection_name = Column(Text, nullable=False)
    section = Column(Text, nullable=False)
    generation_count = Column(Integer, default=0)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<PowerBIDocsTokenUsage(id={self.id}, user_ms_object_id='{self.user_ms_object_id}', collection_name='{self.collection_name}', section='{self.section}', generation_count={self.generation_count})>"
    
    def to_dict(self):
        """Convert model instance to dictionary for easy serialization."""
        return {
            'id': self.id,
            'user_ms_object_id': self.user_ms_object_id,
            'collection_name': self.collection_name,
            'section': self.section,
            'generation_count': self.generation_count,
            'input_tokens': self.input_tokens,
            'output_tokens': self.output_tokens,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
