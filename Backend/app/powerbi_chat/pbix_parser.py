"""
PBIX Parser Service for RAG Pipeline

This module handles the extraction and chunking of PBIX file metadata
for the RAG (Retrieval-Augmented Generation) pipeline using pbixray.
"""

import os
import json
import logging
from typing import Dict, List, Any
from langchain_core.documents import Document

from app.powerbi_docs.pbixray import PBIXRay

logger = logging.getLogger(__name__)

class PBIXParser:
    """
    Parser for extracting and chunking PBIX file metadata for RAG pipeline.
    Uses pbixray for extraction, similar to powerbi_docs implementation.
    """
    
    def __init__(self):
        """
        Initialize the PBIX parser.
        """
        pass
    
    def extract_metadata(self, filepath: str) -> Dict[str, Any]:
        """
        Extract metadata from a PBIX file using pbixray.
        
        Args:
            filepath: Path to the .pbix file
            
        Returns:
            Structured dictionary containing tables, measures, and relationships
        """
        try:
            logger.info(f"Extracting metadata from PBIX file: {filepath}")
            
            # Validate file
            if not os.path.exists(filepath):
                raise FileNotFoundError(f"PBIX file not found: {filepath}")
            
            if not filepath.lower().endswith('.pbix'):
                raise ValueError("File must be a .pbix file")
            
            # Use pbixray to extract data
            pbix_model = PBIXRay(filepath)
            
            # Try to get column information from actual table data
            logger.info("Attempting to extract column information from table data...")
            table_columns = []
            try:
                # Get table names first
                table_names = pbix_model.tables
                if hasattr(table_names, 'tolist'):
                    table_names = table_names.tolist()
                elif hasattr(table_names, 'to_list'):
                    table_names = table_names.to_list()
                
                for table_name in table_names:
                    try:
                        # Get actual table data to extract column information
                        table_data = pbix_model.get_table(table_name)
                        if hasattr(table_data, 'columns'):
                            for col_name in table_data.columns:
                                table_columns.append({
                                    'TableName': table_name,
                                    'ColumnName': col_name,
                                    'DataType': str(table_data[col_name].dtype) if hasattr(table_data[col_name], 'dtype') else 'Unknown',
                                    'IsHidden': False,
                                    'Source': 'table_data'
                                })
                        logger.info(f"Extracted {len(table_data.columns) if hasattr(table_data, 'columns') else 0} columns from table '{table_name}'")
                    except Exception as e:
                        logger.warning(f"Could not extract columns from table '{table_name}': {str(e)}")
                        
            except Exception as e:
                logger.warning(f"Could not extract table data: {str(e)}")
            
            logger.info(f"Extracted {len(table_columns)} columns from table data")
            
            # # Debug logging to understand the data structure
            # logger.info(f"PBIXRay raw data structure:")
            
            # Helper function to safely check if data is empty
            def is_empty(data):
                if hasattr(data, 'empty'):
                    return data.empty
                elif hasattr(data, 'shape'):
                    return data.shape[0] == 0
                else:
                    return len(data) == 0
            
            # Helper function to safely get shape
            def get_shape(data):
                if hasattr(data, 'shape'):
                    return data.shape
                else:
                    return f"len={len(data)}"
            
            # Check all available properties
            all_properties = ['tables', 'dax_tables', 'dax_measures', 'dax_columns', 'relationships', 'metadata', 'power_query', 'statistics', 'schema']
            for prop in all_properties:
                if hasattr(pbix_model, prop):
                    data = getattr(pbix_model, prop)
                    logger.info(f"{prop}: {get_shape(data)} - empty: {is_empty(data)}")
            
            # Log sample data for each property
            if not is_empty(pbix_model.tables):
                if hasattr(pbix_model.tables, 'columns'):
                    logger.info(f"tables columns: {list(pbix_model.tables.columns)}")
                    logger.info(f"tables sample: {pbix_model.tables.head().to_dict('records')}")
                else:
                    logger.info(f"tables (numpy array): {pbix_model.tables}")
            
            if not is_empty(pbix_model.dax_tables):
                logger.info(f"dax_tables columns: {list(pbix_model.dax_tables.columns)}")
                logger.info(f"dax_tables sample: {pbix_model.dax_tables.head().to_dict('records')}")
            
            if not is_empty(pbix_model.dax_measures):
                logger.info(f"dax_measures columns: {list(pbix_model.dax_measures.columns)}")
                logger.info(f"dax_measures sample: {pbix_model.dax_measures.head().to_dict('records')}")
                
            if not is_empty(pbix_model.dax_columns):
                logger.info(f"dax_columns columns: {list(pbix_model.dax_columns.columns)}")
                logger.info(f"dax_columns sample: {pbix_model.dax_columns.head().to_dict('records')}")
            
            if not is_empty(pbix_model.metadata):
                logger.info(f"metadata columns: {list(pbix_model.metadata.columns)}")
                logger.info(f"metadata sample: {pbix_model.metadata.head().to_dict('records')}")
            
            # Check if there are other properties that might contain columns
            if not is_empty(pbix_model.schema):
                logger.info(f"schema columns: {list(pbix_model.schema.columns) if hasattr(pbix_model.schema, 'columns') else 'no columns attr'}")
                logger.info(f"schema sample: {pbix_model.schema.head().to_dict('records') if hasattr(pbix_model.schema, 'head') else pbix_model.schema}")
            
            if not is_empty(pbix_model.statistics):
                logger.info(f"statistics columns: {list(pbix_model.statistics.columns) if hasattr(pbix_model.statistics, 'columns') else 'no columns attr'}")
                logger.info(f"statistics sample: {pbix_model.statistics.head().to_dict('records') if hasattr(pbix_model.statistics, 'head') else pbix_model.statistics}")
            
            # Extract data using pbixray properties - handle different data types
            def safe_to_dict(data, default=[]):
                if hasattr(data, 'to_dict') and not is_empty(data):
                    return data.to_dict('records')
                elif hasattr(data, 'tolist'):
                    return data.tolist()
                elif not is_empty(data):
                    return list(data)
                else:
                    return default
            
            pbix_data = {
                "tables": safe_to_dict(pbix_model.tables),
                "dax_tables": safe_to_dict(pbix_model.dax_tables),
                "dax_measures": safe_to_dict(pbix_model.dax_measures),
                "relationships": safe_to_dict(pbix_model.relationships),
                "power_query": safe_to_dict(pbix_model.power_query),
                "columns": safe_to_dict(pbix_model.dax_columns),
                "metadata": safe_to_dict(pbix_model.metadata),
                "schema": safe_to_dict(pbix_model.schema),
                "statistics": safe_to_dict(pbix_model.statistics),
                "table_columns": table_columns
            }
            
            # Transform the pbixray data structure to our RAG format
            metadata = self._transform_pbix_data(pbix_data)
            logger.info(f"Successfully extracted metadata: {len(metadata.get('tables', []))} tables, "
                       f"{len(metadata.get('measures', []))} measures, "
                       f"{len(metadata.get('relationships', []))} relationships")
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting PBIX metadata: {str(e)}")
            raise
    
    def _transform_pbix_data(self, pbix_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform pbixray data into structured metadata for RAG.
        
        Args:
            pbix_data: Data extracted by pbixray
            
        Returns:
            Structured metadata dictionary
        """
        try:
            metadata = {
                'tables': [],
                'measures': [],
                'relationships': [],
                'columns': []
            }

            # 1. Extract tables first to create a base structure
            # Handle tables as numpy array of strings
            raw_tables = pbix_data.get('tables', [])
            raw_dax_tables = pbix_data.get('dax_tables', [])
            
            # Process tables (numpy array of strings)
            for table_name in raw_tables:
                if isinstance(table_name, str) and not any(t['name'] == table_name for t in metadata['tables']):
                    metadata['tables'].append({
                        'name': table_name,
                        'columns': [],
                        'measures': []
                    })
            
            # Process dax_tables (list of dictionaries)
            for table_data in raw_dax_tables:
                if isinstance(table_data, dict):
                    table_name = table_data.get('Name') or table_data.get('TableName')
                    if table_name and not any(t['name'] == table_name for t in metadata['tables']):
                        metadata['tables'].append({
                            'name': table_name,
                            'columns': [],
                            'measures': []
                        })
            
            # Also check metadata for table information
            raw_metadata = pbix_data.get('metadata', [])
            for meta_data in raw_metadata:
                if isinstance(meta_data, dict):
                    # Look for table-like entries in metadata
                    if meta_data.get('Type') == 'Table' or 'Table' in str(meta_data.get('Type', '')):
                        table_name = meta_data.get('Name') or meta_data.get('TableName')
                        if table_name and not any(t['name'] == table_name for t in metadata['tables']):
                            metadata['tables'].append({
                                'name': table_name,
                                'columns': [],
                                'measures': []
                            })
            
            logger.info(f"Processed {len(metadata['tables'])} initial tables.")

            # Create a quick lookup map for tables for faster linking
            table_map = {table['name']: table for table in metadata['tables']}

            # 2. Process columns from pbixray dax_columns, table data, schema, statistics, and metadata
            raw_columns = pbix_data.get('columns', [])
            
            # Add columns extracted from actual table data (this should contain most regular columns)
            raw_table_columns = pbix_data.get('table_columns', [])
            raw_columns.extend(raw_table_columns)
            
            # Look for columns in schema (this might contain regular columns)
            raw_schema = pbix_data.get('schema', [])
            for schema_data in raw_schema:
                if isinstance(schema_data, dict):
                    # Check if this looks like column data
                    if any(key in schema_data for key in ['ColumnName', 'Name', 'DataType', 'Data Type']):
                        raw_columns.append(schema_data)
            
            # Look for columns in statistics (this might contain column statistics)
            raw_statistics = pbix_data.get('statistics', [])
            for stat_data in raw_statistics:
                if isinstance(stat_data, dict):
                    # Check if this looks like column data
                    if any(key in stat_data for key in ['ColumnName', 'Name', 'DataType', 'Data Type']):
                        raw_columns.append(stat_data)
            
            # Also look for columns in metadata
            for meta_data in raw_metadata:
                if isinstance(meta_data, dict) and (meta_data.get('Type') == 'Column' or 'Column' in str(meta_data.get('Type', ''))):
                    raw_columns.append(meta_data)
            
            logger.info(f"Processing {len(raw_columns)} columns from pbixray.")
            logger.info(f"Column sources: {len(pbix_data.get('columns', []))} from dax_columns, {len(raw_table_columns)} from table data, {len(raw_schema)} from schema, {len(raw_statistics)} from statistics")
            for col_data in raw_columns:
                if isinstance(col_data, dict):
                    table_name = col_data.get('TableName') or col_data.get('Table') or col_data.get('ParentName')
                    col_name = col_data.get('Name') or col_data.get('ColumnName')
                    
                    if table_name and col_name:
                        # Try to find the table in our table map
                        found_table = None
                        for table_key in table_map:
                            if table_key.lower() == table_name.lower():
                                found_table = table_key
                                break
                        
                        if found_table:
                            column_info = {
                                'name': col_name,
                                'dataType': col_data.get('DataType', col_data.get('Data Type', 'Unknown')),
                                'isHidden': col_data.get('IsHidden', col_data.get('Is Hidden', False)),
                                'table': found_table
                            }
                            # Add to the master column list
                            metadata['columns'].append(column_info)
                            # Add to the corresponding table's column list
                            table_map[found_table]['columns'].append(column_info)
                        else:
                            logger.warning(f"Could not link column '{col_name}' to table '{table_name}'. Available tables: {list(table_map.keys())}")
                    else:
                        logger.warning(f"Column data missing table or name: {col_data}")
                else:
                    logger.warning(f"Column data is not a dictionary: {col_data}")

            # 3. Process measures and link them to tables
            raw_measures = pbix_data.get('dax_measures', [])
            
            # Also look for measures in metadata
            for meta_data in raw_metadata:
                if isinstance(meta_data, dict) and (meta_data.get('Type') == 'Measure' or 'Measure' in str(meta_data.get('Type', ''))):
                    raw_measures.append(meta_data)
            
            logger.info(f"Processing {len(raw_measures)} measures from pbixray.")
            for measure_data in raw_measures:
                if isinstance(measure_data, dict):
                    table_name = measure_data.get('TableName') or measure_data.get('Table') or measure_data.get('ParentName')
                    measure_name = measure_data.get('Name')
                    
                    if measure_name:
                        # Try to find the table in our table map
                        found_table = None
                        if table_name:
                            for table_key in table_map:
                                if table_key.lower() == table_name.lower():
                                    found_table = table_key
                                    break
                        
                        # If no table found, try to create a default table or use a generic one
                        if not found_table and table_name:
                            # Create a table entry for this measure
                            metadata['tables'].append({
                                'name': table_name,
                                'columns': [],
                                'measures': []
                            })
                            table_map[table_name] = metadata['tables'][-1]
                            found_table = table_name
                        
                        measure_info = {
                            'name': measure_name,
                            'expression': measure_data.get('Expression', measure_data.get('Formula', '')),
                            'table': found_table or 'Unknown',
                            'isHidden': measure_data.get('IsHidden', measure_data.get('Is Hidden', False))
                        }
                        metadata['measures'].append(measure_info)
                        
                        if found_table:
                            table_map[found_table]['measures'].append(measure_info)
                        else:
                            logger.warning(f"Could not link measure '{measure_name}' to table '{table_name}'. Available tables: {list(table_map.keys())}")
                    else:
                        logger.warning(f"Measure data missing name: {measure_data}")
                else:
                    logger.warning(f"Measure data is not a dictionary: {measure_data}")

            # 4. Process relationships
            raw_relationships = pbix_data.get('relationships', [])
            logger.info(f"Processing {len(raw_relationships)} relationships from pbixray.")
            for rel_data in raw_relationships:
                if isinstance(rel_data, dict):
                    from_table = rel_data.get('FromTableName') or rel_data.get('FromTable', '')
                    to_table = rel_data.get('ToTableName') or rel_data.get('ToTable', '')
                    
                    # Extract table names from relationships to create missing tables
                    if from_table and not any(t['name'] == from_table for t in metadata['tables']):
                        metadata['tables'].append({
                            'name': from_table,
                            'columns': [],
                            'measures': []
                        })
                        table_map[from_table] = metadata['tables'][-1]
                    
                    if to_table and not any(t['name'] == to_table for t in metadata['tables']):
                        metadata['tables'].append({
                            'name': to_table,
                            'columns': [],
                            'measures': []
                        })
                        table_map[to_table] = metadata['tables'][-1]
                    
                    metadata['relationships'].append({
                        'name': rel_data.get('Name', ''),
                        'fromTable': from_table,
                        'fromColumn': rel_data.get('FromColumnName') or rel_data.get('FromColumn', ''),
                        'toTable': to_table,
                        'toColumn': rel_data.get('ToColumnName') or rel_data.get('ToColumn', ''),
                        'isActive': rel_data.get('IsActive', True)
                    })
                else:
                    logger.warning(f"Relationship data is not a dictionary: {rel_data}")

            # 5. Process Power Query (M code) scripts
            raw_power_query = pbix_data.get('power_query', [])
            metadata['power_query_scripts'] = []
            logger.info(f"Processing {len(raw_power_query)} Power Query scripts from pbixray.")
            
            for pq_data in raw_power_query:
                if isinstance(pq_data, dict):
                    # Extract Power Query script information
                    script_name = pq_data.get('Name') or pq_data.get('QueryName') or pq_data.get('TableName', 'Unknown')
                    m_code = pq_data.get('MCode') or pq_data.get('Expression') or pq_data.get('Query', '')
                    source = pq_data.get('Source') or pq_data.get('DataSource', 'Unknown')
                    
                    # Extract key transformations from M code
                    key_transformations = self._extract_key_transformations(m_code)
                    
                    metadata['power_query_scripts'].append({
                        'name': script_name,
                        'source': source,
                        'm_code': m_code,
                        'key_transformations': key_transformations,
                        'line_count': len(m_code.split('\n')) if m_code else 0
                    })
                else:
                    logger.warning(f"Power Query data is not a dictionary: {pq_data}")

            logger.info(f"Final metadata: {len(metadata['tables'])} tables, {len(metadata['measures'])} measures, "
                       f"{len(metadata['relationships'])} relationships, {len(metadata['columns'])} columns, "
                       f"{len(metadata['power_query_scripts'])} Power Query scripts")
            return metadata
            
        except Exception as e:
            logger.error(f"Error transforming PBIX data: {str(e)}")
            raise
    
    def _extract_key_transformations(self, m_code: str) -> List[str]:
        """
        Extract key transformations from M code for better context understanding.
        
        Args:
            m_code: The M code string to analyze
            
        Returns:
            List of key transformation descriptions
        """
        try:
            if not m_code or not isinstance(m_code, str):
                return []
            
            transformations = []
            m_code_lower = m_code.lower()
            
            # Common Power Query transformations to look for
            transformation_patterns = {
                'data_source': ['source', 'web.contents', 'odata.feed', 'excel.workbook', 'csv.document'],
                'filtering': ['table.selectrows', 'table.filter', 'where', 'filter'],
                'grouping': ['table.group', 'group by', 'groupby'],
                'sorting': ['table.sort', 'sort', 'order by'],
                'column_operations': ['table.addcolumn', 'table.renamecolumns', 'table.removecolumns', 'table.transformcolumns'],
                'data_type_conversion': ['table.transformcolumntypes', 'int64.from', 'text.from', 'datetime.from'],
                'merging': ['table.join', 'table.nestedjoin', 'merge', 'join'],
                'pivoting': ['table.pivot', 'pivot', 'unpivot'],
                'aggregation': ['table.aggregate', 'list.sum', 'list.average', 'list.count'],
                'text_operations': ['text.split', 'text.combine', 'text.replace', 'text.trim'],
                'date_operations': ['datetime.adddays', 'datetime.addmonths', 'date.from', 'time.from'],
                'conditional_logic': ['if', 'then', 'else', 'try', 'otherwise'],
                'error_handling': ['try', 'otherwise', 'error.record']
            }
            
            for category, patterns in transformation_patterns.items():
                for pattern in patterns:
                    if pattern in m_code_lower:
                        transformations.append(f"{category.replace('_', ' ').title()}: {pattern}")
                        break  # Only add one per category
            
            # Look for custom function definitions
            if 'let' in m_code_lower and 'in' in m_code_lower:
                transformations.append("Custom Function: Contains let/in expression")
            
            # Look for table operations
            if 'table.' in m_code_lower:
                transformations.append("Table Operations: Multiple table transformations")
            
            # Look for list operations
            if 'list.' in m_code_lower:
                transformations.append("List Operations: List-based transformations")
            
            return transformations[:10]  # Limit to 10 most relevant transformations
            
        except Exception as e:
            logger.warning(f"Error extracting key transformations from M code: {str(e)}")
            return []
    
    def chunk_metadata(self, metadata: Dict[str, Any]) -> List[Document]:
        """
        Chunk the structured metadata into meaningful text documents.
        
        Args:
            metadata: Structured metadata dictionary
            
        Returns:
            List of LangChain Document objects
        """
        try:
            logger.info("Chunking metadata into documents")
            documents = []
            
            # Get all data
            tables = metadata.get('tables', [])
            measures = metadata.get('measures', [])
            relationships = metadata.get('relationships', [])
            columns = metadata.get('columns', [])
            
            # 1. Create comprehensive table documents with all details
            for table in tables:
                table_name = table.get('name', 'Unknown')
                table_columns = table.get('columns', [])
                table_measures = table.get('measures', [])
                
                # Create detailed table document
                table_doc = f"Table: {table_name}\n"
                table_doc += f"Columns ({len(table_columns)}): "
                
                if table_columns:
                    column_details = []
                    for col in table_columns:
                        col_name = col.get('name', '')
                        col_type = col.get('dataType', 'Unknown')
                        is_hidden = col.get('isHidden', False)
                        hidden_text = " (hidden)" if is_hidden else ""
                        column_details.append(f"{col_name} ({col_type}){hidden_text}")
                    table_doc += ", ".join(column_details)
                else:
                    table_doc += "No columns found"
                
                table_doc += f"\nMeasures ({len(table_measures)}): "
                if table_measures:
                    measure_names = [m.get('name', '') for m in table_measures if m.get('name')]
                    table_doc += ", ".join(measure_names)
                else:
                    table_doc += "No measures found"
                
                documents.append(Document(
                    page_content=table_doc,
                    metadata={
                        "source": "table_schema",
                        "table_name": table_name,
                        "type": "table",
                        "column_count": len(table_columns),
                        "measure_count": len(table_measures)
                    }
                ))
            
            # 2. Create individual detailed measure documents with full DAX
            for measure in measures:
                measure_name = measure.get('name', '')
                expression = measure.get('expression', '')
                table_name = measure.get('table', 'Unknown')
                is_hidden = measure.get('isHidden', False)
                
                if measure_name:
                    measure_doc = f"Measure: {measure_name}\n"
                    measure_doc += f"Table: {table_name}\n"
                    measure_doc += f"Hidden: {is_hidden}\n"
                    measure_doc += f"DAX Expression:\n{expression}"
                    
                    documents.append(Document(
                        page_content=measure_doc,
                        metadata={
                            "source": "measure_schema",
                            "table_name": table_name,
                            "measure_name": measure_name,
                            "expression": expression,
                            "is_hidden": is_hidden,
                            "type": "measure"
                        }
                    ))
            
            # 3. Create detailed relationship documents
            for rel in relationships:
                from_table = rel.get('fromTable', '')
                from_column = rel.get('fromColumn', '')
                to_table = rel.get('toTable', '')
                to_column = rel.get('toColumn', '')
                is_active = rel.get('isActive', True)
                rel_name = rel.get('name', '')
                
                if from_table and to_table:
                    rel_doc = f"Relationship: {rel_name}\n"
                    rel_doc += f"From: {from_table}[{from_column}]\n"
                    rel_doc += f"To: {to_table}[{to_column}]\n"
                    rel_doc += f"Active: {is_active}"
                    
                    documents.append(Document(
                        page_content=rel_doc,
                        metadata={
                            "source": "relationship_schema",
                            "from_table": from_table,
                            "from_column": from_column,
                            "to_table": to_table,
                            "to_column": to_column,
                            "is_active": is_active,
                            "type": "relationship"
                        }
                    ))
            
            # 4. Create column-specific documents for better searchability
            for column in columns:
                column_name = column.get('name', '')
                data_type = column.get('dataType', '')
                table_name = column.get('table', 'Unknown')
                is_hidden = column.get('isHidden', False)
                
                if column_name:
                    column_doc = f"Column: {column_name}\n"
                    column_doc += f"Table: {table_name}\n"
                    column_doc += f"Data Type: {data_type}\n"
                    column_doc += f"Hidden: {is_hidden}"
                    
                    documents.append(Document(
                        page_content=column_doc,
                        metadata={
                            "source": "column_schema",
                            "table_name": table_name,
                            "column_name": column_name,
                            "data_type": data_type,
                            "is_hidden": is_hidden,
                            "type": "column"
                        }
                    ))
            
            # 5. Create Power Query (M code) documents
            power_query_scripts = metadata.get('power_query_scripts', [])
            for script in power_query_scripts:
                script_name = script.get('name', 'Unknown')
                source = script.get('source', 'Unknown')
                m_code = script.get('m_code', '')
                key_transformations = script.get('key_transformations', [])
                line_count = script.get('line_count', 0)
                
                # Create comprehensive Power Query document
                pq_doc = f"Power Query Script: {script_name}\n"
                pq_doc += f"Source: {source}\n"
                pq_doc += f"Lines of Code: {line_count}\n"
                
                if key_transformations:
                    pq_doc += f"Key Transformations:\n"
                    for transformation in key_transformations:
                        pq_doc += f"- {transformation}\n"
                
                if m_code:
                    pq_doc += f"\nM Code:\n{m_code}"
                else:
                    pq_doc += "\nM Code: Not available"
                
                documents.append(Document(
                    page_content=pq_doc,
                    metadata={
                        "source": "power_query_script",
                        "script_name": script_name,
                        "data_source": source,
                        "line_count": line_count,
                        "key_transformations": key_transformations,
                        "type": "power_query"
                    }
                ))
            
            # # 6. Create comprehensive model overview document
            # all_table_names = [t.get('name', '') for t in tables if t.get('name')]
            # all_measure_names = [m.get('name', '') for m in measures if m.get('name')]
            # all_column_names = [c.get('name', '') for c in columns if c.get('name')]
            
            # overview_doc = f"Power BI Model Overview:\n"
            # overview_doc += f"Tables ({len(all_table_names)}): {', '.join(all_table_names) if all_table_names else 'None'}\n"
            # overview_doc += f"Measures ({len(all_measure_names)}): {', '.join(all_measure_names) if all_measure_names else 'None'}\n"
            # overview_doc += f"Columns ({len(all_column_names)}): {', '.join(all_column_names[:20]) if all_column_names else 'None'}"
            # if len(all_column_names) > 20:
            #     overview_doc += f" and {len(all_column_names) - 20} more"
            # overview_doc += f"\nRelationships ({len(relationships)}): {len(relationships)} active relationships between tables"
            
            # documents.append(Document(
            #     page_content=overview_doc,
            #     metadata={
            #         "source": "model_overview",
            #         "type": "overview",
            #         "table_count": len(tables),
            #         "measure_count": len(measures),
            #         "relationship_count": len(relationships),
            #         "column_count": len(columns)
            #     }
            # ))
            
            # # 6. Create DAX code reference document
            # if measures:
            #     dax_doc = "DAX Measures Reference:\n"
            #     for measure in measures:
            #         measure_name = measure.get('name', '')
            #         expression = measure.get('expression', '')
            #         table_name = measure.get('table', 'Unknown')
                    
            #         if measure_name and expression:
            #             dax_doc += f"\n{measure_name} (in {table_name}):\n"
            #             dax_doc += f"{expression}\n"
            #             dax_doc += "-" * 50 + "\n"
                
            #     documents.append(Document(
            #         page_content=dax_doc,
            #         metadata={
            #             "source": "dax_reference",
            #             "type": "dax",
            #             "measure_count": len(measures)
            #         }
            #     ))
            
            logger.info(f"Created {len(documents)} document chunks from metadata")
            return documents
            
        except Exception as e:
            logger.error(f"Error chunking metadata: {str(e)}")
            raise
    
