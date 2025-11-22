"""
AI Client Module for stateless content generation with Google Gemini.
"""

import logging
from typing import Optional
import google.generativeai as genai
from app.config.settings import config

logger = logging.getLogger(__name__)

class AIClient:
    """A client for interacting with the Gemini API in a stateless manner."""

    _model = None

    @classmethod
    def _get_model(cls):
        """Initializes and retrieves the singleton Gemini generative model."""
        if cls._model is None:
            try:
                genai.configure(api_key=config.GOOGLE_API_KEY)
                cls._model = genai.GenerativeModel('gemini-2.5-flash-lite')
                logger.info("Gemini 1.5 Flash model initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize AI model: {str(e)}", exc_info=True)
                raise
        return cls._model

    @classmethod
    def generate_content(cls,
                         prompt: str,
                         system_instruction: Optional[str] = None,
                         context: Optional[str] = None) -> tuple[str, dict]:
        """
        Generates content using the stateless Gemini API, incorporating system instructions into the prompt.

        Args:
            prompt: The main user prompt for the model to process.
            system_instruction: Instructions defining the model's role, rules, and persona.
            context: Optional context for logging purposes (e.g., 'executive_summary').

        Returns:
            Tuple of (generated_text, token_usage_dict) where token_usage_dict contains:
            - input_tokens: Number of input tokens used
            - output_tokens: Number of output tokens used
            - total_tokens: Total tokens used
        
        Raises:
            Exception: If the API call for content generation fails.
        """
        try:
            model = cls._get_model()
            context_str = f" [{context}]" if context else ""
            
            # Combine system instruction with user prompt if system instruction is provided
            combined_prompt = prompt
            if system_instruction and system_instruction.strip():
                combined_prompt = f"{system_instruction.strip()}\n\n{prompt}"
            
            response = model.generate_content(combined_prompt)

            # Validate response has text attribute and is not empty
            if not hasattr(response, 'text') or not response.text:
                logger.error(f"AI API returned empty or invalid response{context_str}")
                raise Exception(f"AI content generation returned empty response for context '{context}'.")

            # Log response length to track completeness
            response_length = len(response.text) if response.text else 0
            logger.info(f"Gemini response received{context_str} - Length: {response_length} chars")

            # Extract token usage metadata
            token_usage = {
                'input_tokens': 0,
                'output_tokens': 0,
                'total_tokens': 0
            }

            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                token_usage = {
                    'input_tokens': response.usage_metadata.prompt_token_count or 0,
                    'output_tokens': response.usage_metadata.candidates_token_count or 0,
                    'total_tokens': response.usage_metadata.total_token_count or 0
                }
                logger.info(
                    f"Gemini token usage{context_str} - "
                    f"Input: {token_usage['input_tokens']}, "
                    f"Output: {token_usage['output_tokens']}, "
                    f"Total: {token_usage['total_tokens']}"
                )
            else:
                logger.warning(f"Token usage metadata not available for this response{context_str}.")

            return response.text, token_usage

        except Exception as e:
            logger.error(f"Error during Gemini content generation{context_str}: {str(e)}", exc_info=True)
            raise Exception(f"AI content generation failed for context '{context}'.")

# Create a singleton instance for the application to use.
ai_client = AIClient()