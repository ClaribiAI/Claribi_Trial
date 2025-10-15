# app/powerbi_chat/services/pbix_parsing_service.py

import logging
import json
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
        visuals = structured_metadata.get('visuals', [])
        pages = structured_metadata.get('pages', [])
        
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
                'pages_count': len(pages),
                'visuals_count': len(visuals),
                'document_count': len(documents)
            }
        }
        
        return documents, collection_metadata

    @staticmethod
    def _parse_visual_config(config_json: str) -> Dict[str, Any]:
        """
        Parse visual configuration JSON to extract key metadata.
        
        Args:
            config_json: JSON string containing visual configuration
            
        Returns:
            Dictionary with parsed visual metadata
        """
        try:
            config = json.loads(config_json)
            visual_info = {
                'name': config.get('name', ''),
                'visual_type': 'unknown',
                'fields_used': {},
                'data_sources': [],
                'key_properties': {}
            }
            
            # Extract single visual information
            single_visual = config.get('singleVisual', {})
            if single_visual:
                visual_info['visual_type'] = single_visual.get('visualType', 'unknown')
                
                # Extract projections (fields used)
                projections = single_visual.get('projections', {})
                for role, fields in projections.items():
                    if isinstance(fields, list):
                        field_names = []
                        for field in fields:
                            if isinstance(field, dict) and 'queryRef' in field:
                                field_names.append(field['queryRef'])
                        visual_info['fields_used'][role] = field_names
                
                # Extract prototype query for data sources
                prototype_query = single_visual.get('prototypeQuery', {})
                if prototype_query:
                    from_clause = prototype_query.get('From', [])
                    for table_ref in from_clause:
                        if isinstance(table_ref, dict) and 'Entity' in table_ref:
                            visual_info['data_sources'].append(table_ref['Entity'])
                    
                    # Extract select clause for detailed field info
                    select_clause = prototype_query.get('Select', [])
                    for select_item in select_clause:
                        if isinstance(select_item, dict):
                            name = select_item.get('Name', '')
                            if name and name not in visual_info['data_sources']:
                                # Extract table name from field name (e.g., "Table.Column" -> "Table")
                                if '.' in name:
                                    table_name = name.split('.')[0]
                                    if table_name not in visual_info['data_sources']:
                                        visual_info['data_sources'].append(table_name)
                
                # Extract key formatting properties
                objects = single_visual.get('objects', {})
                if objects:
                    # Extract general properties
                    general = objects.get('general', [])
                    if general and isinstance(general, list) and len(general) > 0:
                        general_props = general[0].get('properties', {})
                        if general_props:
                            visual_info['key_properties']['general'] = general_props
                    
                    # Extract title information
                    title = objects.get('title', [])
                    if title and isinstance(title, list) and len(title) > 0:
                        title_props = title[0].get('properties', {})
                        if title_props:
                            visual_info['key_properties']['title'] = title_props
                    
                    # Extract axis properties for charts
                    if 'valueAxis' in objects:
                        value_axis = objects.get('valueAxis', [])
                        if value_axis and isinstance(value_axis, list) and len(value_axis) > 0:
                            axis_props = value_axis[0].get('properties', {})
                            if axis_props:
                                visual_info['key_properties']['valueAxis'] = axis_props
                    
                    if 'categoryAxis' in objects:
                        category_axis = objects.get('categoryAxis', [])
                        if category_axis and isinstance(category_axis, list) and len(category_axis) > 0:
                            axis_props = category_axis[0].get('properties', {})
                            if axis_props:
                                visual_info['key_properties']['categoryAxis'] = axis_props
            
            return visual_info
            
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Error parsing visual config: {e}")
            return {
                'name': '',
                'visual_type': 'unknown',
                'fields_used': {},
                'data_sources': [],
                'key_properties': {}
            }

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
                else:
                    extracted_data[prop] = []
            else:
                extracted_data[prop] = []

        # Add table columns from actual table data
        extracted_data['table_columns'] = table_columns

        # Extract visuals from report layout
        try:
            visuals = pbix_model.visuals
            extracted_data['visuals'] = visuals
        except Exception as e:
            logger.warning(f"Could not extract visuals: {str(e)}")
            extracted_data['visuals'] = []

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
                        
                        if existing_column:
                            # Update existing column with better data type if available
                            if existing_column['dataType'] == 'Unknown' and data_type != 'Unknown':
                                existing_column['dataType'] = data_type
                                existing_column['isHidden'] = is_hidden
                        else:
                            # Add new column
                            column_info = {
                                'name': col_name,
                                'dataType': data_type,
                                'isHidden': is_hidden,
                                'table': found_table
                            }
                            table_map[found_table]['columns'].append(column_info)
                    else:
                        pass
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


        # 6. Process visuals from report layout
        visuals = []
        pages = []
        
        raw_visuals = raw_data.get("visuals", [])
        for visual_data in raw_visuals:
            try:
                # Parse the visual configuration
                config_json = visual_data.get('config', '{}')
                parsed_config = PBIXParsingService._parse_visual_config(config_json)
                
                # Skip image visuals
                visual_type = parsed_config.get('visual_type', 'unknown')
                if visual_type == 'image':
                    continue
                
                # Create structured visual metadata (without ID, name, and filters)
                visual_metadata = {
                    'visual_type': visual_type,
                    'section_name': visual_data.get('section_name', ''),
                    'section_id': visual_data.get('section_id'),
                    'fields_used': parsed_config.get('fields_used', {}),
                    'data_sources': parsed_config.get('data_sources', []),
                    'key_properties': parsed_config.get('key_properties', {}),
                    'x': visual_data.get('x'),
                    'y': visual_data.get('y'),
                    'z': visual_data.get('z'),
                    'width': visual_data.get('width'),
                    'height': visual_data.get('height')
                }
                visuals.append(visual_metadata)
                
                # Track pages/sections
                section_name = visual_data.get('section_name', '')
                if section_name and not any(p['name'] == section_name for p in pages):
                    pages.append({
                        'name': section_name,
                        'id': visual_data.get('section_id'),
                        'visual_count': 0  # Will be updated below
                    })
                
            except Exception as e:
                logger.warning(f"Error processing visual {visual_data.get('id', 'unknown')}: {e}")
                continue
        
        # Update page visual counts
        for page in pages:
            page['visual_count'] = sum(1 for v in visuals if v['section_name'] == page['name'])

        return {
            "tables": tables,
            "relationships": relationships,
            "power_query_scripts": power_query_scripts,
            "visuals": visuals,
            "pages": pages
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
        visuals = metadata.get("visuals", [])
        pages = metadata.get("pages", [])

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

        # 6. Create individual visual documents with comprehensive details
        for i, visual in enumerate(visuals, 1):
            visual_type = visual.get('visual_type', 'unknown')
            section_name = visual.get('section_name', 'Unknown')
            fields_used = visual.get('fields_used', {})
            data_sources = visual.get('data_sources', [])
            key_properties = visual.get('key_properties', {})
            
            # Create detailed visual document
            visual_doc = f"Visual {i}: {visual_type}\n"
            visual_doc += f"Page: {section_name}\n"
            
            if fields_used:
                visual_doc += "Fields Used:\n"
                for role, fields in fields_used.items():
                    if fields:
                        visual_doc += f"  - {role}: {', '.join(fields)}\n"
            
            if data_sources:
                visual_doc += f"Tables Referenced: {', '.join(data_sources)}\n"
            
            if key_properties:
                visual_doc += "Key Configuration:\n"
                if 'title' in key_properties:
                    title_text = key_properties['title'].get('text', {}).get('expr', {}).get('Literal', {}).get('Value', '')
                    if title_text:
                        visual_doc += f"  - Title: {title_text}\n"
                if 'general' in key_properties:
                    visual_doc += f"  - General properties configured\n"
                if 'valueAxis' in key_properties:
                    visual_doc += f"  - Value axis configured\n"
                if 'categoryAxis' in key_properties:
                    visual_doc += f"  - Category axis configured\n"
            
            documents.append(Document(
                page_content=visual_doc,
                metadata={
                    "source": "visual_schema",
                    "visual_type": visual_type,
                    "page_name": section_name,
                    "data_sources": data_sources,
                    "type": "visual"
                }
            ))

        # 7. Create page summary documents
        for page in pages:
            page_name = page.get('name', 'Unknown')
            visual_count = page.get('visual_count', 0)
            
            # Get all visuals for this page
            page_visuals = [v for v in visuals if v.get('section_name') == page_name]
            visual_types = list(set(v.get('visual_type', 'unknown') for v in page_visuals))
            all_data_sources = []
            for visual in page_visuals:
                all_data_sources.extend(visual.get('data_sources', []))
            unique_data_sources = list(set(all_data_sources))
            
            page_doc = f"Report Page: {page_name}\n"
            page_doc += f"Visuals: {visual_count}\n"
            page_doc += f"Visual Types: {', '.join(visual_types)}\n"
            if unique_data_sources:
                page_doc += f"Data Sources: {', '.join(unique_data_sources)}\n"
            
            documents.append(Document(
                page_content=page_doc,
                metadata={
                    "source": "page_summary",
                    "page_name": page_name,
                    "visual_count": visual_count,
                    "visual_types": visual_types,
                    "type": "page"
                }
            ))

        # 8. Create cross-reference documents linking tables to visuals
        table_visual_map = {}
        for i, visual in enumerate(visuals, 1):
            data_sources = visual.get('data_sources', [])
            visual_type = visual.get('visual_type', 'unknown')
            page_name = visual.get('section_name', 'Unknown')
            
            for table in data_sources:
                if table not in table_visual_map:
                    table_visual_map[table] = []
                table_visual_map[table].append({
                    'index': i,
                    'type': visual_type,
                    'page': page_name
                })
        
        for table_name, visual_refs in table_visual_map.items():
            cross_ref_doc = f"Table {table_name} is used in visuals:\n"
            for ref in visual_refs:
                cross_ref_doc += f"- Visual {ref['index']} ({ref['type']}) on page {ref['page']}\n"
            
            documents.append(Document(
                page_content=cross_ref_doc,
                metadata={
                    "source": "table_visual_cross_reference",
                    "table_name": table_name,
                    "visual_count": len(visual_refs),
                    "type": "cross_reference"
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
