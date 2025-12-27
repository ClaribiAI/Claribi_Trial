import json
import logging
from typing import Dict, Any, List

from .prompts import get_improvement_recommendations_prompt

logger = logging.getLogger(__name__)

class PowerBIDocumentationGenerator:
    """
    Handles AI-powered improvement recommendations generation for Power BI diagnostics.
    This class constructs the prompts and uses a provided AI client to get results.
    """

    def __init__(self, client: Any):
        """
        Initializes the generator with an AI client.
        
        Args:
            client: An instance of an AI client that has a `generate_content` method.
        """
        self.client = client

    def generate_improvement_recommendations(self, context: Dict, custom_instructions: str = '', file_uri: str = None) -> tuple[str, dict]:
        """Generate data model improvement recommendations"""
        try:
            # Format context for JSON serialization
            formatted_context = {
                'model': json.dumps(context['model'], indent=2, ensure_ascii=False),
                'report': json.dumps(context['report'], indent=2, ensure_ascii=False)
            }
            
            system_instruction, user_prompt = get_improvement_recommendations_prompt(formatted_context, custom_instructions, has_formatting_pdf=False)
            
            logger.info("Generating improvement recommendations with simple JSON format")
            content, token_usage = self.client.generate_content(
                prompt=user_prompt,
                system_instruction=system_instruction,
                context='improvement_recommendations',
                file_uri=file_uri
            )
            logger.info(f"Generated 'improvement_recommendations' - Content length: {len(content)} chars")
            return content, token_usage

        except Exception as e:
            logger.error(f"Error generating improvement recommendations: {str(e)}")
            return f"Error generating improvement recommendations: {str(e)}", {'input_tokens': 0, 'output_tokens': 0, 'total_tokens': 0}

    def parse_improvement_recommendations(self, recommendations_text: str) -> List[Dict]:
        """Parse improvement recommendations from JSON text"""
        try:
            logger.info(f"Parsing recommendations JSON of length: {len(recommendations_text)}")
            
            # Clean up the response - remove any markdown formatting if present
            cleaned_text = recommendations_text.strip()
            
            # Remove markdown code blocks if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text.replace('```json', '').replace('```', '').strip()
            elif cleaned_text.startswith('```'):
                cleaned_text = cleaned_text.replace('```', '').strip()
            
            # Parse the JSON directly
            parsed_json = json.loads(cleaned_text)
            
            # Normalize the recommendations
            return self._normalize_recommendations(parsed_json)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            logger.error(f"Failed to parse text: {recommendations_text[:500]}...")
            # Return empty list if parsing fails
            return []
        except Exception as e:
            logger.error(f"Error parsing improvement recommendations: {str(e)}", exc_info=True)
            return []

    def _normalize_recommendations(self, parsed_json: List[Dict]) -> List[Dict]:
        """Normalize parsed JSON array into the internal recommendation format."""
        recommendations: List[Dict] = []
        for i, item in enumerate(parsed_json):
            if not isinstance(item, dict):
                continue
            
            recommendation = {
                'id': f"rec_{i + 1}",
                'category': item.get('category', 'General Improvement'),
                'title': item.get('title', 'Untitled Recommendation'),
                'priority': item.get('priority', 'medium').lower(),
                'complexity': item.get('complexity', 'medium').lower(),
                'description': item.get('description', ''),
                'applicable_files': item.get('applicable_files', ['semantic_model', 'report'])
            }

            if recommendation['title'] and recommendation['description']:
                recommendations.append(recommendation)
        logger.info(f"Parsed {len(recommendations)} recommendations")
        return recommendations




