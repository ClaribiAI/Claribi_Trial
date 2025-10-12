# app/powerbi_chat/services/pbix_parsing_service.py

import logging
from typing import Dict, List, Any
from langchain_core.documents import Document
from app.powerbi_docs.pbixray import PBIXRay

logger = logging.getLogger(__name__)


class PBIXParsingService:
    """
    Service for extracting, transforming, and chunking PBIX file metadata.
    This version merges the robust discovery logic of the old parser with the
    clean structure and chunking strategy of the new refactored version.
    """

    @staticmethod
    def extract_and_chunk(filepath: str) -> List[Document]:
        """High-level method to perform all parsing steps."""
        raw_data = PBIXParsingService._extract_raw_data(filepath)
        structured_metadata = PBIXParsingService._transform_to_structured_metadata(
            raw_data
        )
        return PBIXParsingService._chunk_metadata(structured_metadata)

    @staticmethod
    def extract_and_chunk_with_metadata(filepath: str, filename: str) -> tuple[List[Document], dict]:
        """High-level method to perform all parsing steps and return both documents and summary metadata."""
        raw_data = PBIXParsingService._extract_raw_data(filepath)
        structured_metadata = PBIXParsingService._transform_to_structured_metadata(
            raw_data
        )
        documents = PBIXParsingService._chunk_metadata(structured_metadata)
        
        # Create summary metadata (not the full PBIX data)
        import os
        from datetime import datetime
        
        # Calculate summary statistics
        tables = structured_metadata.get('tables', [])
        total_measures = sum(len(t.get('measures', [])) for t in tables)
        total_columns = sum(len(t.get('columns', [])) for t in tables)
        relationships = structured_metadata.get('relationships', [])
        power_query_scripts = structured_metadata.get('power_query_scripts', [])
        
        collection_metadata = {
            'filename': filename,
            'upload_time': datetime.now().isoformat(),
            'file_size': os.path.getsize(filepath),
            'upload_id': f"upload_{datetime.now().timestamp()}",
            'summary': {
                'tables_count': len(tables),
                'measures_count': total_measures,
                'columns_count': total_columns,
                'relationships_count': len(relationships),
                'power_query_scripts_count': len(power_query_scripts),
                'document_count': len(documents)
            }
        }
        
        return documents, collection_metadata

    @staticmethod
    def _extract_raw_data(filepath: str) -> Dict[str, Any]:
        """Extracts raw data using PBIXRay with comprehensive property checking."""
        logger.info(f"Extracting metadata from PBIX file: {filepath}")
        pbix_model = PBIXRay(filepath)

        def safe_to_list(data):
            if hasattr(data, "to_dict"):
                return data.to_dict("records")
            if hasattr(data, "tolist"):
                return data.tolist()
            return list(data) if data is not None else []

        # Helper function to safely check if data is empty
        def is_empty(data):
            if hasattr(data, 'empty'):
                return data.empty
            elif hasattr(data, 'shape'):
                return data.shape[0] == 0
            else:
                return len(data) == 0

        # Extract table columns from actual table data (like old implementation)
        table_columns = []
        try:
            table_names = pbix_model.tables
            if hasattr(table_names, 'tolist'):
                table_names = table_names.tolist()
            elif hasattr(table_names, 'to_list'):
                table_names = table_names.to_list()
            
            for table_name in table_names:
                try:
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
                except Exception as e:
                    logger.warning(f"Could not extract columns from table '{table_name}': {str(e)}")
        except Exception as e:
            logger.warning(f"Could not extract table data: {str(e)}")

        # Extract all available properties (like old implementation)
        all_properties = ['tables', 'dax_tables', 'dax_measures', 'dax_columns', 'relationships', 'metadata', 'power_query', 'statistics', 'schema']
        extracted_data = {}
        
        for prop in all_properties:
            if hasattr(pbix_model, prop):
                data = getattr(pbix_model, prop)
                if not is_empty(data):
                    extracted_data[prop] = safe_to_list(data)
                    logger.info(f"Extracted {prop}: {len(extracted_data[prop])} items")
                else:
                    extracted_data[prop] = []
            else:
                extracted_data[prop] = []

        # Add table columns from actual table data
        extracted_data['table_columns'] = table_columns

        return extracted_data

    @staticmethod
    def _transform_to_structured_metadata(raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transforms raw pbixray output into a clean, structured format, ensuring
        all details are captured using comprehensive fallbacks from the old parser.
        """
        all_table_names = set()

        # 1. Comprehensive table discovery from all sources (like old implementation)
        # From tables property (numpy array of strings)
        for table_name in raw_data.get("tables", []):
            if isinstance(table_name, str) and table_name.strip():
                all_table_names.add(table_name.strip())
        
        # From dax_tables
        for table_data in raw_data.get("dax_tables", []):
            if isinstance(table_data, dict) and "Name" in table_data and table_data["Name"]:
                all_table_names.add(str(table_data["Name"]).strip())
        
        # From power_query
        for pq_data in raw_data.get("power_query", []):
            if isinstance(pq_data, dict) and "Name" in pq_data and pq_data["Name"]:
                all_table_names.add(str(pq_data["Name"]).strip())
        
        # From relationships
        for rel in raw_data.get("relationships", []):
            if isinstance(rel, dict):
                if "FromTableName" in rel and rel["FromTableName"]:
                    all_table_names.add(str(rel["FromTableName"]).strip())
                if "ToTableName" in rel and rel["ToTableName"]:
                    all_table_names.add(str(rel["ToTableName"]).strip())
        
        # From metadata (like old implementation)
        for meta_data in raw_data.get("metadata", []):
            if isinstance(meta_data, dict):
                if meta_data.get('Type') == 'Table' or 'Table' in str(meta_data.get('Type', '')):
                    table_name = meta_data.get('Name') or meta_data.get('TableName')
                    if table_name and str(table_name).strip():
                        all_table_names.add(str(table_name).strip())

        # Create tables list first (like old implementation)
        tables = []
        for name in all_table_names:
            tables.append({"name": name, "columns": [], "measures": []})
        
        logger.info(f"Discovered {len(tables)} unique tables from all sources.")

        # Create a quick lookup map for tables for faster linking (like old implementation)
        table_map = {table['name']: table for table in tables}

        # 2. Process columns from multiple sources (like old implementation)
        raw_columns = []
        
        # Add dax_columns
        raw_columns.extend(raw_data.get("dax_columns", []))
        
        # Add table_columns from actual table data
        raw_columns.extend(raw_data.get("table_columns", []))
        
        # Add columns from schema
        for schema_data in raw_data.get("schema", []):
            if isinstance(schema_data, dict):
                if any(key in schema_data for key in ['ColumnName', 'Name', 'DataType', 'Data Type']):
                    raw_columns.append(schema_data)
        
        # Add columns from statistics
        for stat_data in raw_data.get("statistics", []):
            if isinstance(stat_data, dict):
                if any(key in stat_data for key in ['ColumnName', 'Name', 'DataType', 'Data Type']):
                    raw_columns.append(stat_data)
        
        # Add columns from metadata
        for meta_data in raw_data.get("metadata", []):
            if isinstance(meta_data, dict) and (meta_data.get('Type') == 'Column' or 'Column' in str(meta_data.get('Type', ''))):
                raw_columns.append(meta_data)

        logger.info(f"Processing {len(raw_columns)} columns from all sources.")
        logger.info(f"Column sources: {len(raw_data.get('dax_columns', []))} from dax_columns, {len(raw_data.get('table_columns', []))} from table data, {len([c for c in raw_data.get('schema', []) if isinstance(c, dict) and any(key in c for key in ['ColumnName', 'Name', 'DataType', 'Data Type'])])} from schema, {len([c for c in raw_data.get('statistics', []) if isinstance(c, dict) and any(key in c for key in ['ColumnName', 'Name', 'DataType', 'Data Type'])])} from statistics")
        
        # Process all columns with robust fallbacks (like old implementation)
        for col_data in raw_columns:
            if isinstance(col_data, dict):
                table_name = col_data.get('TableName') or col_data.get('Table') or col_data.get('ParentName')
                col_name = col_data.get('Name') or col_data.get('ColumnName')
                
                if table_name and col_name:
                    # Try to find the table in our table map (like old implementation)
                    found_table = None
                    for table_key in table_map:
                        if table_key.lower() == table_name.lower():
                            found_table = table_key
                            break
                    
                    if found_table:
                        # Check if column already exists to avoid duplicates
                        existing_column = None
                        for existing_col in table_map[found_table]['columns']:
                            if existing_col['name'] == col_name:
                                existing_column = existing_col
                                break
                        
                        # Get the best data type information
                        data_type = col_data.get('DataType', col_data.get('Data Type', 'Unknown'))
                        is_hidden = col_data.get('IsHidden', col_data.get('Is Hidden', False))
                        
                        # Debug: Track data type source
                        if data_type != 'Unknown':
                            source = col_data.get('Source', 'unknown')
                            logger.debug(f"Column '{col_name}' data type '{data_type}' from source: {source}")
                        
                        if existing_column:
                            # Update existing column with better data type if available
                            if existing_column['dataType'] == 'Unknown' and data_type != 'Unknown':
                                existing_column['dataType'] = data_type
                                existing_column['isHidden'] = is_hidden
                                logger.debug(f"Updated column '{col_name}' in table '{found_table}' with data type '{data_type}'")
                            else:
                                logger.debug(f"Column '{col_name}' already exists in table '{found_table}' with data type '{existing_column['dataType']}'")
                        else:
                            # Add new column
                            column_info = {
                                'name': col_name,
                                'dataType': data_type,
                                'isHidden': is_hidden,
                                'table': found_table
                            }
                            table_map[found_table]['columns'].append(column_info)
                            logger.debug(f"Successfully linked column '{col_name}' to table '{found_table}' with data type '{data_type}'")
                    else:
                        logger.warning(f"Could not link column '{col_name}' to table '{table_name}'. Available tables: {list(table_map.keys())}")
                else:
                    logger.warning(f"Column data missing table or name: {col_data}")
            else:
                logger.warning(f"Column data is not a dictionary: {col_data}")

        # 3. Process measures from multiple sources (like old implementation)
        raw_measures = raw_data.get("dax_measures", [])
        
        # Add measures from metadata
        for meta_data in raw_data.get("metadata", []):
            if isinstance(meta_data, dict) and (meta_data.get('Type') == 'Measure' or 'Measure' in str(meta_data.get('Type', ''))):
                raw_measures.append(meta_data)

        logger.info(f"Processing {len(raw_measures)} measures from all sources.")
        
        for measure_data in raw_measures:
            if isinstance(measure_data, dict):
                table_name = measure_data.get('TableName') or measure_data.get('Table') or measure_data.get('ParentName')
                measure_name = measure_data.get('Name')
                
                if measure_name:
                    # Try to find the table in our table map (like old implementation)
                    found_table = None
                    if table_name:
                        for table_key in table_map:
                            if table_key.lower() == table_name.lower():
                                found_table = table_key
                                break
                    
                    # Create table if not found (like old implementation)
                    if not found_table and table_name:
                        # Add new table to both list and map
                        new_table = {"name": table_name, "columns": [], "measures": []}
                        tables.append(new_table)
                        table_map[table_name] = new_table
                        found_table = table_name
                    
                    if found_table:
                        measure_info = {
                            'name': measure_name,
                            'expression': measure_data.get('Expression', measure_data.get('Formula', '')),
                            'isHidden': measure_data.get('IsHidden', measure_data.get('Is Hidden', False)),
                            'table': found_table
                        }
                        table_map[found_table]['measures'].append(measure_info)
                    else:
                        logger.warning(f"Could not link measure '{measure_name}' to table '{table_name}'. Available tables: {list(table_map.keys())}")
                else:
                    logger.warning(f"Measure data missing name: {measure_data}")
            else:
                logger.warning(f"Measure data is not a dictionary: {measure_data}")

        # 4. Process relationships with comprehensive fallbacks (like old implementation)
        relationships = []
        logger.info(f"Processing {len(raw_data.get('relationships', []))} relationships from pbixray.")
        
        
        for rel_data in raw_data.get("relationships", []):
            if isinstance(rel_data, dict):
                from_table = rel_data.get('FromTableName') or rel_data.get('FromTable', '')
                to_table = rel_data.get('ToTableName') or rel_data.get('ToTable', '')
                
                # Extract table names from relationships to create missing tables (like old implementation)
                if from_table and not any(t['name'] == from_table for t in tables):
                    new_table = {"name": from_table, "columns": [], "measures": []}
                    tables.append(new_table)
                    table_map[from_table] = new_table
                
                if to_table and not any(t['name'] == to_table for t in tables):
                    new_table = {"name": to_table, "columns": [], "measures": []}
                    tables.append(new_table)
                    table_map[to_table] = new_table
                
                relationships.append(
                    {
                        "name": rel_data.get("Name", ""),
                        "fromTable": from_table,
                        "fromColumn": rel_data.get("FromColumnName") or rel_data.get("FromColumn", ""),
                        "toTable": to_table,
                        "toColumn": rel_data.get("ToColumnName") or rel_data.get("ToColumn", ""),
                        "isActive": rel_data.get("IsActive", True),
                        "fromCardinality": rel_data.get("Cardinality", "Unknown").split(":")[0] if ":" in str(rel_data.get("Cardinality", "")) else "Unknown",
                        "toCardinality": rel_data.get("Cardinality", "Unknown").split(":")[1] if ":" in str(rel_data.get("Cardinality", "")) else "Unknown",
                        "crossFilteringBehavior": rel_data.get("CrossFilteringBehavior", "Unknown"),
                        "fromKeyCount": rel_data.get("FromKeyCount", 0),
                        "toKeyCount": rel_data.get("ToKeyCount", 0),
                        "relyOnReferentialIntegrity": rel_data.get("RelyOnReferentialIntegrity", False),
                    }
                )
            else:
                logger.warning(f"Relationship data is not a dictionary: {rel_data}")

        # 5. Process Power Query scripts with comprehensive fallbacks and transformation extraction
        power_query_scripts = []
        for pq in raw_data.get("power_query", []):
            if isinstance(pq, dict):
                script_name = pq.get("Name") or pq.get("QueryName") or pq.get("TableName", "Unknown")
                m_code = pq.get("MCode") or pq.get("Expression") or pq.get("Query", "")
                source = pq.get("Source") or pq.get("DataSource", "Unknown")
                
                # Extract key transformations from M code (like old implementation)
                key_transformations = PBIXParsingService._extract_key_transformations(m_code)
                
                power_query_scripts.append(
                    {
                        "name": script_name,
                        "m_code": m_code,
                        "source": source,
                        "key_transformations": key_transformations,
                        "line_count": len(m_code.split('\n')) if m_code else 0
                    }
                )

        logger.info(f"Final metadata: {len(tables)} tables, {sum(len(t['measures']) for t in tables)} measures, "
                   f"{len(relationships)} relationships, {sum(len(t['columns']) for t in tables)} columns, "
                   f"{len(power_query_scripts)} Power Query scripts")

        return {
            "tables": tables,
            "relationships": relationships,
            "power_query_scripts": power_query_scripts,
        }

    @staticmethod
    def _chunk_metadata(metadata: Dict[str, Any]) -> List[Document]:
        """
        Chunks the metadata into detailed documents for precise retrieval.
        Uses comprehensive chunking strategy from the old implementation.
        """
        documents = []
        
        tables = metadata.get("tables", [])
        measures = metadata.get("measures", [])
        relationships = metadata.get("relationships", [])
        power_query_scripts = metadata.get("power_query_scripts", [])

        # 1. Create comprehensive table documents with all details (like old implementation)
        for table in tables:
            table_name = table.get("name", "Unknown")
            table_columns = table.get("columns", [])
            table_measures = table.get("measures", [])
            
            # Create detailed table document
            table_doc = f"Table: {table_name}\n"
            table_doc += f"Columns ({len(table_columns)}): "
            
            if table_columns:
                column_details = []
                for col in table_columns:
                    col_name = col.get("name", "")
                    col_type = col.get("dataType", "Unknown")
                    is_hidden = col.get("isHidden", False)
                    hidden_text = " (hidden)" if is_hidden else ""
                    column_details.append(f"{col_name} ({col_type}){hidden_text}")
                table_doc += ", ".join(column_details)
            else:
                table_doc += "No columns found"
            
            table_doc += f"\nMeasures ({len(table_measures)}): "
            if table_measures:
                measure_names = [m.get("name", "") for m in table_measures if m.get("name")]
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

        # 2. Create individual detailed measure documents with full DAX (like old implementation)
        for table in tables:
            table_name = table.get("name", "Unknown")
            table_measures = table.get("measures", [])
            
            for measure in table_measures:
                measure_name = measure.get("name", "")
                expression = measure.get("expression", "")
                is_hidden = measure.get("isHidden", False)
                
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

        # 3. Create detailed relationship documents (like old implementation)
        for rel in relationships:
            from_table = rel.get("fromTable", "")
            from_column = rel.get("fromColumn", "")
            to_table = rel.get("toTable", "")
            to_column = rel.get("toColumn", "")
            is_active = rel.get("isActive", True)
            rel_name = rel.get("name", "")
            from_cardinality = rel.get("fromCardinality", "Unknown")
            to_cardinality = rel.get("toCardinality", "Unknown")
            cross_filtering = rel.get("crossFilteringBehavior", "Unknown")
            
            if from_table and to_table:
                rel_doc = f"Relationship: {rel_name}\n"
                rel_doc += f"From: {from_table}[{from_column}]\n"
                rel_doc += f"To: {to_table}[{to_column}]\n"
                rel_doc += f"Active: {is_active}\n"
                rel_doc += f"Cardinality: {from_cardinality} to {to_cardinality}\n"
                rel_doc += f"Cross-filtering: {cross_filtering}\n"
                rel_doc += f"From Key Count: {rel.get('fromKeyCount', 0)}\n"
                rel_doc += f"To Key Count: {rel.get('toKeyCount', 0)}\n"
                rel_doc += f"Referential Integrity: {rel.get('relyOnReferentialIntegrity', False)}"
                
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

        # 4. Create column-specific documents for better searchability (like old implementation)
        for table in tables:
            table_name = table.get("name", "Unknown")
            table_columns = table.get("columns", [])
            
            for column in table_columns:
                column_name = column.get("name", "")
                data_type = column.get("dataType", "")
                is_hidden = column.get("isHidden", False)
                
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

        # 5. Create Power Query (M code) documents (like old implementation)
        for script in power_query_scripts:
            script_name = script.get("name", "Unknown")
            source = script.get("source", "Unknown")
            m_code = script.get("m_code", "")
            key_transformations = script.get("key_transformations", [])
            line_count = script.get("line_count", 0)
            
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

        logger.info(f"Created {len(documents)} document chunks from metadata")
        return documents

    @staticmethod
    def _extract_key_transformations(m_code: str) -> List[str]:
        """
        Extract key transformations from M code for better context understanding.
        Copied from the old implementation for consistency.
        
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
