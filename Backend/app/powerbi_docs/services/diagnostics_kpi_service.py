import logging
import re
from typing import Dict, Any, Set, List

logger = logging.getLogger(__name__)


class DiagnosticsKPIService:
    """
    Service for calculating diagnostic KPIs from Power BI file summaries.
    """
    
    @staticmethod
    def calculate_kpis(summaries: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate diagnostic KPIs from file summaries.
        
        Args:
            summaries: Dictionary containing semantic_model_summary, visuals_summary, rls_summary
            
        Returns:
            Dictionary with all calculated KPIs
        """
        try:
            semantic_model = summaries.get('semantic_model_summary', {})
            visuals_summary = summaries.get('visuals_summary', {})
            
            # Extract data structures
            tables = semantic_model.get('tables', [])
            relationships = semantic_model.get('relationships', [])
            visuals = visuals_summary.get('visuals', [])
            
            # Get all measures and columns
            all_measures = DiagnosticsKPIService._extract_all_measures(tables)
            all_columns = DiagnosticsKPIService._extract_all_columns(tables)
            
            # Get fields used in visuals
            fields_used_in_visuals = DiagnosticsKPIService._extract_fields_from_visuals(visuals)
            
            # Calculate unused measures
            unused_measures = DiagnosticsKPIService._find_unused_measures(
                all_measures, 
                fields_used_in_visuals,
                tables
            )
            
            # Calculate unused columns
            unused_columns = DiagnosticsKPIService._find_unused_columns(
                all_columns,
                fields_used_in_visuals,
                all_measures,
                relationships
            )
            
            # Find inactive relationships
            inactive_relationships = DiagnosticsKPIService._find_inactive_relationships(relationships)
            
            # Find large tables
            large_tables = DiagnosticsKPIService._find_large_tables(tables)
            
            # Find complex measures
            complex_measures = DiagnosticsKPIService._find_complex_measures(all_measures)
            
            # Find crowded pages
            pages = visuals_summary.get('pages', [])
            crowded_pages = DiagnosticsKPIService._find_crowded_pages(pages)
            
            # Find many-to-many relationships
            many_to_many_relationships = DiagnosticsKPIService._find_many_to_many_relationships(relationships)
            
            # Calculate totals
            total_measures = len(all_measures)
            total_columns = len(all_columns)
            total_visuals = visuals_summary.get('total_visuals', len(visuals))
            total_tables = semantic_model.get('total_tables', len(tables))
            total_relationships = semantic_model.get('total_relationships', len(relationships))
            
            return {
                'unused_measures': {
                    'count': len(unused_measures),
                    'items': unused_measures
                },
                'unused_columns': {
                    'count': len(unused_columns),
                    'items': unused_columns
                },
                'total_measures': total_measures,
                'total_columns': total_columns,
                'total_visuals': total_visuals,
                'total_tables': total_tables,
                'total_relationships': total_relationships,
                'inactive_relationships': {
                    'count': len(inactive_relationships),
                    'items': inactive_relationships
                },
                'large_tables': {
                    'count': len(large_tables),
                    'items': large_tables
                },
                'complex_measures': {
                    'count': len(complex_measures),
                    'items': complex_measures
                },
                'crowded_pages': {
                    'count': len(crowded_pages),
                    'items': crowded_pages
                },
                'many_to_many_relationships': {
                    'count': len(many_to_many_relationships),
                    'items': many_to_many_relationships
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating KPIs: {e}", exc_info=True)
            raise
    
    @staticmethod
    def _extract_all_measures(tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract all measures from all tables."""
        measures = []
        for table in tables:
            table_name = table.get('name', '')
            table_measures = table.get('measures', [])
            for measure in table_measures:
                measures.append({
                    'name': measure.get('name', ''),
                    'table': table_name,
                    'expression': measure.get('expression', ''),
                    'full_name': f"{table_name}[{measure.get('name', '')}]" if table_name else measure.get('name', '')
                })
        return measures
    
    @staticmethod
    def _extract_all_columns(tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract all columns from all tables."""
        columns = []
        for table in tables:
            table_name = table.get('name', '')
            table_columns = table.get('columns', [])
            for column in table_columns:
                columns.append({
                    'name': column.get('name', ''),
                    'table': table_name,
                    'data_type': column.get('data_type', 'Unknown'),
                    'full_name': f"{table_name}[{column.get('name', '')}]" if table_name else column.get('name', '')
                })
        return columns
    
    @staticmethod
    def _extract_fields_from_visuals(visuals: List[Dict[str, Any]]) -> Set[str]:
        """Extract all field names used in visuals."""
        fields = set()
        for visual in visuals:
            fields_used = visual.get('fields_used', {})
            all_fields = visual.get('all_fields', [])
            
            # Add all fields from the flattened list
            if isinstance(all_fields, list):
                for field in all_fields:
                    if field:
                        fields.add(str(field).strip())
            
            # Also check fields_used dictionary
            if isinstance(fields_used, dict):
                for role, role_fields in fields_used.items():
                    if isinstance(role_fields, list):
                        for field in role_fields:
                            if field:
                                fields.add(str(field).strip())
                    elif role_fields:
                        fields.add(str(role_fields).strip())
        
        return fields
    
    @staticmethod
    def _find_unused_measures(
        all_measures: List[Dict[str, Any]], 
        fields_used_in_visuals: Set[str],
        tables: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Find measures that are not used in visuals and not referenced by other measures."""
        unused = []
        
        # Create a map of measure names for quick lookup
        measure_map = {m['full_name']: m for m in all_measures}
        measure_names = {m['name']: m for m in all_measures}
        
        for measure in all_measures:
            measure_name = measure['name']
            measure_full_name = measure['full_name']
            
            # Check if used in visuals
            used_in_visual = False
            for field in fields_used_in_visuals:
                # Check if field matches measure name or full name
                if (field == measure_name or 
                    field == measure_full_name or
                    field.endswith(f"[{measure_name}]") or
                    field == f"'{measure['table']}'[{measure_name}]"):
                    used_in_visual = True
                    break
            
            if used_in_visual:
                continue
            
            # Check if referenced by other measures
            referenced_by_other = False
            measure_expression = measure.get('expression', '')
            
            # Check if this measure is referenced in other measure expressions
            for other_measure in all_measures:
                if other_measure['name'] == measure_name:
                    continue
                
                other_expression = other_measure.get('expression', '')
                if DiagnosticsKPIService._is_measure_referenced(measure_name, measure_full_name, other_expression):
                    referenced_by_other = True
                    break
            
            if not referenced_by_other:
                unused.append({
                    'name': measure_name,
                    'table': measure['table'],
                    'full_name': measure_full_name
                })
        
        return unused
    
    @staticmethod
    def _is_measure_referenced(measure_name: str, measure_full_name: str, expression: str) -> bool:
        """Check if a measure is referenced in an expression."""
        if not expression:
            return False
        
        expression_lower = expression.lower()
        measure_name_lower = measure_name.lower()
        
        # Pattern 1: [MeasureName] or 'Table'[MeasureName]
        pattern1 = rf'\[{re.escape(measure_name)}\](?!\s*=)'
        if re.search(pattern1, expression, re.IGNORECASE):
            return True
        
        # Pattern 2: MeasureName (standalone, not part of another word)
        pattern2 = rf'\b{re.escape(measure_name)}\b'
        if re.search(pattern2, expression_lower):
            return True
        
        # Pattern 3: Full name format 'Table'[MeasureName]
        if measure_full_name and measure_full_name in expression:
            return True
        
        return False
    
    @staticmethod
    def _find_unused_columns(
        all_columns: List[Dict[str, Any]],
        fields_used_in_visuals: Set[str],
        all_measures: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Find columns that are not used in visuals, not referenced in measure expressions, and not part of relationships."""
        unused = []
        
        for column in all_columns:
            column_name = column['name']
            column_full_name = column['full_name']
            
            # Check if used in visuals
            used_in_visual = False
            for field in fields_used_in_visuals:
                if (field == column_name or 
                    field == column_full_name or
                    field.endswith(f"[{column_name}]") or
                    field == f"'{column['table']}'[{column_name}]"):
                    used_in_visual = True
                    break
            
            if used_in_visual:
                continue
            
            # Check if referenced in any measure expression
            used_in_measure = False
            for measure in all_measures:
                expression = measure.get('expression', '')
                if DiagnosticsKPIService._is_column_referenced(column_name, column_full_name, expression):
                    used_in_measure = True
                    break
            
            if used_in_measure:
                continue
            
            # Check if part of a relationship
            used_in_relationship = DiagnosticsKPIService._is_column_in_relationship(
                column_name,
                column['table'],
                relationships
            )
            
            if not used_in_relationship:
                unused.append({
                    'name': column_name,
                    'table': column['table'],
                    'data_type': column.get('data_type', 'Unknown'),
                    'full_name': column_full_name
                })
        
        return unused
    
    @staticmethod
    def _is_column_referenced(column_name: str, column_full_name: str, expression: str) -> bool:
        """Check if a column is referenced in an expression."""
        if not expression:
            return False
        
        expression_lower = expression.lower()
        column_name_lower = column_name.lower()
        
        # Pattern 1: [ColumnName] or 'Table'[ColumnName]
        pattern1 = rf'\[{re.escape(column_name)}\](?!\s*=)'
        if re.search(pattern1, expression, re.IGNORECASE):
            return True
        
        # Pattern 2: ColumnName (standalone, not part of another word)
        pattern2 = rf'\b{re.escape(column_name)}\b'
        if re.search(pattern2, expression_lower):
            return True
        
        # Pattern 3: Full name format 'Table'[ColumnName]
        if column_full_name and column_full_name in expression:
            return True
        
        return False
    
    @staticmethod
    def _is_column_in_relationship(column_name: str, table_name: str, relationships: List[Dict[str, Any]]) -> bool:
        """Check if a column is part of any relationship."""
        for rel in relationships:
            from_table = rel.get('from_table', '')
            from_column = rel.get('from_column', '')
            to_table = rel.get('to_table', '')
            to_column = rel.get('to_column', '')
            
            # Check if column matches from_column in the relationship
            if from_table == table_name and from_column == column_name:
                return True
            
            # Check if column matches to_column in the relationship
            if to_table == table_name and to_column == column_name:
                return True
        
        return False
    
    @staticmethod
    def _find_inactive_relationships(relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find relationships that are marked as inactive."""
        inactive = []
        for rel in relationships:
            is_active = rel.get('is_active', True)
            if not is_active:
                inactive.append({
                    'from_table': rel.get('from_table', ''),
                    'from_column': rel.get('from_column', ''),
                    'to_table': rel.get('to_table', ''),
                    'to_column': rel.get('to_column', '')
                })
        return inactive
    
    @staticmethod
    def _find_large_tables(tables: List[Dict[str, Any]], threshold: int = 50) -> List[Dict[str, Any]]:
        """Find tables with more than the threshold number of columns."""
        large_tables = []
        for table in tables:
            table_name = table.get('name', '')
            columns = table.get('columns', [])
            column_count = len(columns)
            
            if column_count > threshold:
                large_tables.append({
                    'name': table_name,
                    'column_count': column_count
                })
        return large_tables
    
    @staticmethod
    def _find_complex_measures(all_measures: List[Dict[str, Any]], threshold: int = 1000) -> List[Dict[str, Any]]:
        """Find measures with expressions longer than the threshold (length check only)."""
        complex_measures = []
        for measure in all_measures:
            expression = measure.get('expression', '')
            expression_length = len(expression) if expression else 0
            
            if expression_length > threshold:
                complex_measures.append({
                    'name': measure.get('name', ''),
                    'table': measure.get('table', ''),
                    'full_name': measure.get('full_name', ''),
                    'expression_length': expression_length
                })
        return complex_measures
    
    @staticmethod
    def _find_crowded_pages(pages: List[Dict[str, Any]], threshold: int = 10) -> List[Dict[str, Any]]:
        """Find pages with more than the threshold number of visuals."""
        crowded_pages = []
        for page in pages:
            page_name = page.get('name', 'Unknown')
            visual_count = page.get('visual_count', 0)
            
            if visual_count > threshold:
                crowded_pages.append({
                    'name': page_name,
                    'visual_count': visual_count
                })
        return crowded_pages
    
    @staticmethod
    def _find_many_to_many_relationships(relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find relationships with many-to-many cardinality."""
        many_to_many = []
        for rel in relationships:
            # Check for combined cardinality field (format: "M:M" or "Many-to-Many")
            cardinality = rel.get('cardinality', '').lower()
            from_cardinality = rel.get('from_cardinality', '').lower()
            to_cardinality = rel.get('to_cardinality', '').lower()
            
            # Check if it's many-to-many
            is_many_to_many = False
            
            # Check combined cardinality field
            if cardinality:
                if cardinality == 'm:m' or 'many' in cardinality and cardinality.count('many') == 2:
                    is_many_to_many = True
            
            # Check separate cardinality fields
            if not is_many_to_many and from_cardinality and to_cardinality:
                if (from_cardinality == 'm' or from_cardinality == 'many') and (to_cardinality == 'm' or to_cardinality == 'many'):
                    is_many_to_many = True
            
            if is_many_to_many:
                many_to_many.append({
                    'from_table': rel.get('from_table', ''),
                    'from_column': rel.get('from_column', ''),
                    'to_table': rel.get('to_table', ''),
                    'to_column': rel.get('to_column', ''),
                    'cardinality': rel.get('cardinality', f"{rel.get('from_cardinality', '')}:{rel.get('to_cardinality', '')}")
                })
        return many_to_many


# Create singleton instance
diagnostics_kpi_service = DiagnosticsKPIService()

