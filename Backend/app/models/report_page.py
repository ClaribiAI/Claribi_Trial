from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.project import Base

class ReportPage(Base):
    __tablename__ = 'report_pages'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    report_id = Column(Integer, ForeignKey('reports.id', ondelete='CASCADE'), nullable=False)
    page_name = Column(Text, nullable=False)
    page_description = Column(Text)
    page_url = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    
    # Add relationship
    report = relationship("Report", back_populates="report_pages")
    
    def __repr__(self):
        return f"<ReportPage(id={self.id}, project_id={self.project_id}, page_name='{self.page_name}')>"