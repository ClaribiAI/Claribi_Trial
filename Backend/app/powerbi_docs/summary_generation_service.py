import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class SummaryGenerationService:
    """
    Service for generating structured summaries from Power BI metadata.
    Creates 3 summary documents: semantic model, power query, and visuals.
    """
    
    @staticmethod
    def generate_summaries_from_metadata(structured_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate 3 summary documents from structured metadata.
        
        Args:
            structured_metadata: The structured metadata from PBIXParsingService
            
        Returns:
            Dictionary containing 3 summary documents
        """
        try:
            logger.info("Generating summaries from structured metadata")
            
            # Generate semantic model summary
            semantic_model_summary = SummaryGenerationService._generate_semantic_model_summary(
                structured_metadata
            )
            
            # Generate power query summary
            power_query_summary = SummaryGenerationService._generate_power_query_summary(
                structured_metadata
            )
            
            # Generate visuals summary
            visuals_summary = SummaryGenerationService._generate_visuals_summary(
                structured_metadata
            )
            
            return {
                'semantic_model_summary': semantic_model_summary,
                'power_query_summary': power_query_summary,
                'visuals_summary': visuals_summary
            }
            
        except Exception as e:
            logger.error(f"Error generating summaries: {str(e)}", exc_info=True)
            raise
    
    @staticmethod
    def _generate_semantic_model_summary(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Generate semantic model summary with tables, columns, measures, and relationships."""
        tables = metadata.get('tables', [])
        relationships = metadata.get('relationships', [])
        
        # Process tables
        tables_summary = []
        for table in tables:
            table_name = table.get('name', 'Unknown')
            columns = table.get('columns', [])
            measures = table.get('measures', [])
            
            # Process columns
            columns_summary = []
            for col in columns:
                columns_summary.append({
                    'name': col.get('name', ''),
                    'data_type': col.get('dataType', 'Unknown'),
                    'is_hidden': col.get('isHidden', False)
                })
            
            # Process measures
            measures_summary = []
            for measure in measures:
                measures_summary.append({
                    'name': measure.get('name', ''),
                    'expression': measure.get('expression', ''),
                    'is_hidden': measure.get('isHidden', False)
                })
            
            tables_summary.append({
                'name': table_name,
                'columns': columns_summary,
                'measures': measures_summary,
                'column_count': len(columns_summary),
                'measure_count': len(measures_summary)
            })
        
        # Process relationships
        relationships_summary = []
        for rel in relationships:
            relationships_summary.append({
                'name': rel.get('name', ''),
                'from_table': rel.get('fromTable', ''),
                'from_column': rel.get('fromColumn', ''),
                'to_table': rel.get('toTable', ''),
                'to_column': rel.get('toColumn', ''),
                'is_active': rel.get('isActive', True),
                'from_cardinality': rel.get('fromCardinality', 'Unknown'),
                'to_cardinality': rel.get('toCardinality', 'Unknown'),
                'cross_filtering_behavior': rel.get('crossFilteringBehavior', 'Unknown')
            })
        
        return {
            'tables': tables_summary,
            'relationships': relationships_summary,
            'total_tables': len(tables_summary),
            'total_columns': sum(t['column_count'] for t in tables_summary),
            'total_measures': sum(t['measure_count'] for t in tables_summary),
            'total_relationships': len(relationships_summary)
        }
    
    @staticmethod
    def _generate_power_query_summary(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Generate power query summary with M code scripts and key transformations."""
        power_query_scripts = metadata.get('power_query_scripts', [])
        
        scripts_summary = []
        for script in power_query_scripts:
            script_name = script.get('name', 'Unknown')
            m_code = script.get('m_code', '')
            source = script.get('source', 'Unknown')
            key_transformations = script.get('key_transformations', [])
            line_count = script.get('line_count', 0)
            
            scripts_summary.append({
                'name': script_name,
                'source': source,
                'm_code': m_code,
                'key_transformations': key_transformations,
                'line_count': line_count,
                'has_m_code': bool(m_code.strip())
            })
        
        return {
            'scripts': scripts_summary,
            'total_scripts': len(scripts_summary),
            'total_lines': sum(s['line_count'] for s in scripts_summary),
            'scripts_with_code': sum(1 for s in scripts_summary if s['has_m_code'])
        }
    
    @staticmethod
    def _generate_visuals_summary(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Generate visuals summary with pages, visual types, and fields used."""
        visuals = metadata.get('visuals', [])
        pages = metadata.get('pages', [])
        
        # Process pages
        pages_summary = []
        for page in pages:
            page_name = page.get('name', 'Unknown')
            visual_count = page.get('visual_count', 0)
            
            # Get visuals for this page
            page_visuals = [v for v in visuals if v.get('section_name') == page_name]
            visual_types = list(set(v.get('visual_type', 'unknown') for v in page_visuals))
            
            # Collect all data sources used in this page
            all_data_sources = []
            for visual in page_visuals:
                all_data_sources.extend(visual.get('data_sources', []))
            unique_data_sources = list(set(all_data_sources))
            
            pages_summary.append({
                'name': page_name,
                'id': page.get('id'),
                'visual_count': visual_count,
                'visual_types': visual_types,
                'data_sources': unique_data_sources
            })
        
        # Process individual visuals
        visuals_summary = []
        for i, visual in enumerate(visuals, 1):
            visual_type = visual.get('visual_type', 'unknown')
            section_name = visual.get('section_name', 'Unknown')
            fields_used = visual.get('fields_used', {})
            data_sources = visual.get('data_sources', [])
            
            # Flatten fields used for easier analysis
            all_fields = []
            for role, fields in fields_used.items():
                if isinstance(fields, list):
                    all_fields.extend(fields)
            
            visuals_summary.append({
                'index': i,
                'visual_type': visual_type,
                'page_name': section_name,
                'fields_used': fields_used,
                'all_fields': all_fields,
                'data_sources': data_sources,
                'field_count': len(all_fields)
            })
        
        # Generate summary statistics
        all_visual_types = list(set(v['visual_type'] for v in visuals_summary))
        all_data_sources = []
        for visual in visuals_summary:
            all_data_sources.extend(visual['data_sources'])
        unique_data_sources = list(set(all_data_sources))
        
        return {
            'pages': pages_summary,
            'visuals': visuals_summary,
            'total_pages': len(pages_summary),
            'total_visuals': len(visuals_summary),
            'visual_types': all_visual_types,
            'data_sources': unique_data_sources,
            'total_data_sources': len(unique_data_sources)
        }


