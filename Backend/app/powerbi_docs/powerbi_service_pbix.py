import os
import logging
from typing import Dict, Any, List

from .pbixray import PBIXRay
from .powerbi_generators import PowerBIDocumentationGenerator

logger = logging.getLogger(__name__)

class PowerBIPbixService:
    """
    Main service for Power BI documentation. It uses pbixray to extract data
    from .pbix files and a generator to create AI-powered documentation.
    """
    
    def __init__(self, ai_client_instance: Any):
        """
        Initializes the service with a dependency-injected AI client instance.
        
        Args:
            ai_client_instance: An instance of the AIClient class.
        """
        self.generator = PowerBIDocumentationGenerator(ai_client_instance)

    def analyze_from_summaries(self, summaries: Dict, section: str, custom_instructions: str = '') -> tuple[Any, dict]:
        """Analyzes a specific section using file summaries."""
        try:
            logger.info(f"Starting section analysis for: '{section}' using summaries")
            
            context = self._prepare_context_from_summaries(summaries)
            
            analysis_functions = {
                'executive_summary': self.generator.generate_executive_summary,
                'data_model_analysis': self.generator.generate_data_model_analysis,
                'visualization_analysis': self.generator.generate_visualization_analysis,
                'security_analysis': self.generator.generate_security_analysis,
                'improvement_recommendations': self.generator.generate_improvement_recommendations,
            }

            if section in analysis_functions:
                result, token_usage = analysis_functions[section](context, custom_instructions)
                
                # Special handling for improvement_recommendations - automatically parse them
                if section == 'improvement_recommendations':
                    try:
                        logger.info("Auto-parsing improvement recommendations")
                        parsed_recommendations = self.generator.parse_improvement_recommendations(result)
                        return {
                            'raw_text': result,
                            'recommendations': parsed_recommendations,
                            'count': len(parsed_recommendations)
                        }, token_usage
                    except Exception as parse_error:
                        logger.error(f"Error parsing recommendations: {str(parse_error)}")
                        # Return raw text if parsing fails
                        return {
                            'raw_text': result,
                            'recommendations': [],
                            'count': 0,
                            'parse_error': str(parse_error)
                        }, token_usage
                
                return result, token_usage
            else:
                raise ValueError(f"Unknown or unsupported section: '{section}'")
                
        except Exception as e:
            logger.error(f"Error in analyze_from_summaries '{section}': {str(e)}", exc_info=True)
            raise


    def _prepare_context_from_summaries(self, summaries: Dict) -> Dict:
        """Prepares the summaries into a structured context for the AI."""
        semantic_model = summaries.get('semantic_model_summary', {})
        power_query = summaries.get('power_query_summary', {})
        visuals = summaries.get('visuals_summary', {})
        
        return {
            "report": {
                "visuals": visuals.get('visuals', []),
                "pages": visuals.get('pages', []),
                "filters": [],  # Not available in summaries
                "themes": []    # Not available in summaries
            },
            "model": {
                "tables": semantic_model.get('tables', []),
                "measures": self._extract_measures_from_tables(semantic_model.get('tables', [])),
                "relationships": semantic_model.get('relationships', []),
                "expressions": power_query.get('scripts', []),
                "rls_roles": summaries.get('rls_summary', {}).get('roles', [])
            }
        }
    
    def _extract_measures_from_tables(self, tables: List[Dict]) -> List[Dict]:
        """Extract all measures from tables and format them for the AI context.
        
        This method transforms the nested table structure (where measures are within tables)
        into a flat list format that is used in the context passed to AI prompts.
        The measures are used in data model analysis prompts.
        """
        measures = []
        for table in tables:
            table_measures = table.get('measures', [])
            for measure in table_measures:
                measures.append({
                    'Name': measure.get('name', ''),
                    'Expression': measure.get('expression', ''),
                    'TableName': table.get('name', ''),
                    'IsHidden': measure.get('is_hidden', False)
                })
        return measures
    
    def parse_improvement_recommendations_from_summaries(self, summaries: Dict) -> tuple[List[Dict], dict]:
        """Parse improvement recommendations from summaries."""
        try:
            logger.info("Parsing improvement recommendations from summaries")
            
            context = self._prepare_context_from_summaries(summaries)
            
            # Generate the recommendations text
            recommendations_text, token_usage = self.generator.generate_improvement_recommendations(context)
            
            # Parse the recommendations
            parsed_recommendations = self.generator.parse_improvement_recommendations(recommendations_text)
            return parsed_recommendations, token_usage
            
        except Exception as e:
            logger.error(f"Error parsing improvement recommendations from summaries: {str(e)}", exc_info=True)
            raise
    
    


