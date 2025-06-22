from sqlalchemy import Column, Integer, Text, DateTime, Boolean, MetaData, ForeignKey, CheckConstraint, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

# Define metadata
metadata = MetaData()
Base = declarative_base(metadata=metadata)

class ProjectShareAccessLog(Base):
    __tablename__ = 'project_share_access_logs'
    
    id = Column(Integer, primary_key=True)
    share_link_id = Column(Integer, ForeignKey('project_share_links.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Can be null for failed access attempts
    access_granted = Column(Boolean, nullable=False)
    user_agent = Column(Text, nullable=True)
    accessed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)  # For storing additional information or error messages
    attempt_count = Column(Integer, default=1)  # For tracking repeated access attempts
    client_ip = Column(String(45), nullable=True)  # IPv6 addresses can be up to 45 chars
    request_method = Column(String(10), nullable=True)  # HTTP method (GET, POST, etc.)
    request_path = Column(Text, nullable=True)  # Request path
    request_referrer = Column(Text, nullable=True)  # HTTP referrer
    organization_id = Column(Integer, nullable=True)  # Track organization context for compliance
    # Relationships
    share_link = relationship('ProjectShareLinks', back_populates='project_share_access_logs')
    user = relationship('Users', back_populates='project_share_access_logs')
    
    def __repr__(self):
        return f"<ProjectShareAccessLog(id={self.id}, share_link_id={self.share_link_id}, access_granted={self.access_granted})>"
        
    @classmethod
    def create_from_request(cls, share_link_id, user_id, access_granted, notes=None):
        """Factory method to create a log entry from the current request
        
        This provides a convenient way to log access attempts with request details
        
        Args:
            share_link_id: The share link ID
            user_id: The user ID
            access_granted: Whether access was granted
            notes: Additional notes
            
        Returns:
            A new ProjectShareAccessLog instance
        """
        from flask import request, current_app
        import socket
        
        log = cls(
            share_link_id=share_link_id,
            user_id=user_id,
            access_granted=access_granted,
            notes=notes
        )
        
        # Add request details if available
        if request:
            if hasattr(request, 'remote_addr'):
                log.client_ip = request.remote_addr
                
            # Check for proxy headers
            forwarded_for = request.headers.get('X-Forwarded-For')
            if forwarded_for:
                # Use the leftmost IP (original client)
                log.client_ip = forwarded_for.split(',')[0].strip()
                
            if hasattr(request, 'user_agent'):
                log.user_agent = request.user_agent.string
                
            if hasattr(request, 'method'):
                log.request_method = request.method
                
            if hasattr(request, 'path'):
                log.request_path = request.path
                
            if hasattr(request, 'referrer'):
                log.request_referrer = request.referrer
                
        return log