from sqlalchemy import Column, Integer, Text, DateTime, MetaData, PrimaryKeyConstraint, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class PowerBIChatTokenUsage(Base):
    __tablename__ = 'powerbi_chat_token_usage'
    
    __table_args__ = (
        PrimaryKeyConstraint('id', name='powerbi_chat_token_usage_pkey'),
        UniqueConstraint('user_ms_object_id', name='powerbi_chat_token_usage_user_ms_object_id_key')
    )

    id = Column(Integer, primary_key=True)
    user_ms_object_id = Column(Text, unique=True, nullable=False)
    total_queries = Column(Integer, default=0)
    context_analysis_input_tokens = Column(Integer, default=0)
    context_analysis_output_tokens = Column(Integer, default=0)
    context_analysis_overhead_tokens = Column(Integer, default=0)
    final_response_input_tokens = Column(Integer, default=0)
    final_response_output_tokens = Column(Integer, default=0)
    final_response_overhead_tokens = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<PowerBIChatTokenUsage(id={self.id}, user_ms_object_id='{self.user_ms_object_id}', total_queries={self.total_queries})>"
    
    def to_dict(self):
        """Convert model instance to dictionary for easy serialization."""
        return {
            'id': self.id,
            'user_ms_object_id': self.user_ms_object_id,
            'total_queries': self.total_queries,
            'context_analysis_input_tokens': self.context_analysis_input_tokens,
            'context_analysis_output_tokens': self.context_analysis_output_tokens,
            'context_analysis_overhead_tokens': self.context_analysis_overhead_tokens,
            'final_response_input_tokens': self.final_response_input_tokens,
            'final_response_output_tokens': self.final_response_output_tokens,
            'final_response_overhead_tokens': self.final_response_overhead_tokens,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
