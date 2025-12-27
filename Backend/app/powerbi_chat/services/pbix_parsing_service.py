# app/powerbi_chat/services/pbix_parsing_service.py


import logging
import json
from typing import Dict, List, Any
from app.powerbi_docs.pbixray import PBIXRay
# Document chunking removed - not needed for diagnostics (only metadata extraction)

logger = logging.getLogger(__name__)

class PBIXParsingService:
    """
    Service for extracting and transforming PBIX file metadata.
    Only extracts structured metadata for diagnostics - no document chunking needed.
    """
    @staticmethod
    def extract_metadata_with_summary(
        filepath: str, filename: str
    ) -> dict:
        """
        High-level method to extract structured metadata and create summary metadata.
        Returns only metadata dictionary (no documents for embeddings).
        """

        import time
        start_time = time.time()
    
        raw_data = PBIXParsingService._extract_raw_data(filepath)
        
        extraction_time = time.time() - start_time
        logger.info(f"Raw data extraction completed in {extraction_time:.2f} seconds")

        transform_start = time.time()
        structured_metadata = PBIXParsingService._transform_to_structured_metadata(
            raw_data
        )
        transform_time = time.time() - transform_start
        logger.info(f"Metadata transformation completed in {transform_time:.2f} seconds")
        
        total_time = time.time() - start_time
        logger.info(f"Total PBIX processing time: {total_time:.2f} seconds")

        # Create summary metadata (not the full PBIX data)
        import os
        from datetime import datetime

        # Calculate summary statistics
        tables = structured_metadata.get("tables", [])
        total_measures = sum(len(t.get("measures", [])) for t in tables)
        total_columns = sum(len(t.get("columns", [])) for t in tables)
        relationships = structured_metadata.get("relationships", [])
        power_query_scripts = structured_metadata.get("power_query_scripts", [])
        visuals = structured_metadata.get("visuals", [])
        pages = structured_metadata.get("pages", [])

        collection_metadata = {
            "filename": filename,
            "upload_time": datetime.now().isoformat(),
            "file_size": os.path.getsize(filepath),
            "upload_id": f"upload_{datetime.now().timestamp()}",
            "summary": {
                "tables_count": len(tables),
                "measures_count": total_measures,
                "columns_count": total_columns,
                "relationships_count": len(relationships),
                "power_query_scripts_count": len(power_query_scripts),
                "pages_count": len(pages),
                "visuals_count": len(visuals),
            },
            # Include structured_metadata for summary generation
            "structured_metadata": PBIXParsingService._clean_metadata_for_json(structured_metadata),
        }

        return collection_metadata

    @staticmethod
    def _extract_action_button_info(single_visual: Dict[str, Any], bookmarks: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Extract actionButton-specific information including action type, target, and button text.
        
        Args:
            single_visual: The singleVisual dictionary from the visual config
            bookmarks: Optional list of bookmarks to look up bookmark names by ID
            
        Returns:
            Dictionary with actionButton information including:
            - action_type: Type of action (Bookmark, Page, URL, etc.)
            - action_target: Target of the action (bookmark name, page name, URL, etc.)
            - tooltip: Tooltip text describing what the button does
            - button_text: Text displayed on the button
            - icon_shape: Icon shape type (leftArrow, reset, etc.)
        """
        action_info = {}
        
        try:
            # Extract action information from vcObjects.visualLink
            vc_objects = single_visual.get("vcObjects", {})
            visual_link = vc_objects.get("visualLink", [])
            
            if visual_link and isinstance(visual_link, list) and len(visual_link) > 0:
                # Get the first visualLink item (usually the main action)
                link_item = visual_link[0]
                if isinstance(link_item, dict):
                    link_props = link_item.get("properties", {})
                    if link_props:
                        # Extract action type
                        action_type_expr = link_props.get("type", {}).get("expr", {})
                        if action_type_expr:
                            literal = action_type_expr.get("Literal", {})
                            if literal:
                                action_type = literal.get("Value", "")
                                # Remove quotes if present
                                if isinstance(action_type, str) and len(action_type) >= 2:
                                    if action_type[0] == "'" and action_type[-1] == "'":
                                        action_type = action_type[1:-1]
                                action_info["action_type"] = action_type
                        
                        # Extract action target (bookmark, page, URL, etc.)
                        bookmark_expr = link_props.get("bookmark", {}).get("expr", {})
                        if bookmark_expr:
                            literal = bookmark_expr.get("Literal", {})
                            if literal:
                                bookmark_id = literal.get("Value", "")
                                # Remove quotes if present
                                if isinstance(bookmark_id, str) and len(bookmark_id) >= 2:
                                    if bookmark_id[0] == "'" and bookmark_id[-1] == "'":
                                        bookmark_id = bookmark_id[1:-1]
                                
                                # If bookmarks are provided, look up the bookmark name (since bookmark_expr exists, it's a bookmark action)
                                if bookmarks:
                                    bookmark_name = PBIXParsingService._lookup_bookmark_name(bookmark_id, bookmarks)
                                    action_info["action_target"] = bookmark_name if bookmark_name else bookmark_id
                                else:
                                    action_info["action_target"] = bookmark_id
                        
                        # Extract tooltip
                        tooltip_expr = link_props.get("tooltip", {}).get("expr", {})
                        if tooltip_expr:
                            literal = tooltip_expr.get("Literal", {})
                            if literal:
                                tooltip = literal.get("Value", "")
                                # Remove quotes if present
                                if isinstance(tooltip, str) and len(tooltip) >= 2:
                                    if tooltip[0] == "'" and tooltip[-1] == "'":
                                        tooltip = tooltip[1:-1]
                                action_info["tooltip"] = tooltip
                        
                        # Check for other action types (Page, URL, etc.)
                        page_expr = link_props.get("page", {}).get("expr", {})
                        if page_expr:
                            literal = page_expr.get("Literal", {})
                            if literal:
                                page_name = literal.get("Value", "")
                                if isinstance(page_name, str) and len(page_name) >= 2:
                                    if page_name[0] == "'" and page_name[-1] == "'":
                                        page_name = page_name[1:-1]
                                action_info["action_target"] = page_name
                        
                        url_expr = link_props.get("url", {}).get("expr", {})
                        if url_expr:
                            literal = url_expr.get("Literal", {})
                            if literal:
                                url = literal.get("Value", "")
                                if isinstance(url, str) and len(url) >= 2:
                                    if url[0] == "'" and url[-1] == "'":
                                        url = url[1:-1]
                                action_info["action_target"] = url
            
            # Extract button text from objects.text
            objects = single_visual.get("objects", {})
            text_obj = objects.get("text", [])
            
            if text_obj and isinstance(text_obj, list):
                # Find the text item with the actual text value (usually the second item with selector "default")
                for text_item in text_obj:
                    if isinstance(text_item, dict):
                        text_props = text_item.get("properties", {})
                        if text_props:
                            text_expr = text_props.get("text", {}).get("expr", {})
                            if text_expr:
                                literal = text_expr.get("Literal", {})
                                if literal:
                                    button_text = literal.get("Value", "")
                                    # Remove quotes if present
                                    if isinstance(button_text, str) and len(button_text) >= 2:
                                        if button_text[0] == "'" and button_text[-1] == "'":
                                            button_text = button_text[1:-1]
                                    if button_text:
                                        action_info["button_text"] = button_text
                                        break  # Found the text, no need to continue
            
            # Extract icon shape from objects.icon
            icon_obj = objects.get("icon", [])
            if icon_obj and isinstance(icon_obj, list) and len(icon_obj) > 0:
                icon_item = icon_obj[0]
                if isinstance(icon_item, dict):
                    icon_props = icon_item.get("properties", {})
                    if icon_props:
                        shape_expr = icon_props.get("shapeType", {}).get("expr", {})
                        if shape_expr:
                            literal = shape_expr.get("Literal", {})
                            if literal:
                                icon_shape = literal.get("Value", "")
                                # Remove quotes if present
                                if isinstance(icon_shape, str) and len(icon_shape) >= 2:
                                    if icon_shape[0] == "'" and icon_shape[-1] == "'":
                                        icon_shape = icon_shape[1:-1]
                                action_info["icon_shape"] = icon_shape
        
        except Exception as e:
            logger.warning(f"Error extracting actionButton info: {e}")
        
        return action_info

    @staticmethod
    def _lookup_bookmark_name(bookmark_id: str, bookmarks: List[Dict[str, Any]]) -> str:
        """
        Look up a bookmark's display name by its ID.
        
        Args:
            bookmark_id: The bookmark ID to look up
            bookmarks: List of bookmark dictionaries
            
        Returns:
            The bookmark's displayName if found, otherwise empty string
        """
        if not bookmark_id or not bookmarks:
            return ""
        
        for bookmark in bookmarks:
            if isinstance(bookmark, dict):
                # Check if the bookmark's 'name' field matches the ID
                bookmark_name = bookmark.get("name", "")
                if bookmark_name == bookmark_id:
                    # Return displayName (always use displayName, not the name/ID)
                    display_name = bookmark.get("displayName", "")
                    return display_name
        
        return ""

    @staticmethod
    def _convert_to_bracket_notation(field_ref: str) -> str:
        """
        Convert field reference from Table.Column format to Table[Column] format.
        
        Args:
            field_ref: Field reference in format like "Table.Column" or "Table[Column]"
            
        Returns:
            Field reference in Table[Column] format
        """
        if not field_ref:
            return field_ref
        
        # If already in bracket notation, return as is
        if '[' in field_ref and ']' in field_ref:
            return field_ref
        
        # Convert dot notation to bracket notation
        if '.' in field_ref:
            parts = field_ref.split('.')
            if len(parts) == 2:
                return f"{parts[0]}[{parts[1]}]"
        
        return field_ref

    @staticmethod
    def _parse_visual_config(config_json: str, bookmarks: List[Dict[str, Any]] = None) -> Dict[str, Any]:
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
                "name": config.get("name", ""),
                "visual_type": "unknown",
                "fields_used": {},
                "data_sources": [],
                "key_properties": {},
                "action_button_info": {},  # For actionButton visuals
            }

            # Extract single visual information
            # Handle both legacy (singleVisual) and new format (visual)
            single_visual = config.get("singleVisual", {})
            
            # Fallback: if singleVisual not found, check for new format visual
            if not single_visual and "visual" in config:
                # Convert new format to singleVisual structure inline
                visual = config["visual"]
                single_visual = {
                    "visualType": visual.get("visualType", "unknown"),
                    "projections": {},
                    "prototypeQuery": {"Select": []}
                }
                
                # Extract projections from query.queryState
                query = visual.get("query", {})
                query_state = query.get("queryState", {})
                
                for role, role_data in query_state.items():
                    if not isinstance(role_data, dict):
                        continue
                    
                    projections = role_data.get("projections", [])
                    if not isinstance(projections, list):
                        continue
                    
                    field_list = []
                    select_items = []
                    
                    for proj in projections:
                        if not isinstance(proj, dict):
                            continue
                        
                        query_ref = proj.get("queryRef")
                        if query_ref:
                            field_list.append({"queryRef": query_ref})
                            select_items.append({"Name": query_ref})
                    
                    if field_list:
                        single_visual["projections"][role] = field_list
                        single_visual["prototypeQuery"]["Select"].extend(select_items)
                
                # Copy objects if present
                if "objects" in visual:
                    single_visual["objects"] = visual["objects"]

            if single_visual:
                visual_info["visual_type"] = single_visual.get("visualType", "unknown")
                # Extract projections (fields used)
                projections = single_visual.get("projections", {})
                for role, fields in projections.items():
                    if isinstance(fields, list):
                        field_names = []
                        for field in fields:
                            if isinstance(field, dict) and "queryRef" in field:
                                # Convert to Table[Column] format
                                field_ref = field["queryRef"]
                                converted_ref = PBIXParsingService._convert_to_bracket_notation(field_ref)
                                field_names.append(converted_ref)
                        visual_info["fields_used"][role] = field_names

                # Extract prototype query for data sources (now stores detailed field references)
                prototype_query = single_visual.get("prototypeQuery", {})

                if prototype_query:
                    # Extract select clause for detailed field info (detailed Table[Column] references)
                    select_clause = prototype_query.get("Select", [])
                    for select_item in select_clause:
                        if isinstance(select_item, dict):
                            name = select_item.get("Name", "")
                            if name:
                                # Convert to Table[Column] format and add to data_sources
                                converted_ref = PBIXParsingService._convert_to_bracket_notation(name)
                                if converted_ref not in visual_info["data_sources"]:
                                    visual_info["data_sources"].append(converted_ref)

                # Extract key formatting properties
                objects = single_visual.get("objects", {})
                if objects:
                    # Extract general properties
                    general = objects.get("general", [])
                    if general and isinstance(general, list) and len(general) > 0:
                        general_props = general[0].get("properties", {})
                        if general_props:
                            visual_info["key_properties"]["general"] = general_props

                    # Extract title information
                    title = objects.get("title", [])
                    if title and isinstance(title, list) and len(title) > 0:
                        title_props = title[0].get("properties", {})
                        if title_props:
                            visual_info["key_properties"]["title"] = title_props

                    # Extract axis properties for charts
                    if "valueAxis" in objects:
                        value_axis = objects.get("valueAxis", [])
                        if (
                            value_axis
                            and isinstance(value_axis, list)
                            and len(value_axis) > 0
                        ):
                            axis_props = value_axis[0].get("properties", {})
                            if axis_props:
                                visual_info["key_properties"]["valueAxis"] = axis_props

                    if "categoryAxis" in objects:
                        category_axis = objects.get("categoryAxis", [])
                        if (
                            category_axis
                            and isinstance(category_axis, list)
                            and len(category_axis) > 0
                        ):
                            axis_props = category_axis[0].get("properties", {})
                            if axis_props:
                                visual_info["key_properties"][
                                    "categoryAxis"
                                ] = axis_props

                # Extract actionButton-specific information
                if visual_info["visual_type"] == "actionButton":
                    action_info = PBIXParsingService._extract_action_button_info(single_visual, bookmarks)
                    if action_info:
                        visual_info["action_button_info"] = action_info

            return visual_info

        except (json.JSONDecodeError, KeyError, TypeError) as e:

            logger.warning(f"Error parsing visual config: {e}")

            return {
                "name": "",
                "visual_type": "unknown",
                "fields_used": {},
                "data_sources": [],
                "key_properties": {},
                "action_button_info": {},
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
            if hasattr(data, "empty"):
                return data.empty
            elif hasattr(data, "shape"):
                return data.shape[0] == 0
            else:
                return len(data) == 0

        # Extract table columns from schema metadata (FAST - no data loading)
        # Using schema DataFrame which already contains TableName, ColumnName, DataType
        table_columns = PBIXParsingService._extract_columns_from_schema(pbix_model)

        # Extract all available properties (like old implementation)

        all_properties = [
            "tables",
            "dax_tables",
            "dax_measures",
            "dax_columns",
            "relationships",
            "metadata",
            "power_query",
            "statistics",
            "schema",
        ]

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
        extracted_data["table_columns"] = table_columns

        # Extract visuals from report layout
        try:
            visuals = pbix_model.visuals
            extracted_data["visuals"] = visuals
        except Exception as e:
            logger.warning(f"Could not extract visuals: {str(e)}")
            extracted_data["visuals"] = []

        # Extract RLS roles
        try:
            rls_roles = pbix_model.rls_roles
            extracted_data["rls_roles"] = safe_to_list(rls_roles)
        except Exception as e:
            logger.warning(f"Could not extract RLS roles: {str(e)}")
            extracted_data["rls_roles"] = []

        # Extract bookmarks from report layout
        try:
            bookmarks = pbix_model.bookmarks
            extracted_data["bookmarks"] = safe_to_list(bookmarks)
        except Exception as e:
            logger.warning(f"Could not extract bookmarks: {str(e)}")
            extracted_data["bookmarks"] = []
        
        return extracted_data

    @staticmethod
    def _extract_columns_from_schema(pbix_model) -> List[Dict[str, Any]]:
        """
        Extract column information from schema DataFrame without loading actual table data.
        
        This is MUCH faster than calling pbix_model.get_table() for each table, which 
        decompresses and loads potentially millions of rows. The schema DataFrame already
        contains TableName, ColumnName, and DataType information.
        
        Args:
            pbix_model: PBIXRay instance
            
        Returns:
            List of dictionaries with column information matching the old format
        """
        import time
        start_time = time.time()
        
        table_columns = []
        
        try:
            # Get schema DataFrame - this is fast, already loaded in memory
            schema_df = pbix_model.schema
            
            # Check if schema is available
            if schema_df is None or schema_df.empty:
                logger.warning("Schema DataFrame is empty or unavailable")
                return []
            
            # Reverse mapping from pandas types back to original types
            # We'll use the PandasDataType as-is since it's already mapped
            pandas_to_amo = {
                'string': 2,
                'Int64': 6,
                'Float64': 8,
                'datetime64[ns]': 9,
                'decimal.Decimal': 10,
                'bool': 11,
                'bytes': 17,
                'object': 'object'
            }
            
            # Convert DataFrame to list of dictionaries
            for _, row in schema_df.iterrows():
                table_name = row.get('TableName', '')
                column_name = row.get('ColumnName', '')
                pandas_dtype = row.get('PandasDataType', 'object')
                
                # Keep pandas dtype as the DataType - it's already correctly mapped
                # and will be properly handled downstream
                table_columns.append({
                    "TableName": table_name,
                    "ColumnName": column_name,
                    "DataType": str(pandas_dtype),  # e.g., "string", "Int64", "Float64", etc.
                    "IsHidden": False,
                    "Source": "schema",
                })
            
            elapsed = time.time() - start_time
            logger.info(f"Extracted {len(table_columns)} columns from schema in {elapsed:.2f} seconds")
            
        except Exception as e:
            logger.error(f"Error extracting columns from schema: {str(e)}", exc_info=True)
            # Return empty list if extraction fails - downstream code will handle gracefully
            table_columns = []
        
        return table_columns

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
            if (
                isinstance(table_data, dict)
                and "Name" in table_data
                and table_data["Name"]
            ):
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
                if meta_data.get("Type") == "Table" or "Table" in str(
                    meta_data.get("Type", "")
                ):
                    table_name = meta_data.get("Name") or meta_data.get("TableName")
                    if table_name and str(table_name).strip():
                        all_table_names.add(str(table_name).strip())

        # Create tables list first (like old implementation)

        tables = []
        for name in all_table_names:
            tables.append({"name": name, "columns": [], "measures": []})

        # Create a quick lookup map for tables for faster linking (like old implementation)
        table_map = {table["name"]: table for table in tables}

        # 2. Process columns from multiple sources (like old implementation)
        raw_columns = []

        # Add dax_columns
        raw_columns.extend(raw_data.get("dax_columns", []))

        # Add table_columns from actual table data
        raw_columns.extend(raw_data.get("table_columns", []))

        # Add columns from schema
        for schema_data in raw_data.get("schema", []):
            if isinstance(schema_data, dict):
                if any(
                    key in schema_data
                    for key in ["ColumnName", "Name", "DataType", "Data Type"]
                ):

                    raw_columns.append(schema_data)

        # Add columns from statistics
        for stat_data in raw_data.get("statistics", []):
            if isinstance(stat_data, dict):
                if any(
                    key in stat_data
                    for key in ["ColumnName", "Name", "DataType", "Data Type"]
                ):
                    raw_columns.append(stat_data)

        # Add columns from metadata
        for meta_data in raw_data.get("metadata", []):
            if isinstance(meta_data, dict) and (
                meta_data.get("Type") == "Column"
                or "Column" in str(meta_data.get("Type", ""))
            ):
                raw_columns.append(meta_data)

        # Process all columns with robust fallbacks (like old implementation)
        for col_data in raw_columns:
            if isinstance(col_data, dict):
                table_name = (
                    col_data.get("TableName")
                    or col_data.get("Table")
                    or col_data.get("ParentName")
                )
                col_name = col_data.get("Name") or col_data.get("ColumnName")

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
                        for existing_col in table_map[found_table]["columns"]:
                            if existing_col["name"] == col_name:
                                existing_column = existing_col
                                break

                        # Get the best data type information
                        data_type = col_data.get(
                            "DataType", col_data.get("Data Type", "Unknown")
                        )

                        if existing_column:
                            # Update existing column with better data type if available
                            if (
                                existing_column["dataType"] == "Unknown"
                                and data_type != "Unknown"
                            ):
                                existing_column["dataType"] = data_type

                        else:
                            # Add new column
                            column_info = {
                                "name": col_name,
                                "dataType": data_type,
                                "table": found_table,
                            }
                            table_map[found_table]["columns"].append(column_info)

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
            if isinstance(meta_data, dict) and (
                meta_data.get("Type") == "Measure"
                or "Measure" in str(meta_data.get("Type", ""))
            ):

                raw_measures.append(meta_data)
        for measure_data in raw_measures:
            if isinstance(measure_data, dict):
                table_name = (
                    measure_data.get("TableName")
                    or measure_data.get("Table")
                    or measure_data.get("ParentName")
                )
                measure_name = measure_data.get("Name")
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
                            "name": measure_name,
                            "expression": measure_data.get(
                                "Expression", measure_data.get("Formula", "")
                            ),
                            "table": found_table,
                        }

                        table_map[found_table]["measures"].append(measure_info)

                    else:
                        logger.warning(
                            f"Could not link measure '{measure_name}' to table '{table_name}'. Available tables: {list(table_map.keys())}"
                        )

                else:
                    logger.warning(f"Measure data missing name: {measure_data}")

            else:
                logger.warning(f"Measure data is not a dictionary: {measure_data}")

        # 4. Process relationships with comprehensive fallbacks (like old implementation)
        relationships = []
        for rel_data in raw_data.get("relationships", []):
            if isinstance(rel_data, dict):
                from_table = rel_data.get("FromTableName") or rel_data.get(
                    "FromTable", ""
                )
                to_table = rel_data.get("ToTableName") or rel_data.get("ToTable", "")

                # Extract table names from relationships to create missing tables (like old implementation)
                if from_table and not any(t["name"] == from_table for t in tables):
                    new_table = {"name": from_table, "columns": [], "measures": []}
                    tables.append(new_table)
                    table_map[from_table] = new_table

                if to_table and not any(t["name"] == to_table for t in tables):
                    new_table = {"name": to_table, "columns": [], "measures": []}
                    tables.append(new_table)
                    table_map[to_table] = new_table

                relationships.append(
                    {
                        "fromTable": from_table,
                        "fromColumn": rel_data.get("FromColumnName")
                        or rel_data.get("FromColumn", ""),
                        "toTable": to_table,
                        "toColumn": rel_data.get("ToColumnName")
                        or rel_data.get("ToColumn", ""),
                        "isActive": rel_data.get("IsActive", True),
                        "fromCardinality": rel_data.get("Cardinality", "Unknown").split(
                            ":"
                        )[0]
                        if ":" in str(rel_data.get("Cardinality", ""))
                        else "Unknown",
                        "toCardinality": rel_data.get("Cardinality", "Unknown").split(
                            ":"
                        )[1]
                        if ":" in str(rel_data.get("Cardinality", ""))
                        else "Unknown",
                        "crossFilteringBehavior": rel_data.get(
                            "CrossFilteringBehavior", "Unknown"
                        ),
                        "fromKeyCount": PBIXParsingService._safe_numeric_value(rel_data.get("FromKeyCount", 0)),
                        "toKeyCount": PBIXParsingService._safe_numeric_value(rel_data.get("ToKeyCount", 0)),
                        "relyOnReferentialIntegrity": rel_data.get(
                            "RelyOnReferentialIntegrity", False
                        ),
                    }
                )

            else:

                logger.warning(f"Relationship data is not a dictionary: {rel_data}")

        # 5. Process Power Query scripts with comprehensive fallbacks and transformation extraction
        power_query_scripts = []
        for pq in raw_data.get("power_query", []):
            if isinstance(pq, dict):
                script_name = (
                    pq.get("Name")
                    or pq.get("QueryName")
                    or pq.get("TableName", "Unknown")
                )
                m_code = pq.get("MCode") or pq.get("Expression") or pq.get("Query", "")
                power_query_scripts.append(
                    {
                        "name": script_name,
                        "m_code": m_code,
                    }
                )

        # 6. Process visuals from report layout
        visuals = []
        pages = []
        raw_visuals = raw_data.get("visuals", [])
        # Get raw bookmarks for bookmark name lookup
        raw_bookmarks = raw_data.get("bookmarks", [])
        for visual_data in raw_visuals:
            try:
                # Parse the visual configuration
                config_json = visual_data.get("config", "{}")
                parsed_config = PBIXParsingService._parse_visual_config(config_json, raw_bookmarks)
                # Skip image visuals
                visual_type = parsed_config.get("visual_type", "unknown")
                if visual_type == "image":
                    continue
                
                # Extract position and size - handle both top-level and nested formats
                # The unpacker should flatten position data to top level, but handle both cases
                # Check if position is nested (raw format) or at top level (unpacked format)
                x = None
                y = None
                z = None
                width = None
                height = None
                
                # First try top-level (unpacked format from pbix_unpacker)
                if "x" in visual_data or "y" in visual_data:
                    x = visual_data.get("x")
                    y = visual_data.get("y")
                    z = visual_data.get("z")
                    width = visual_data.get("width")
                    height = visual_data.get("height")
                # If not found, try nested position object (in case unpacker didn't flatten)
                elif "position" in visual_data:
                    position_obj = visual_data.get("position", {})
                    if isinstance(position_obj, dict):
                        x = position_obj.get("x")
                        y = position_obj.get("y")
                        z = position_obj.get("z")
                        width = position_obj.get("width")
                        height = position_obj.get("height")
                
                # Log warning if position data is missing (for debugging)
                if x is None and y is None and width is None and height is None:
                    logger.warning(
                        f"Visual {visual_data.get('id', 'unknown')} missing position/size data. "
                        f"Available keys: {list(visual_data.keys())}"
                    )
                
                # Create structured visual metadata (without ID, name, and filters)
                visual_metadata = {
                    "visual_type": visual_type,
                    "section_name": visual_data.get("section_name", ""),
                    "section_id": visual_data.get("section_id"),
                    "fields_used": parsed_config.get("fields_used", {}),
                    "data_sources": parsed_config.get("data_sources", []),
                    "key_properties": parsed_config.get("key_properties", {}),
                    "action_button_info": parsed_config.get("action_button_info", {}),
                    "x": x,
                    "y": y,
                    "z": z,
                    "width": width,
                    "height": height,
                }

                visuals.append(visual_metadata)
                # Track pages/sections
                section_name = visual_data.get("section_name", "")
                if section_name and not any(p["name"] == section_name for p in pages):
                    pages.append(
                        {
                            "name": section_name,
                            "id": visual_data.get("section_id"),
                            "visual_count": 0,  # Will be updated below
                        }
                    )

            except Exception as e:
                logger.warning(
                    f"Error processing visual {visual_data.get('id', 'unknown')}: {e}"
                )
                continue

        # Update page visual counts
        for page in pages:
            page["visual_count"] = sum(
                1 for v in visuals if v["section_name"] == page["name"]
            )

        # 7. Process RLS roles
        rls_roles = []
        raw_rls_roles = raw_data.get("rls_roles", [])

        # Group RLS data by role name
        role_groups = {}
        for rls_data in raw_rls_roles:
            if isinstance(rls_data, dict):
                role_name = rls_data.get("RoleName", "")
                if role_name:
                    if role_name not in role_groups:
                        role_groups[role_name] = {
                            "role_name": role_name,
                            "description": rls_data.get("RoleDescription", ""),
                            "table_filters": []
                        }

                    # Add table filter if DAX filter exists
                    table_name = rls_data.get("TableName", "")
                    dax_filter = rls_data.get("DAXFilter", "")
                    if table_name and dax_filter:
                        role_groups[role_name]["table_filters"].append({
                            "table": table_name,
                            "dax_filter": dax_filter
                        })

        # Convert grouped data to list
        for role_data in role_groups.values():
            rls_roles.append(role_data)

        # 8. Process bookmarks
        # Note: bookmarks from pbix_model.bookmarks already contain all detailed information
        # (activeSection, filters, visuals, etc.), so we preserve the full structure
        bookmarks = []
        raw_bookmarks = raw_data.get("bookmarks", [])
        for bookmark_data in raw_bookmarks:
            if isinstance(bookmark_data, dict):
                # Preserve the full bookmark structure with all details
                # The bookmark_data already contains: name, displayName, activeSection, 
                # filters, visuals, targetVisualNames, explorationState
                bookmarks.append(bookmark_data)

        return {
            "tables": tables,
            "relationships": relationships,
            "power_query_scripts": power_query_scripts,
            "visuals": visuals,
            "pages": pages,
            "rls_roles": rls_roles,
            "bookmarks": bookmarks,
        }

    # Document chunking method removed - not needed for diagnostics (only metadata extraction)

    @staticmethod
    def _safe_numeric_value(value, default=0):
        """
        Safely convert a value to a numeric type, handling NaN, None, and invalid values.
        
        Args:
            value: The value to convert
            default: Default value to return if conversion fails
            
        Returns:
            A valid numeric value (int or float) or the default
        """
        import math
        
        if value is None:
            return default
            
        # Handle NaN values
        if isinstance(value, float) and math.isnan(value):
            return default
            
        # Handle string representations of NaN
        if isinstance(value, str) and value.lower() in ['nan', 'null', 'none']:
            return default
            
        try:
            # Try to convert to int first, then float
            if isinstance(value, (int, float)):
                if math.isnan(value):
                    return default
                return int(value) if value == int(value) else float(value)
            
            # Try to convert string to number
            numeric_value = float(value)
            if math.isnan(numeric_value):
                return default
            return int(numeric_value) if numeric_value == int(numeric_value) else numeric_value
            
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _clean_metadata_for_json(data):
        """
        Recursively clean metadata to ensure JSON serialization compatibility.
        Handles NaN values, None values, and other non-serializable types.
        
        Args:
            data: The data structure to clean
            
        Returns:
            Cleaned data structure safe for JSON serialization
        """
        import math
        
        if data is None:
            return None
            
        # Handle NaN values
        if isinstance(data, float) and math.isnan(data):
            return 0
            
        # Handle lists
        if isinstance(data, list):
            return [PBIXParsingService._clean_metadata_for_json(item) for item in data]
            
        # Handle dictionaries
        if isinstance(data, dict):
            cleaned_dict = {}
            for key, value in data.items():
                # Ensure key is string
                clean_key = str(key) if not isinstance(key, str) else key
                cleaned_dict[clean_key] = PBIXParsingService._clean_metadata_for_json(value)
            return cleaned_dict
            
        # Handle other numeric types
        if isinstance(data, (int, float)):
            if math.isnan(data):
                return 0
            return data
            
        # Handle strings
        if isinstance(data, str):
            # Convert string representations of NaN/null to None
            if data.lower() in ['nan', 'null', 'none', '']:
                return None
            return data
            
        # For any other type, try to convert to string
        try:
            return str(data)
        except:
            return None
