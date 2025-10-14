# app/powerbi_chat/services/llm_service.py

import logging
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
import google.generativeai as genai
from app.config.settings import config

logger = logging.getLogger(__name__)

class LLMService:
    """Manages the initialization and access to LLM and embedding models."""
    
    def __init__(self):
        if not config.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY not configured")
        
        # Configure the Google Generative AI library
        genai.configure(api_key=config.GOOGLE_API_KEY)
        
        self.embedding_model = self._initialize_embedding_model()
        self.llm = self._initialize_llm()
        self.direct_model = genai.GenerativeModel(config.RAG_LLM_MODEL)
        logger.info("LLMService initialized successfully.")

    def _initialize_model(self, model_class, model_name: str, **kwargs):
        """Helper to initialize a model with fallback for name format."""
        prefixed_name = f"models/{model_name}" if not model_name.startswith('models/') else model_name
            
        try:
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
            temperature=0.1,
            convert_system_message_to_human=True
        )

    def log_token_usage(self, response, operation: str, input_length: int = None):
        """Log token usage information for Gemini API calls."""
        try:
            output_length = len(str(response.content)) if hasattr(response, 'content') else 0
            
            # Check multiple possible locations for token usage data
            token_usage = None
            if hasattr(response, 'response_metadata') and 'usage_metadata' in response.response_metadata:
                token_usage = response.response_metadata['usage_metadata']
            elif hasattr(response, 'usage_metadata'):
                token_usage = response.usage_metadata
            
            if token_usage:
                # Extract token counts directly from the UsageMetadata object
                try:
                    input_tokens = getattr(token_usage, 'prompt_token_count', 0)
                    output_tokens = getattr(token_usage, 'candidates_token_count', 0)
                    total_tokens = getattr(token_usage, 'total_token_count', 0)
                    
                    # Calculate overhead tokens
                    overhead_tokens = total_tokens - (input_tokens + output_tokens)
                    
                    # Log simplified token usage with overhead
                    if overhead_tokens > 0:
                        logger.info(f"🔢 {operation}: {total_tokens} tokens ({input_tokens} input + {output_tokens} output + {overhead_tokens} overhead)")
                    else:
                        logger.info(f"🔢 {operation}: {total_tokens} tokens ({input_tokens} input + {output_tokens} output)")
                    
                    return {
                        'operation': operation,
                        'input_tokens': input_tokens,
                        'output_tokens': output_tokens,
                        'total_tokens': total_tokens,  # Use actual total from API
                        'overhead_tokens': overhead_tokens,
                        'input_length_chars': input_length or 0,
                        'output_length_chars': output_length
                    }
                except Exception as e:
                    logger.warning(f"Failed to extract token counts: {e}")
                    return None
            else:
                logger.info(f"📊 {operation}: No token data - {input_length or 0} chars input, {output_length} chars output")
                return None
        except Exception as e:
            logger.warning(f"Failed to log token usage for {operation}: {e}")
            return None

    def invoke_with_logging(self, prompt: str, operation: str = "llm_call", token_tracker=None):
        """Invoke LLM with token usage logging."""
        input_length = len(prompt)
        
        # Use direct model for better token usage tracking
        try:
            raw_response = self.direct_model.generate_content(prompt)
            
            # Create a mock response object that matches the expected format
            class MockResponse:
                def __init__(self, content, usage_metadata=None):
                    self.content = content
                    self.usage_metadata = usage_metadata
                    self.response_metadata = {'usage_metadata': usage_metadata} if usage_metadata else {}
            
            response = MockResponse(raw_response.text, getattr(raw_response, 'usage_metadata', None))
            
        except Exception as e:
            # Fallback to regular invoke
            response = self.llm.invoke(prompt)
        
        token_info = self.log_token_usage(response, operation, input_length)
        
        # Update token tracker if provided and token info is available
        if token_tracker and token_info:
            total_tokens = token_info.get('total_tokens', 0)
            input_tokens = token_info.get('input_tokens', 0)
            output_tokens = token_info.get('output_tokens', 0)
            overhead_tokens = token_info.get('overhead_tokens', 0)
            
            if operation == "context_analysis":
                token_tracker['context_analysis_tokens'] += total_tokens
                token_tracker['context_analysis_input_tokens'] += input_tokens
                token_tracker['context_analysis_output_tokens'] += output_tokens
                token_tracker['context_analysis_overhead_tokens'] += overhead_tokens
            elif operation == "final_response_generation":
                token_tracker['final_response_tokens'] += total_tokens
                token_tracker['final_response_input_tokens'] += input_tokens
                token_tracker['final_response_output_tokens'] += output_tokens
                token_tracker['final_response_overhead_tokens'] += overhead_tokens
        
        return response

# Singleton instance
llm_service = LLMService()