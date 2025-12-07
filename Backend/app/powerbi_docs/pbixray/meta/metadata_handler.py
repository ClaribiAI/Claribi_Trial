from .metadata_query import MetadataQuery
from .sqlite_handler import SQLiteHandler
from ..utils import AMO_PANDAS_TYPE_MAPPING, WINDOWS_EPOCH_START, get_data_slice
import pandas as pd
from ..abf.data_model import DataModel
import datetime

# ---------- METADATA HANDLER ----------

class MetadataHandler:
    def __init__(self, data_model:DataModel):
        self._data_model=data_model
        self._load_metadata()
        self._compute_statistics()
        
    def _load_metadata(self):
        """Loads metadata for the given PBIX file."""
        sqliteBuffer = get_data_slice(self._data_model,'metadata.sqlitedb')
        sqliteHandler = SQLiteHandler(sqliteBuffer)
        self._meta = MetadataQuery(sqliteHandler)
    
    def _compute_statistics(self):
        """Computes statistics from the metadata schema."""
        self._stats = self._meta.schema_df[['TableName', 'ColumnName', 'Cardinality']].copy()
        self._stats = self._stats.assign(
            Dictionary=self._meta.schema_df['Dictionary'].map(self._get_file_size_from_log),
            HashIndex=self._meta.schema_df['HIDX'].map(self._get_file_size_from_log),
            DataSize=self._meta.schema_df['IDF'].map(self._get_file_size_from_log),
            ModifiedTime=self._meta.schema_df['ModifiedTime'].apply(
                lambda x: WINDOWS_EPOCH_START + datetime.timedelta(seconds=x / 1e7)),
            StructureModifiedTime=self._meta.schema_df['StructureModifiedTime'].apply(
                lambda x: WINDOWS_EPOCH_START + datetime.timedelta(seconds=x / 1e7))
        )

    def _get_file_size_from_log(self, file_name):
        """Utility to get the size of a file from the log using 'FileName'."""
        file_ref = next((x for x in self._data_model.file_log if x['FileName'] == file_name), None)
        return file_ref['Size'] if file_ref else 0 
    
    @property
    def metadata(self):
        return self._meta
    
    @property
    def stats(self):
        return self._stats
    
    @property
    def size(self):
        return sum([x['Size'] for x in self._data_model.file_log])
    
    @property
    def schema(self):
        return  pd.DataFrame({
            'TableName': self._meta.schema_df['TableName'],
            'ColumnName': self._meta.schema_df['ColumnName'],
            'PandasDataType': self._meta.schema_df['DataType'].map(AMO_PANDAS_TYPE_MAPPING).fillna('object'),
        })

    @property   
    def tables(self):
        return self._meta.schema_df['TableName'].unique()
    
    @property
    def visuals(self):
        """Extract and return visual metadata from the report layout."""
        if not self._data_model.report_layout:
            return []
        
        visuals = []
        sections = self._data_model.report_layout.get('sections', [])
        
        for section in sections:
            section_name = section.get('displayName', section.get('name', 'Unknown Section'))
            visual_containers = section.get('visualContainers', [])
            
            for container in visual_containers:
                visual_data = {
                    'id': container.get('id'),
                    'section_name': section_name,
                    'section_id': section.get('id'),
                    'x': container.get('x'),
                    'y': container.get('y'),
                    'z': container.get('z'),
                    'width': container.get('width'),
                    'height': container.get('height'),
                    'config': container.get('config', '{}'),
                    'filters': container.get('filters', '[]')
                }
                visuals.append(visual_data)
        
        return visuals
    
    @property
    def bookmarks(self):
        """Extract and return bookmarks from the report layout with detailed information."""
        if not self._data_model.report_layout:
            return []
        
        import json
        
        # Try top-level bookmarks first (legacy format)
        bookmarks = self._data_model.report_layout.get('bookmarks', [])
        
        # If not found at top level, check in config (newer format)
        if not bookmarks or not isinstance(bookmarks, list) or len(bookmarks) == 0:
            config = self._data_model.report_layout.get('config', None)
            
            if config:
                # Config might be a JSON string or already a dict
                if isinstance(config, str):
                    try:
                        config_dict = json.loads(config)
                        bookmarks = config_dict.get('bookmarks', [])
                    except (json.JSONDecodeError, TypeError):
                        bookmarks = []
                elif isinstance(config, dict):
                    bookmarks = config.get('bookmarks', [])
                else:
                    bookmarks = []
        
        if not isinstance(bookmarks, list):
            return []
        
        # Get section names for mapping section IDs to names
        # Note: Bookmarks use section 'name' field (like "ReportSection..."), not 'id'
        sections = self._data_model.report_layout.get('sections', [])
        section_map = {}
        for section in sections:
            # Use 'name' field as key (this is what bookmarks reference)
            section_name_key = section.get('name', '')
            section_display_name = section.get('displayName', section_name_key)
            if section_name_key:
                section_map[section_name_key] = section_display_name
        
        # Extract detailed bookmark information
        bookmark_list = []
        for bookmark in bookmarks:
            if isinstance(bookmark, dict):
                # Basic information
                bookmark_name = bookmark.get('name', '')
                display_name = bookmark.get('displayName', bookmark_name)
                
                # Extract exploration state details
                exploration_state = bookmark.get('explorationState', {})
                active_section_id = exploration_state.get('activeSection', '')
                active_section_name = section_map.get(active_section_id, active_section_id)
                
                sections_data = exploration_state.get('sections', {})
                
                # Extract visual information (only if selectedVisuals flag will be true)
                # We'll determine this later, but we need to extract visuals_info for counting
                visuals_info = []
                for section_id, section_data in sections_data.items():
                    visual_containers = section_data.get('visualContainers', {})
                    for visual_id, visual_data in visual_containers.items():
                        single_visual = visual_data.get('singleVisual', {})
                        visual_type = single_visual.get('visualType', '')
                        display_mode = visual_data.get('display', {}).get('mode', 'normal')
                        
                        # Extract active projections (fields/columns used in the visual)
                        active_projections = single_visual.get('activeProjections', {})
                        fields_used = {}
                        for role, fields in active_projections.items():
                            if isinstance(fields, list):
                                field_names = []
                                for field in fields:
                                    field_name = self._extract_field_name_from_expression(field)
                                    if field_name:
                                        field_names.append(field_name)
                                if field_names:
                                    fields_used[role] = field_names
                        
                        # Extract query information
                        query = single_visual.get('query', {})
                        query_state = query.get('queryState', {})
                        query_info = {}
                        if query_state:
                            # Extract fields from query state
                            query_fields = []
                            for role, role_data in query_state.items():
                                if isinstance(role_data, dict):
                                    projections = role_data.get('projections', [])
                                    if isinstance(projections, list):
                                        for proj in projections:
                                            query_ref = proj.get('queryRef', '')
                                            if query_ref:
                                                query_fields.append(query_ref)
                            if query_fields:
                                query_info['fields'] = query_fields
                        
                        visuals_info.append({
                            'type': visual_type,
                            'display_mode': display_mode,
                            'fields_used': fields_used,
                            'query': query_info if query_info else None
                        })
                
                # Extract options and flags
                options = bookmark.get('options', {})
                suppress_data = options.get('suppressData', True)
                suppress_display = options.get('suppressDisplay', True)
                target_visual_names = options.get('targetVisualNames', [])
                
                # Determine flags
                # Data flag: true if data is captured (suppressData is false)
                data_flag = not suppress_data
                # Display flag: true if display is captured (suppressDisplay is false)
                display_flag = not suppress_display
                # Current page flag: true if activeSection exists
                current_page_flag = bool(active_section_id)
                # All visuals flag: true if targetVisualNames is empty
                all_visuals_flag = len(target_visual_names) == 0
                # Selected visuals flag: true if targetVisualNames has values
                selected_visuals_flag = len(target_visual_names) > 0
                
                bookmark_data = {
                    'name': bookmark_name,  # Include name field for bookmark ID lookup
                    'displayName': display_name,
                    'flags': {
                        'data': data_flag,
                        'display': display_flag,
                        'currentPage': current_page_flag,
                        'allVisuals': all_visuals_flag,
                        'selectedVisuals': selected_visuals_flag
                    },
                    'activeSection': {
                        'name': active_section_name
                    }
                }
                
                # Only include target visual names if selectedVisuals flag is true
                if selected_visuals_flag:
                    bookmark_data['targetVisualNames'] = target_visual_names
                    # Include visuals info only when selected visuals
                    bookmark_data['visuals'] = visuals_info
                bookmark_list.append(bookmark_data)
        
        return bookmark_list
    
    def _extract_field_name_from_expression(self, expression):
        """Extract field/column name from a Power BI expression structure."""
        if not isinstance(expression, dict):
            return ''
        
        # Try Column expression
        column = expression.get('Column', {})
        if column:
            expr = column.get('Expression', {})
            source_ref = expr.get('SourceRef', {})
            entity = source_ref.get('Entity', '')
            property_name = column.get('Property', '')
            if entity and property_name:
                return f"{entity}[{property_name}]"
        
        # Try Measure expression
        measure = expression.get('Measure', {})
        if measure:
            expr = measure.get('Expression', {})
            source_ref = expr.get('SourceRef', {})
            entity = source_ref.get('Entity', '')
            property_name = measure.get('Property', '')
            if entity and property_name:
                return f"{entity}[{property_name}]"
        
        return ''