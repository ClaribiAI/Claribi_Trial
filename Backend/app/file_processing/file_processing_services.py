"""File Processing Services Module

This module contains business logic related to file processing functionality.
It was extracted from the original routes.py and model.py as part of the application restructuring.
"""

from app.services.file_parser import parse_file_content
from app.core.logging import get_logger
from app.core.exceptions import AppError
from app.core.database import get_db_cursor
from app.projects.services.project_service import ProjectService
import json
from psycopg2.extras import Json

logger = get_logger(__name__)

class FileProcessingError(AppError):
    """Base exception class for file processing errors."""
    def __init__(self, message: str = None):
        super().__init__(message or "File processing error occurred", 500)

class FileProcessingService:
    """Service class for file processing operations."""
    
    @staticmethod
    def detect_table_conflicts(files, project_id, report_id):
        """Detect conflicts between uploaded files and existing tables
        
        Args:
            files (list): List of file objects from request.files
            project_id (int): The ID of the project
            report_id (int): The ID of the report
            
        Returns:
            dict: Dictionary containing conflict information
            {
                'has_conflicts': bool,
                'conflicting_tables': list of table names,
                'new_tables': list of table names,
                'tables_info': parsed tables info from uploaded files
            }
            
        Raises:
            FileProcessingError: If file processing fails
        """
        try:
            # Get existing project data
            existing_data = ProjectService.get_project_data(project_id, report_id)
            existing_tables = {}
            if existing_data and existing_data.get('tables_info'):
                existing_tables = existing_data['tables_info']
            
            # Parse uploaded files
            uploaded_tables_info = {}
            for file in files:
                if file.filename and file.filename.endswith(".tmdl"):
                    try:
                        # Process file content directly in memory
                        file_content = file.read().decode('utf-8')
                        file.seek(0)  # Reset file pointer for future use
                        file_tables_info = parse_file_content(file_content)
                        uploaded_tables_info.update(file_tables_info)
                    except Exception as e:
                        logger.error(f"Error processing file {file.filename}: {str(e)}")
                        # Silently continue on error
                        pass
            
            # Detect conflicts
            conflicting_tables = []
            new_tables = []
            
            for table_name in uploaded_tables_info:
                if table_name in existing_tables:
                    conflicting_tables.append(table_name)
                else:
                    new_tables.append(table_name)
            
            return {
                'has_conflicts': len(conflicting_tables) > 0,
                'conflicting_tables': conflicting_tables,
                'new_tables': new_tables,
                'tables_info': uploaded_tables_info
            }
        except Exception as e:
            logger.error(f"Error detecting table conflicts: {str(e)}")
            raise FileProcessingError(f"Failed to detect table conflicts: {str(e)}")

    @staticmethod
    def process_uploaded_files(files, project_id, report_id, overwrite_tables=None):
        """Process uploaded TMDL files and extract table information
        
        Args:
            files (list): List of file objects from request.files
            project_id (int): The ID of the project
            report_id (int): The ID of the report
            overwrite_tables (list, optional): List of table names to overwrite. If None, all tables will be merged.
            
        Returns:
            dict: Dictionary containing extracted tables_info
            
        Raises:
            FileProcessingError: If file processing fails
        """
        try:
            tables_info = {}
            
            for file in files:
                if file.filename and file.filename.endswith(".tmdl"):
                    try:
                        # Process file content directly in memory
                        file_content = file.read().decode('utf-8')
                        file_tables_info = parse_file_content(file_content)
                        tables_info.update(file_tables_info)
                    except Exception as e:
                        logger.error(f"Error processing file {file.filename}: {str(e)}")
                        # Silently continue on error
                        pass
            
            # Save to database if tables_info was extracted
            if tables_info:
                try:
                    # Get existing project data first
                    existing_data = ProjectService.get_project_data(project_id, report_id)
                    
                    # Merge new tables_info with existing tables_info if it exists
                    merged_tables_info = {}
                    if existing_data and existing_data.get('tables_info'):
                        merged_tables_info.update(existing_data['tables_info'])
                    
                    # If overwrite_tables is provided, only overwrite those tables
                    if overwrite_tables is not None:
                        # For each table in tables_info
                        for table_name, table_data in tables_info.items():
                            # If this table should be overwritten or is a new table, add it
                            if table_name in overwrite_tables or table_name not in merged_tables_info:
                                merged_tables_info[table_name] = table_data
                    else:
                        # Add all tables (overwrite existing ones)
                        merged_tables_info.update(tables_info)
                    
                    # Save data using ProjectService
                    success, saved_report_id = ProjectService.save_project_data(
                        project_id=project_id,
                        report_id=report_id,
                        tables_info=merged_tables_info,
                        selected_data=existing_data.get('selected_data') if existing_data else None,
                        report_url=existing_data.get('report_url') if existing_data else None,
                        synonyms=existing_data.get('synonyms') if existing_data else None,
                        value_rules=existing_data.get('value_rules') if existing_data else None
                    )
                    
                    if not success:
                        raise FileProcessingError("Failed to save project data")
                            
                except Exception as e:
                    logger.error(f"Error saving project data: {str(e)}")
                    raise FileProcessingError(f"Failed to save project data: {str(e)}")
            
            return tables_info
        except Exception as e:
            logger.error(f"Error processing uploaded files: {str(e)}")
            raise FileProcessingError(f"Failed to process uploaded files: {str(e)}")

    @staticmethod
    def convert_special_chars(text):
        """Convert special characters in text to a format suitable for Power BI URLs
        
        Args:
            text (str): The text to convert
            
        Returns:
            str: The converted text
        """
        result = ""
        for char in str(text):
            # Only keep basic ASCII letters (a-z, A-Z)
            if char.isascii() and char.isalpha():
                result += char
            else:
                # Convert everything else (numbers, spaces, special chars, accented chars) to Unicode
                unicode_hex = format(ord(char), '04x').upper()
                result += f"_x{unicode_hex}x_"
        return result

    @staticmethod
    def process_selection_data(request_form, tables_info):
        """Process form data for selected columns and measures
        
        Args:
            request_form: Flask request form data
            tables_info (dict): Dictionary containing table information
            
        Returns:
            tuple: (selected_data, synonyms) containing processed selections
            
        Raises:
            FileProcessingError: If processing fails
        """
        try:
            selected_data = {}
            synonyms = {}
            
            # First, parse all form keys to identify selected columns and measures
            form_keys = list(request_form.keys())
            
            # Process all form keys to extract table and field information
            for key in form_keys:
                # Check if this is a column selection
                if key.startswith('columns_'):
                    # Format is 'columns_TableName_ColumnName'
                    parts = key.split('_', 2)  # Split into ['columns', 'TableName', 'ColumnName']
                    
                    if len(parts) == 3:
                        table_name = parts[1]
                        column_name = parts[2]
                        
                        # Initialize table in selected_data if not exists
                        if table_name not in selected_data:
                            selected_data[table_name] = {
                                'columns': [],
                                'measures': [],
                                'column_types': {}
                            }
                        
                        # Add column to selected columns
                        if column_name not in selected_data[table_name]['columns']:
                            selected_data[table_name]['columns'].append(column_name)
                            
                            # Add column type if available in tables_info
                            if table_name in tables_info and 'columns' in tables_info[table_name]:
                                if column_name in tables_info[table_name]['columns']:
                                    selected_data[table_name]['column_types'][column_name] = tables_info[table_name]['columns'][column_name]
                
                # Check if this is a measure selection
                elif key.startswith('measures_'):
                    # Format is 'measures_TableName_MeasureName'
                    parts = key.split('_', 2)  # Split into ['measures', 'TableName', 'MeasureName']
                    
                    if len(parts) == 3:
                        table_name = parts[1]
                        measure_name = parts[2]
                        
                        # Initialize table in selected_data if not exists
                        if table_name not in selected_data:
                            selected_data[table_name] = {
                                'columns': [],
                                'measures': [],
                                'column_types': {}
                            }
                        
                        # Add measure to selected measures
                        if measure_name not in selected_data[table_name]['measures']:
                            selected_data[table_name]['measures'].append(measure_name)
                
                # Check if this is a synonym input
                elif key.startswith('synonyms_'):
                    # Format is 'synonyms_TableName_ColumnName' or 'synonyms_TableName_MeasureName'
                    parts = key.split('_', 2)  # Split into ['synonyms', 'TableName', 'FieldName']
                    
                    if len(parts) == 3:
                        table_name = parts[1]
                        field_name = parts[2]
                        synonym_input = request_form[key].strip()
                        
                        if not synonym_input:
                            continue
                        
                        # Initialize table in synonyms if not exists
                        if table_name not in synonyms:
                            synonyms[table_name] = {
                                'column': {},
                                'measure': {}
                            }
                        
                        # Determine if this is a column or measure
                        is_column = False
                        is_measure = False
                        
                        if table_name in tables_info:
                            if 'columns' in tables_info[table_name] and field_name in tables_info[table_name]['columns']:
                                is_column = True
                            elif 'measures' in tables_info[table_name] and field_name in tables_info[table_name]['measures']:
                                is_measure = True
                            
                            if is_column:
                                if 'column' not in synonyms[table_name]:
                                    synonyms[table_name]['column'] = {}
                                if field_name not in synonyms[table_name]['column']:
                                    synonyms[table_name]['column'][field_name] = []
                                    
                                existing_synonyms = synonyms[table_name]['column'].get(field_name, [])
                                new_synonyms = [syn.strip() for syn in synonym_input.split(',') if syn.strip()]
                                synonyms[table_name]['column'][field_name] = list(set(existing_synonyms + new_synonyms))
                            
                            elif is_measure:
                                if 'measure' not in synonyms[table_name]:
                                    synonyms[table_name]['measure'] = {}
                                if field_name not in synonyms[table_name]['measure']:
                                    synonyms[table_name]['measure'][field_name] = []
                                    
                                existing_synonyms = synonyms[table_name]['measure'].get(field_name, [])
                                new_synonyms = [syn.strip() for syn in synonym_input.split(',') if syn.strip()]
                                synonyms[table_name]['measure'][field_name] = list(set(existing_synonyms + new_synonyms))
            
            return selected_data, synonyms
        except Exception as e:
            logger.error(f"Error processing selection data: {str(e)}")
            raise FileProcessingError(f"Failed to process selection data: {str(e)}")

    @staticmethod
    def escape_value(value):
        """Escape special characters in values for Power BI URLs
        
        Args:
            value (str): The value to escape
            
        Returns:
            str: The escaped value
        """
        # Dictionary of special characters and their escape codes
        escape_codes = {
            ' ': '%20',
            "'": "''",
            '%': '%25',
            '+': '%2B',
            '/': '%2F',
            '?': '%3F',
            '#': '%23',
            '&': '%26'
        }
        
        # Replace each special character with its escape code
        escaped_value = ''
        for char in str(value):
            escaped_value += escape_codes.get(char, char)
        return escaped_value