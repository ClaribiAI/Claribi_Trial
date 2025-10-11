#!/usr/bin/env python3
"""
Production server runner for Railway deployment.
"""
import os
import logging
from app import create_app

# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Get port from Railway environment variable
port = int(os.environ.get('PORT', 5000))

# Create the Flask app
app = create_app()

# Add health check endpoint for Railway
@app.route('/api/health')
def health_check():
    """Health check endpoint for Railway."""
    return {'status': 'healthy', 'service': 'claribi-backend'}, 200

if __name__ == '__main__':
    # Run the application
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )
