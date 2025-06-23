from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, MetaData
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from app.models.project import Base

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class Report(Base):
    __tablename__ = 'reports'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text)
    default_report = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Add relationships
    project = relationship("Project", back_populates="reports")
    project_data = relationship("ProjectData", back_populates="report")
    report_pages = relationship("ReportPage", back_populates="report", cascade="all, delete-orphan")
    query_analytics = relationship('QueryAnalytics', back_populates='report', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Report(id={self.id}, project_id={self.project_id}, name='{self.name}')>"