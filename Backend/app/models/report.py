from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.project import Base

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
    
    def __repr__(self):
        return f"<Report(id={self.id}, project_id={self.project_id}, name='{self.name}')>"