from sqlalchemy import Column, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.project import Base

class ProjectData(Base):
    __tablename__ = 'project_data'
    
    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True)
    report_id = Column(Integer, ForeignKey('reports.id', ondelete='CASCADE'), primary_key=True)
    tables_info = Column(JSONB)
    selected_data = Column(JSONB)
    synonyms = Column(JSONB)
    value_rules = Column(JSONB)
    
    # Add relationships
    project = relationship("Project", back_populates="project_data")
    report = relationship("Report", back_populates="project_data")
    
    def __repr__(self):
        return f"<ProjectData(project_id={self.project_id}, report_id={self.report_id})>"