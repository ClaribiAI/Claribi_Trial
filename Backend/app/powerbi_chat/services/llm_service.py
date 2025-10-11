# app/powerbi_chat/services/llm_service.py

import logging
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from app.config.settings import config

logger = logging.getLogger(__name__)

class LLMService:
    """Manages the initialization and access to LLM and embedding models."""
    
    def __init__(self):
        if not config.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY not configured")
        
        self.embedding_model = self._initialize_embedding_model()
        self.llm = self._initialize_llm()
        logger.info("LLMService initialized successfully.")

    def _initialize_model(self, model_class, model_name: str, **kwargs):
        """Helper to initialize a model with fallback for name format."""
        prefixed_name = f"models/{model_name}" if not model_name.startswith('models/') else model_name
            
        try:
            logger.info(f"Initializing model: {prefixed_name}")
            return model_class(model=prefixed_name, google_api_key=config.GOOGLE_API_KEY, **kwargs)
        except Exception as e:
            logger.error(f"Failed to initialize {prefixed_name}: {e}. Trying without prefix.")
            return model_class(model=model_name, google_api_key=config.GOOGLE_API_KEY, **kwargs)

    def _initialize_embedding_model(self) -> GoogleGenerativeAIEmbeddings:
        return self._initialize_model(GoogleGenerativeAIEmbeddings, config.VECTOR_EMBEDDING_MODEL)

    def _initialize_llm(self) -> ChatGoogleGenerativeAI:
        return self._initialize_model(
            ChatGoogleGenerativeAI,
            config.RAG_LLM_MODEL,
            temperature=0.1
        )

# Singleton instance
llm_service = LLMService()