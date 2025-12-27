import logging
from typing import Dict, Any, List

from .powerbi_generators import PowerBIDocumentationGenerator

logger = logging.getLogger(__name__)

class PowerBIPbixService:
    """
    Service for generating improvement recommendations for Power BI diagnostics.
    """
    
    def __init__(self, ai_client_instance: Any):
        """
        Initializes the service with a dependency-injected AI client instance.
        
        Args:
            ai_client_instance: An instance of the AIClient class.
        """
        self.generator = PowerBIDocumentationGenerator(ai_client_instance)

    def _prepare_context_from_summaries(self, summaries: Dict) -> Dict:
        """Prepares the summaries into a structured context for the AI."""
        semantic_model = summaries.get('semantic_model_summary', {})
        power_query = summaries.get('power_query_summary', {})
        visuals = summaries.get('visuals_summary', {})
        
        return {
            "report": {
                "visuals": visuals.get('visuals', []),
                "pages": visuals.get('pages', []),
                "bookmarks": visuals.get('bookmarks', []),
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
        into a flat list format that is used in the context passed to AI prompts for improvement recommendations.
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
    
    def parse_improvement_recommendations_from_summaries(self, summaries: Dict, file_uri: str = None) -> tuple[List[Dict], dict]:
        """Parse improvement recommendations from summaries."""
        try:
            logger.info("Parsing improvement recommendations from summaries")
            
            context = self._prepare_context_from_summaries(summaries)
            
            # Generate the recommendations text
            recommendations_text, token_usage = self.generator.generate_improvement_recommendations(context, '', file_uri)
            
            # Parse the recommendations
            parsed_recommendations = self.generator.parse_improvement_recommendations(recommendations_text)
            return parsed_recommendations, token_usage
            
        except Exception as e:
            logger.error(f"Error parsing improvement recommendations from summaries: {str(e)}", exc_info=True)
            raise
    
    


