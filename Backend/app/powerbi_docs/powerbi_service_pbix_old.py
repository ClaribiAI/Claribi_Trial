import os
import logging
import google.generativeai as genai
from typing import Dict, List, Optional
import pandas as pd

from .pbixray import PBIXRay
from .powerbi_generators_old import PowerBIDocumentationGenerator

# Configure logger
logger = logging.getLogger(__name__)

class PowerBIPbixService:
    """Main PowerBI Documentation Service - Using pbixray for .pbix file processing"""
    
    def __init__(self, gemini_api_key: str):
        genai.configure(api_key=gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.chat = self.model.start_chat(history=[])
        
        # Initialize generator
        self.generator = PowerBIDocumentationGenerator(self.chat)

    def analyze_pbix_file(self, pbix_file_path: str) -> Dict:
        """Analyze a .pbix file using pbixray"""
        try:
            logger.info(f"Starting analysis of PowerBI .pbix file: {pbix_file_path}")

            # Validate file exists and is a .pbix file
            if not os.path.exists(pbix_file_path):
                raise FileNotFoundError(f"PBIX file not found: {pbix_file_path}")
            
            if not pbix_file_path.lower().endswith('.pbix'):
                raise ValueError(f"File must be a .pbix file: {pbix_file_path}")

            # Extract data using pbixray
            pbix_data = self._extract_pbix_data(pbix_file_path)
            
            # Generate AI documentation
            documentation = self._generate_documentation(pbix_data)
            
            # Get extraction summary for better error reporting
            extraction_summary = self.get_extraction_summary(pbix_data)
            
            return {
                "pbix_data": pbix_data,
                "documentation": documentation,
                "extraction_summary": extraction_summary
            }
        except Exception as e:
            logger.error(f"Error in analyze_pbix_file: {str(e)}", exc_info=True)
            raise

    def analyze_pbix_section(self, pbix_file_path: str, section: str, custom_instructions: str = '') -> str:
        """Analyze a specific section of a .pbix file"""
        try:
            logger.info(f"Starting PowerBI section analysis for: {section}")
            if custom_instructions:
                logger.info(f"Custom instructions provided: {custom_instructions[:100]}...")
            
            # Extract data using pbixray
            pbix_data = self._extract_pbix_data(pbix_file_path)
            
            # Prepare context for AI
            context = self._prepare_context(pbix_data)
            
            # Generate specific section with custom instructions
            if section == 'executive_summary':
                return self.generator.generate_executive_summary(context, custom_instructions)
            elif section == 'data_model_analysis':
                return self.generator.generate_data_model_analysis(context, custom_instructions)
            elif section == 'visualization_analysis':
                return self.generator.generate_visualization_analysis(context, custom_instructions)
            elif section == 'security_analysis':
                return self.generator.generate_security_analysis(context, custom_instructions)
            elif section == 'improvement_recommendations':
                return self.generator.generate_improvement_recommendations(context, custom_instructions)
            else:
                raise ValueError(f"Unknown section: {section}")
                
        except Exception as e:
            logger.error(f"Error in analyze_pbix_section: {str(e)}", exc_info=True)
            raise

    def parse_improvement_recommendations(self, pbix_file_path: str) -> List[Dict]:
        """Parse improvement recommendations into individual actionable items"""
        try:
            logger.info("Parsing improvement recommendations")
            
            # Generate improvement recommendations first
            recommendations_text = self.analyze_pbix_section(
                pbix_file_path, 
                'improvement_recommendations'
            )
            
            # Parse the recommendations using the generator
            parsed_recommendations = self.generator.parse_improvement_recommendations(recommendations_text)
            
            logger.info(f"Parsed {len(parsed_recommendations)} individual recommendations")
            return parsed_recommendations
            
        except Exception as e:
            logger.error(f"Error parsing improvement recommendations: {str(e)}", exc_info=True)
            raise

    def apply_improvement_recommendation(self, pbix_file_path: str, recommendation_id: str) -> Dict:
        """Apply a specific improvement recommendation and return modified files"""
        try:
            logger.info(f"Applying improvement recommendation: {recommendation_id}")
            
            # First, get the parsed recommendations
            recommendations = self.parse_improvement_recommendations(pbix_file_path)
            
            # Find the specific recommendation
            recommendation = None
            for rec in recommendations:
                if rec['id'] == recommendation_id:
                    recommendation = rec
                    break
            
            if not recommendation:
                raise ValueError(f"Recommendation with ID {recommendation_id} not found")
            
            # Extract data using pbixray
            pbix_data = self._extract_pbix_data(pbix_file_path)
            context = self._prepare_context(pbix_data)
            
            # Apply the recommendation using the generator
            result = self.generator.apply_improvement_recommendation(
                context, 
                recommendation, 
                pbix_file_path
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error applying improvement recommendation: {str(e)}", exc_info=True)
            raise

    def _extract_pbix_data(self, pbix_file_path: str) -> Dict:
        """Extract all relevant data from a .pbix file using pbixray with enhanced error handling"""
        try:
            logger.info(f"Extracting data from PBIX file: {pbix_file_path}")
            
            # Validate file before processing
            file_validation = self._validate_pbix_file(pbix_file_path)
            if not file_validation['is_valid']:
                logger.warning(f"PBIX file validation issues: {file_validation['issues']}")
            
            # Initialize pbixray with error handling
            try:
                pbix_model = PBIXRay(pbix_file_path)
            except Exception as e:
                logger.error(f"Failed to initialize PBIXRay for file {pbix_file_path}: {str(e)}")
                raise Exception(f"Unable to process .pbix file. The file may be corrupted or in an unsupported format. Error: {str(e)}")
            
            # Extract all available data with individual error handling
            pbix_data = {
                "tables": self._extract_tables(pbix_model),
                "statistics": self._extract_statistics(pbix_model),
                "power_query": self._extract_power_query(pbix_model),
                "dax_tables": self._extract_dax_tables(pbix_model),
                "dax_measures": self._extract_dax_measures(pbix_model),
                "dax_columns": self._extract_dax_columns(pbix_model),
                "metadata": self._extract_metadata(pbix_model),
                "relationships": self._extract_relationships(pbix_model),
                "schema": self._extract_schema(pbix_model),
                "size": self._extract_size(pbix_model),
                "m_parameters": self._extract_m_parameters(pbix_model),
                "file_validation": file_validation
            }
            
            logger.info(f"Successfully extracted data from PBIX file")
            logger.info(f"Found {len(pbix_data['tables'])} tables, {len(pbix_data['dax_measures'])} measures, {len(pbix_data['relationships'])} relationships")
            
            return pbix_data
            
        except Exception as e:
            logger.error(f"Error extracting PBIX data: {str(e)}", exc_info=True)
            raise

    def _validate_pbix_file(self, pbix_file_path: str) -> Dict:
        """Validate .pbix file before processing"""
        validation_result = {
            "is_valid": True,
            "issues": [],
            "file_size": 0,
            "file_size_mb": 0
        }
        
        try:
            # Check if file exists
            if not os.path.exists(pbix_file_path):
                validation_result["is_valid"] = False
                validation_result["issues"].append("File does not exist")
                return validation_result
            
            # Check file size
            file_size = os.path.getsize(pbix_file_path)
            validation_result["file_size"] = file_size
            validation_result["file_size_mb"] = file_size / (1024 * 1024)
            
            # Check if file is too small (likely corrupted)
            if file_size < 1024:  # Less than 1KB
                validation_result["is_valid"] = False
                validation_result["issues"].append("File is too small (likely corrupted)")
            
            # Check if file is too large (might cause memory issues)
            if file_size > 500 * 1024 * 1024:  # More than 500MB
                validation_result["issues"].append("File is very large (may cause performance issues)")
            
            # Try to read file header to check if it's a valid .pbix file
            try:
                with open(pbix_file_path, 'rb') as f:
                    # Read first few bytes to check for ZIP header (PBIX files are ZIP archives)
                    header = f.read(4)
                    if header != b'PK\x03\x04':
                        validation_result["is_valid"] = False
                        validation_result["issues"].append("File does not appear to be a valid .pbix file (missing ZIP header)")
            except Exception as e:
                validation_result["is_valid"] = False
                validation_result["issues"].append(f"Cannot read file header: {str(e)}")
            
        except Exception as e:
            validation_result["is_valid"] = False
            validation_result["issues"].append(f"Validation error: {str(e)}")
        
        return validation_result

    def _extract_tables(self, pbix_model: PBIXRay) -> List[Dict]:
        """Extract table information with enhanced error handling and fallback mechanisms"""
        try:
            tables = pbix_model.tables
            if tables is None:
                return []
            
            table_list = []
            successful_extractions = 0
            
            for table_name in tables:
                table_info = self._extract_single_table_with_fallback(pbix_model, table_name)
                if not table_info.get('extraction_failed'):
                    successful_extractions += 1
                table_list.append(table_info)
            
            logger.info(f"Successfully extracted {successful_extractions} out of {len(table_list)} tables")
            
            # Log summary of extraction results
            failed_tables = [t for t in table_list if t.get('extraction_failed')]
            if failed_tables:
                logger.info(f"Failed to extract {len(failed_tables)} tables: {[t['name'] for t in failed_tables]}")
            
            return table_list
        except Exception as e:
            logger.error(f"Error extracting tables: {str(e)}")
            return []

    def _extract_single_table_with_fallback(self, pbix_model: PBIXRay, table_name: str) -> Dict:
        """Extract a single table with multiple fallback strategies"""
        
        # Strategy 1: Try direct table extraction
        try:
            table_df = pbix_model.get_table(table_name)
            
            if table_df is not None and not table_df.empty:
                return {
                    "name": table_name,
                    "columns": list(table_df.columns),
                    "row_count": len(table_df),
                    "sample_data": table_df.head(5).to_dict('records'),
                    "extraction_failed": False,
                    "extraction_method": "direct"
                }
            else:
                return {
                    "name": table_name,
                    "columns": [],
                    "row_count": 0,
                    "sample_data": [],
                    "error": "Table is empty or has no data",
                    "extraction_failed": True,
                    "error_category": "empty_table"
                }
                
        except Exception as e:
            error_msg = str(e)
            
            # Strategy 2: Try to get basic table info from metadata
            try:
                # Try to get table info from DAX tables if available
                dax_tables = pbix_model.dax_tables
                if dax_tables is not None and not dax_tables.empty:
                    table_info = dax_tables[dax_tables['Name'] == table_name]
                    if not table_info.empty:
                        return {
                            "name": table_name,
                            "columns": [],  # We don't have column info from this method
                            "row_count": 0,  # We don't have row count from this method
                            "sample_data": [],
                            "extraction_failed": False,
                            "extraction_method": "dax_metadata",
                            "note": "Table structure available but data extraction failed"
                        }
            except Exception as metadata_error:
                logger.debug(f"Metadata fallback failed for {table_name}: {str(metadata_error)}")
            
            # Strategy 3: Try to get column info from DAX columns
            try:
                dax_columns = pbix_model.dax_columns
                if dax_columns is not None and not dax_columns.empty:
                    table_columns = dax_columns[dax_columns['TableName'] == table_name]
                    if not table_columns.empty:
                        columns = list(table_columns['ColumnName'].unique())
                        return {
                            "name": table_name,
                            "columns": columns,
                            "row_count": 0,  # We don't have row count from this method
                            "sample_data": [],
                            "extraction_failed": False,
                            "extraction_method": "dax_columns",
                            "note": "Column structure available but data extraction failed"
                        }
            except Exception as column_error:
                logger.debug(f"Column fallback failed for {table_name}: {str(column_error)}")
            
            # If all strategies fail, categorize the error and return failure info
            if "validation failed" in error_msg:
                error_category = "data_validation_error"
                logger.warning(f"Data validation error for table {table_name}: {error_msg}")
            elif "Neither dictionary nor hidx found" in error_msg:
                error_category = "missing_dictionary"
                logger.warning(f"Missing dictionary for table {table_name}: {error_msg}")
            else:
                error_category = "general_extraction_error"
                logger.warning(f"General extraction error for table {table_name}: {error_msg}")
            
            return {
                "name": table_name,
                "columns": [],
                "row_count": 0,
                "sample_data": [],
                "error": error_msg,
                "error_category": error_category,
                "extraction_failed": True,
                "extraction_method": "failed"
            }

    def _extract_statistics(self, pbix_model: PBIXRay) -> Dict:
        """Extract statistics information"""
        try:
            stats = pbix_model.statistics
            if stats is None:
                return {}
            
            # Convert to dictionary if it's a DataFrame
            if isinstance(stats, pd.DataFrame):
                return stats.to_dict('records')
            return stats
        except Exception as e:
            logger.error(f"Error extracting statistics: {str(e)}")
            return {}

    def _extract_power_query(self, pbix_model: PBIXRay) -> List[Dict]:
        """Extract Power Query information"""
        try:
            power_query = pbix_model.power_query
            if power_query is None:
                return []
            
            # Convert to dictionary if it's a DataFrame
            if isinstance(power_query, pd.DataFrame):
                return power_query.to_dict('records')
            return power_query
        except Exception as e:
            logger.error(f"Error extracting power query: {str(e)}")
            return []

    def _extract_dax_tables(self, pbix_model: PBIXRay) -> List[Dict]:
        """Extract DAX tables information"""
        try:
            dax_tables = pbix_model.dax_tables
            if dax_tables is None:
                return []
            
            # Convert to dictionary if it's a DataFrame
            if isinstance(dax_tables, pd.DataFrame):
                return dax_tables.to_dict('records')
            return dax_tables
        except Exception as e:
            logger.error(f"Error extracting DAX tables: {str(e)}")
            return []

    def _extract_dax_measures(self, pbix_model: PBIXRay) -> List[Dict]:
        """Extract DAX measures information"""
        try:
            dax_measures = pbix_model.dax_measures
            if dax_measures is None:
                return []
            
            # Convert to dictionary if it's a DataFrame
            if isinstance(dax_measures, pd.DataFrame):
                return dax_measures.to_dict('records')
            return dax_measures
        except Exception as e:
            logger.error(f"Error extracting DAX measures: {str(e)}")
            return []

    def _extract_dax_columns(self, pbix_model: PBIXRay) -> List[Dict]:
        """Extract DAX columns information"""
        try:
            dax_columns = pbix_model.dax_columns
            if dax_columns is None:
                return []
            
            # Convert to dictionary if it's a DataFrame
            if isinstance(dax_columns, pd.DataFrame):
                return dax_columns.to_dict('records')
            return dax_columns
        except Exception as e:
            logger.error(f"Error extracting DAX columns: {str(e)}")
            return []

    def _extract_metadata(self, pbix_model: PBIXRay) -> List[Dict]:
        """Extract metadata information"""
        try:
            metadata = pbix_model.metadata
            if metadata is None:
                return []
            
            # Convert to dictionary if it's a DataFrame
            if isinstance(metadata, pd.DataFrame):
                return metadata.to_dict('records')
            return metadata
        except Exception as e:
            logger.error(f"Error extracting metadata: {str(e)}")
            return []

    def _extract_relationships(self, pbix_model: PBIXRay) -> List[Dict]:
        """Extract relationships information"""
        try:
            relationships = pbix_model.relationships
            if relationships is None:
                return []
            
            # Convert to dictionary if it's a DataFrame
            if isinstance(relationships, pd.DataFrame):
                return relationships.to_dict('records')
            return relationships
        except Exception as e:
            logger.error(f"Error extracting relationships: {str(e)}")
            return []

    def _extract_schema(self, pbix_model: PBIXRay) -> Dict:
        """Extract schema information"""
        try:
            schema = pbix_model.schema
            if schema is None:
                return {}
            
            return schema
        except Exception as e:
            logger.error(f"Error extracting schema: {str(e)}")
            return {}

    def _extract_size(self, pbix_model: PBIXRay) -> Dict:
        """Extract size information"""
        try:
            size = pbix_model.size
            if size is None:
                return {}
            
            return size
        except Exception as e:
            logger.error(f"Error extracting size: {str(e)}")
            return {}

    def _extract_m_parameters(self, pbix_model: PBIXRay) -> List[Dict]:
        """Extract M parameters information"""
        try:
            m_parameters = pbix_model.m_parameters
            if m_parameters is None:
                return []
            
            # Convert to dictionary if it's a DataFrame
            if isinstance(m_parameters, pd.DataFrame):
                return m_parameters.to_dict('records')
            return m_parameters
        except Exception as e:
            logger.error(f"Error extracting M parameters: {str(e)}")
            return []

    def _prepare_context(self, pbix_data: Dict) -> Dict:
        """Prepare context for AI analysis from pbixray data"""
        try:
            # Create context structure that matches what the generators expect
            context = {
                "report": {
                    "visuals": [],  # pbixray doesn't extract visuals, so empty for now
                    "filters": [],  # pbixray doesn't extract filters, so empty for now
                    "themes": []    # pbixray doesn't extract themes, so empty for now
                },
                "model": {
                    "tables": [{
                        "name": t.get("name", ""),
                        "columns": [{"name": col, "type": "string"} for col in t.get("columns", [])],
                        "table_measures": [],
                        "extraction_failed": t.get("extraction_failed", False),
                        "error": t.get("error", ""),
                        "error_category": t.get("error_category", "")
                    } for t in pbix_data.get("tables", [])],
                    "measures": [{
                        "name": m.get("Name", ""),
                        "formula": m.get("Expression", ""),
                        "format": "",
                        "description": ""
                    } for m in pbix_data.get("dax_measures", [])],
                    "relationships": [{
                        "id": f"rel_{i}",
                        "fromTable": r.get("FromTable", ""),
                        "fromColumn": r.get("FromColumn", ""),
                        "toTable": r.get("ToTable", ""),
                        "toColumn": r.get("ToColumn", ""),
                        "cardinality": r.get("Cardinality", ""),
                        "crossFilterDirection": r.get("CrossFilterDirection", ""),
                        "isActive": r.get("IsActive", True)
                    } for i, r in enumerate(pbix_data.get("relationships", []))],
                    "expressions": [{
                        "name": pq.get("Name", ""),
                        "m_code": pq.get("Expression", ""),
                        "queryGroup": "",
                        "annotations": {},
                        "lineageTag": ""
                    } for pq in pbix_data.get("power_query", [])]
                }
            }
            
            return context
            
        except Exception as e:
            logger.error(f"Error preparing context: {str(e)}", exc_info=True)
            raise

    def _generate_documentation(self, pbix_data: Dict) -> Dict:
        """Generate AI documentation using Gemini with specialized sections"""
        try:
            # Prepare context for AI
            context = self._prepare_context(pbix_data)

            logger.info(f"Generating documentation with {len(context['measures'])} measures, {len(context['tables'])} tables, and {len(context['relationships'])} relationships")
            
            # Generate each section separately for more focused analysis
            executive_summary = self.generator.generate_executive_summary(context)
            data_model_analysis = self.generator.generate_data_model_analysis(context)
            visualization_analysis = self.generator.generate_visualization_analysis(context)
            security_analysis = self.generator.generate_security_analysis(context)
            improvement_recommendations = self.generator.generate_improvement_recommendations(context)
            
            return {
                "executive_summary": executive_summary,
                "data_model_analysis": data_model_analysis,
                "visualization_analysis": visualization_analysis,
                "security_analysis": security_analysis,
                "improvement_recommendations": improvement_recommendations,
                "technical_details": context
            }

        except Exception as e:
            logger.error(f"Error generating documentation: {str(e)}", exc_info=True)
            return {
                "error": str(e),
                "executive_summary": "Error generating executive summary",
                "data_model_analysis": "Error generating data model analysis", 
                "visualization_analysis": "Error generating visualization analysis",
                "security_analysis": "Error generating security analysis",
                "improvement_recommendations": "Error generating improvement recommendations",
                "technical_details": {}
            }

    def test_utf8_handling(self) -> str:
        """Test UTF-8 character handling with a sample prompt"""
        try:
            test_prompt = """
            Test UTF-8 character handling with these examples:
            - Spanish: análisis, creación, información
            - French: données, amélioration, très
            - German: Größe, Prüfung, Lösung
            - Special characters: €, £, ¥, ©, ®, ™
            
            Please return these exact characters back to verify they are preserved.
            """
            
            logger.info("Testing UTF-8 character handling")
            response = self.chat.send_message(test_prompt)
            return response.text
            
        except Exception as e:
            logger.error(f"Error testing UTF-8 handling: {str(e)}")
            return f"Error: {str(e)}"

    def get_extraction_summary(self, pbix_data: Dict) -> Dict:
        """Get a summary of data extraction results with error analysis and extraction methods"""
        try:
            tables = pbix_data.get("tables", [])
            successful_tables = [t for t in tables if not t.get("extraction_failed")]
            failed_tables = [t for t in tables if t.get("extraction_failed")]
            
            # Categorize errors
            error_categories = {}
            for table in failed_tables:
                category = table.get("error_category", "unknown")
                if category not in error_categories:
                    error_categories[category] = []
                error_categories[category].append(table["name"])
            
            # Analyze extraction methods used
            extraction_methods = {}
            for table in successful_tables:
                method = table.get("extraction_method", "unknown")
                if method not in extraction_methods:
                    extraction_methods[method] = []
                extraction_methods[method].append(table["name"])
            
            summary = {
                "total_tables": len(tables),
                "successful_extractions": len(successful_tables),
                "failed_extractions": len(failed_tables),
                "success_rate": len(successful_tables) / len(tables) if tables else 0,
                "error_categories": error_categories,
                "extraction_methods": extraction_methods,
                "failed_table_names": [t["name"] for t in failed_tables],
                "successful_table_names": [t["name"] for t in successful_tables]
            }
            
            # Add file validation info if available
            file_validation = pbix_data.get("file_validation", {})
            if file_validation:
                summary["file_validation"] = {
                    "is_valid": file_validation.get("is_valid", True),
                    "file_size_mb": file_validation.get("file_size_mb", 0),
                    "issues": file_validation.get("issues", [])
                }
            
            # Add recommendations based on error types and extraction methods
            recommendations = []
            
            # Error-based recommendations
            if "data_validation_error" in error_categories:
                recommendations.append("Some tables have data validation errors - this may indicate corrupted data in the .pbix file")
            if "missing_dictionary" in error_categories:
                recommendations.append("Some tables are missing dictionary information - this is common with complex PowerBI models")
            if len(failed_tables) > len(successful_tables):
                recommendations.append("Many tables failed to extract - consider using a different .pbix file or contacting support")
            
            # Method-based recommendations
            if "dax_metadata" in extraction_methods or "dax_columns" in extraction_methods:
                recommendations.append("Some tables were extracted using fallback methods - data may be incomplete")
            
            # File validation recommendations
            if file_validation and not file_validation.get("is_valid", True):
                recommendations.append("File validation failed - the .pbix file may be corrupted or in an unsupported format")
            
            summary["recommendations"] = recommendations
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating extraction summary: {str(e)}")
            return {"error": str(e)} 