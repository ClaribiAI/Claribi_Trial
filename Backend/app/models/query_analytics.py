from sqlalchemy import Column, Integer, DateTime, MetaData, ForeignKey, ForeignKeyConstraint, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class QueryAnalytics(Base):
    __tablename__ = 'query_analytics'
    __table_args__ = (
        ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE', name='fk_query_analytics_project_id'),
        ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE', name='fk_query_analytics_report_id'),
        PrimaryKeyConstraint('id', name='query_analytics_pkey')
    )

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    report_id = Column(Integer, ForeignKey('reports.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    project = relationship('Project', back_populates='query_analytics')
    report = relationship('Report', back_populates='query_analytics')

    def __repr__(self):
        return f"<QueryAnalytics(id={self.id}, project_id={self.project_id}, report_id={self.report_id})>" 