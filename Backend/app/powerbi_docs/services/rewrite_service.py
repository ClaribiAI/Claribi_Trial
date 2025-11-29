"""
Service for rewriting text selections using AI.
"""

import logging
from typing import Tuple
from app.powerbi_docs.ai_client import ai_client

logger = logging.getLogger(__name__)

class RewriteService:
    """
    Service for rewriting text selections with different styles using AI.
    """
    
    @staticmethod
    def rewrite_text_selection(text: str, rewrite_style: str) -> Tuple[str, dict]:
        """
        Rewrite a text selection in the specified style using AI.
        
        Args:
            text: The text to rewrite
            rewrite_style: One of 'concise', 'professional', or 'casual'
            
        Returns:
            Tuple of (rewritten_text, token_usage_dict)
        """
        # Validate rewrite style
        valid_styles = ['concise', 'professional', 'casual']
        if rewrite_style not in valid_styles:
            raise ValueError(f"Invalid rewrite style. Must be one of: {', '.join(valid_styles)}")
        
        # Build the system instruction
        style_instructions = {
            'concise': 'Rewrite the following text to be more concise and brief while preserving all key information and meaning.',
            'professional': 'Rewrite the following text in a more professional and formal tone while maintaining the same meaning and information.',
            'casual': 'Rewrite the following text in a more casual and conversational tone while maintaining the same meaning and information.'
        }
        
        system_instruction = f"""{style_instructions[rewrite_style]}

CRITICAL INSTRUCTIONS:
- Rewrite ONLY the provided text below
- Do NOT add any additional content, explanations, or metadata
- Do NOT add any prefixes, suffixes, or commentary
- Return ONLY the final rewritten text
- Preserve the meaning and key information
- Keep all technical terms, table names, column names, and measure names exactly as they appear
- Preserve all special characters, accents, and non-English text

FORMATTING GUIDELINES:
1. **Bold for Names**: Use **bold text** (`**Name**`) for all references to Power BI entities (tables, columns, measures) and for individual DAX function names mentioned in prose.
2. **Code Blocks for Formulas**: Reserve `dax` code blocks (```dax...```) **exclusively** for complete, and typically multi-line, DAX formulas or measures.
3. **NEVER** wrap a single function name (e.g., "CALCULATE") in a code block."""

        # Build the user prompt
        user_prompt = f"""Rewrite the following text in the requested style, applying the formatting guidelines provided.

Text to rewrite:
{text}

Return ONLY the rewritten text with appropriate formatting applied."""

        try:
            logger.info(f"Rewriting text selection with style '{rewrite_style}' - Length: {len(text)} chars")
            
            # Call AI client to generate rewritten text
            rewritten_text, token_usage = ai_client.generate_content(
                prompt=user_prompt,
                system_instruction=system_instruction,
                context=f'text_rewrite_{rewrite_style}'
            )
            
            # Clean the response - remove any potential extra content
            rewritten_text = rewritten_text.strip()
            
            # Remove any common prefixes that AI might add
            prefixes_to_remove = [
                "Here's the rewritten text:",
                "Rewritten text:",
                "Here is the rewritten version:",
                "Rewritten version:",
            ]
            for prefix in prefixes_to_remove:
                if rewritten_text.startswith(prefix):
                    rewritten_text = rewritten_text[len(prefix):].strip()
            
            logger.info(f"Text rewrite complete - Original length: {len(text)} chars, Rewritten length: {len(rewritten_text)} chars")
            
            return rewritten_text, token_usage
            
        except Exception as e:
            logger.error(f"Error rewriting text selection: {e}", exc_info=True)
            raise Exception(f"Failed to rewrite text: {str(e)}")

# Create a singleton instance
rewrite_service = RewriteService()

