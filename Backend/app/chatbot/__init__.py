# Chatbot Module

from flask import Blueprint
from app.chatbot.chatbot_routes import process_chatbot_query

# Create blueprint
chatbot_bp = Blueprint('chatbot', __name__)

# # Import routes to register them with the blueprint
# from app.chatbot.chatbot_routes import *

# Register routes with the blueprint
# The /api prefix is added by the blueprint registration, so don't include it here
chatbot_bp.add_url_rule('/chatbot/query', 'api_chatbot_query', process_chatbot_query, methods=['GET', 'POST', 'OPTIONS'])