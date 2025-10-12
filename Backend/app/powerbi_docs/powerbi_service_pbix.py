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

    def analyze_pbix_file(self, pbix_file_path: str) -> Dict:
        """Analyzes a full .pbix file and generates all documentation sections."""
        try:
            logger.info(f"Starting full analysis of PBIX file: {pbix_file_path}")

            if not os.path.exists(pbix_file_path):
                raise FileNotFoundError(f"PBIX file not found: {pbix_file_path}")
            if not pbix_file_path.lower().endswith('.pbix'):
                raise ValueError("File must be a .pbix file.")

            pbix_data = self._extract_pbix_data(pbix_file_path)
            documentation = self._generate_documentation(pbix_data)
            
            return {
                "pbix_data": pbix_data,
                "documentation": documentation,
            }
        except Exception as e:
            logger.error(f"Error in analyze_pbix_file: {str(e)}", exc_info=True)
            raise

    def analyze_pbix_section(self, pbix_file_path: str, section: str, custom_instructions: str = '') -> str:
        """Analyzes a specific section of a .pbix file."""
        try:
            logger.info(f"Starting section analysis for: '{section}'")
            
            pbix_data = self._extract_pbix_data(pbix_file_path)
            context = self._prepare_context(pbix_data)
            
            analysis_functions = {
                'executive_summary': self.generator.generate_executive_summary,
                'data_model_analysis': self.generator.generate_data_model_analysis,
                'visualization_analysis': self.generator.generate_visualization_analysis,
                'security_analysis': self.generator.generate_security_analysis,
                'improvement_recommendations': self.generator.generate_improvement_recommendations,
            }

            if section in analysis_functions:
                result = analysis_functions[section](context, custom_instructions)
                
                # Special handling for improvement_recommendations - automatically parse them
                if section == 'improvement_recommendations':
                    try:
                        logger.info("Auto-parsing improvement recommendations")
                        parsed_recommendations = self.generator.parse_improvement_recommendations(result)
                        return {
                            'raw_text': result,
                            'recommendations': parsed_recommendations,
                            'count': len(parsed_recommendations)
                        }
                    except Exception as parse_error:
                        logger.error(f"Error parsing recommendations: {str(parse_error)}")
                        # Return raw text if parsing fails
                        return {
                            'raw_text': result,
                            'recommendations': [],
                            'count': 0,
                            'parse_error': str(parse_error)
                        }
                
                return result
            else:
                raise ValueError(f"Unknown or unsupported section: '{section}'")
                
        except Exception as e:
            logger.error(f"Error in analyze_pbix_section '{section}': {str(e)}", exc_info=True)
            raise

    def _extract_pbix_data(self, pbix_file_path: str) -> Dict:
        """Extracts key information from a .pbix file using PBIXRay."""
        logger.info(f"Extracting data from {pbix_file_path}")
        pbix_model = PBIXRay(pbix_file_path)
        # In a real scenario, add error handling for each extraction
        return {
            "tables": pbix_model.dax_tables.to_dict('records') if not pbix_model.dax_tables.empty else [],
            "dax_measures": pbix_model.dax_measures.to_dict('records') if not pbix_model.dax_measures.empty else [],
            "relationships": pbix_model.relationships.to_dict('records') if not pbix_model.relationships.empty else [],
            "power_query": pbix_model.power_query.to_dict('records') if not pbix_model.power_query.empty else []
        }

    def _prepare_context(self, pbix_data: Dict) -> Dict:
        """Prepares the extracted data into a structured context for the AI."""
        return {
            "report": {
                "visuals": [], "filters": [], "themes": [] # PBIXRay does not extract visual info
            },
            "model": {
                "tables": pbix_data.get("tables", []),
                "measures": pbix_data.get("dax_measures", []),
                "relationships": pbix_data.get("relationships", []),
                "expressions": pbix_data.get("power_query", [])
            }
        }
    
    def _generate_documentation(self, pbix_data: Dict) -> Dict:
        """Orchestrates the generation of all documentation sections."""
        context = self._prepare_context(pbix_data)
        logger.info("Generating all documentation sections...")

        return {
            "executive_summary": self.generator.generate_executive_summary(context),
            "data_model_analysis": self.generator.generate_data_model_analysis(context),
            "visualization_analysis": self.generator.generate_visualization_analysis(context),
            "security_analysis": self.generator.generate_security_analysis(context),
            "improvement_recommendations": self.generator.generate_improvement_recommendations(context),
        }

    def parse_improvement_recommendations(self, pbix_file_path: str) -> List[Dict]:
        """Parses improvement recommendations from a previously generated recommendations text."""
        try:
            logger.info(f"Parsing improvement recommendations for: {pbix_file_path}")
            
            # First generate the recommendations
            pbix_data = self._extract_pbix_data(pbix_file_path)
            context = self._prepare_context(pbix_data)
            
            # Generate the recommendations text
            recommendations_text = self.generator.generate_improvement_recommendations(context)
            
            # Parse the recommendations
            return self.generator.parse_improvement_recommendations(recommendations_text)
            
        except Exception as e:
            logger.error(f"Error parsing improvement recommendations: {str(e)}", exc_info=True)
            raise

