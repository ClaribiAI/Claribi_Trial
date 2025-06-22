"""Synonyms Services Module

This module contains business logic related to synonyms management functionality.
It was extracted from the original routes.py as part of the application restructuring.
"""

from typing import List, Dict, Optional, Tuple
from flask import session
from app.projects import ProjectService
from app.core.logging import get_logger
from .validators import (
    SynonymValidationError,
    SynonymNotFoundError
)
from .validators.synonyms_validators import (
    validate_field_type,
    validate_required_fields
)

logger = get_logger(__name__)

class SynonymService:
    """Service class for synonyms operations."""
    
    @staticmethod
    def add_synonym(
        table: str,
        field: str,
        new_synonym: str,
        field_type: str
    ) -> Tuple[bool, Optional[List[str]], Optional[str]]:
        """Add a new synonym for a field
        
        Args:
            table: The table name
            field: The field name
            new_synonym: The synonym to add
            field_type: The field type ('column' or 'measure')
            
        Returns:
            Tuple of (success, synonyms_list, error_message)
            
        Raises:
            SynonymValidationError: If required parameters are invalid
        """
        try:
            validate_required_fields(table=table, field=field, field_type=field_type, synonym=new_synonym)
            validate_field_type(field_type)
            
            synonyms = session.get('synonyms', {})
            
            # Initialize nested structure if it doesn't exist
            if table not in synonyms:
                synonyms[table] = {}
            
            if field_type not in synonyms[table]:
                synonyms[table][field_type] = {}
            
            if field not in synonyms[table][field_type]:
                synonyms[table][field_type][field] = []
            
            # Add new synonym if it's not already in the list
            if new_synonym not in synonyms[table][field_type][field]:
                synonyms[table][field_type][field].append(new_synonym)
                session['synonyms'] = synonyms
                return True, synonyms[table][field_type][field], None
            
            raise SynonymValidationError(
                'Synonym already exists',
                field='new_synonym',
                value=new_synonym
            )
            
        except SynonymValidationError as e:
            logger.warning(str(e))
            return False, None, str(e)
        except Exception as e:
            logger.error(f"Error adding synonym: {str(e)}")
            return False, None, str(e)

    @staticmethod
    def delete_synonym(
        table: str,
        field: str,
        synonym: str,
        field_type: str
    ) -> Tuple[bool, Optional[str]]:
        """Delete a synonym for a field
        
        Args:
            table: The table name
            field: The field name
            synonym: The synonym to delete
            field_type: The field type ('column' or 'measure')
            
        Returns:
            Tuple of (success, error_message)
            
        Raises:
            SynonymValidationError: If required parameters are invalid
            SynonymNotFoundError: If the synonym is not found
        """
        try:
            validate_required_fields(table=table, field=field, field_type=field_type, synonym=synonym)
            validate_field_type(field_type)

            # Get synonyms from session
            synonyms = session.get('synonyms', {})

            # Remove the synonym if it exists in the nested structure
            if (table in synonyms and 
                field_type in synonyms[table] and 
                field in synonyms[table][field_type] and 
                synonym in synonyms[table][field_type][field]):
                
                synonyms[table][field_type][field].remove(synonym)
                
                # Clean up empty structures
                if not synonyms[table][field_type][field]:
                    del synonyms[table][field_type][field]
                    
                if not synonyms[table][field_type]:
                    del synonyms[table][field_type]
                    
                if not synonyms[table]:
                    del synonyms[table]

                # Update session
                session['synonyms'] = synonyms
                return True, None
            else:
                raise SynonymNotFoundError(
                    "Synonym not found",
                    table=table,
                    field=field,
                    field_type=field_type
                )

        except (SynonymValidationError, SynonymNotFoundError) as e:
            logger.warning(str(e))
            return False, str(e)
        except Exception as e:
            logger.error(f"Error deleting synonym: {str(e)}")
            return False, str(e)

    @staticmethod
    def clear_all_synonyms(
        table: str,
        field: str,
        field_type: str
    ) -> Tuple[bool, Optional[str]]:
        """Clear all synonyms for a field
        
        Args:
            table: The table name
            field: The field name
            field_type: The field type ('column' or 'measure')
            
        Returns:
            Tuple of (success, error_message)
            
        Raises:
            SynonymValidationError: If required parameters are invalid
            SynonymNotFoundError: If no synonyms are found for the field
        """
        try:
            validate_required_fields(table=table, field=field, field_type=field_type)
            validate_field_type(field_type)

            # Get synonyms from session
            synonyms = session.get('synonyms', {})

            # Remove all synonyms for the field if it exists in the nested structure
            if (table in synonyms and 
                field_type in synonyms[table] and 
                field in synonyms[table][field_type]):
                
                del synonyms[table][field_type][field]
                
                # Clean up empty structures
                if not synonyms[table][field_type]:
                    del synonyms[table][field_type]
                    
                if not synonyms[table]:
                    del synonyms[table]
                    
                session['synonyms'] = synonyms
                return True, None
            else:
                raise SynonymNotFoundError(
                    "No synonyms found for this field",
                    table=table,
                    field=field,
                    field_type=field_type
                )

        except (SynonymValidationError, SynonymNotFoundError) as e:
            logger.warning(str(e))
            return False, str(e)
        except Exception as e:
            logger.error(f"Error clearing synonyms: {str(e)}")
            return False, str(e)

    @staticmethod
    def save_multiple_synonyms(
        synonyms_to_add: List[Dict[str, str]],
        project_id: int,
        report_id: int
    ) -> Tuple[bool, Optional[str]]:
        """Save multiple synonyms at once
        
        Args:
            synonyms_to_add: List of synonym objects to add
            project_id: The ID of the project
            report_id: The ID of the report
            
        Returns:
            Tuple of (success, error_message)
            
        Raises:
            SynonymValidationError: If required parameters are invalid
        """
        try:
            if not synonyms_to_add:
                raise SynonymValidationError("No synonyms provided")
            
            synonyms = session.get('synonyms', {})
            
            for item in synonyms_to_add:
                table = item.get('table')
                field = item.get('field')
                new_synonym = item.get('synonym')
                field_type = item.get('type')  # 'column' or 'measure'
                
                try:
                    validate_required_fields(
                        table=table,
                        field=field,
                        field_type=field_type,
                        synonym=new_synonym
                    )
                    validate_field_type(field_type)
                except SynonymValidationError:
                    # Skip invalid items but continue processing
                    logger.warning(f"Skipping invalid synonym: {item}")
                    continue
                
                # Initialize nested structure if it doesn't exist
                if table not in synonyms:
                    synonyms[table] = {}
                if field_type not in synonyms[table]:
                    synonyms[table][field_type] = {}
                if field not in synonyms[table][field_type]:
                    synonyms[table][field_type][field] = []
                
                # Add the new synonym if it's not already in the list
                if new_synonym not in synonyms[table][field_type][field]:
                    synonyms[table][field_type][field].append(new_synonym)
            
            # Update session and save to database
            session['synonyms'] = synonyms
            
            # Save the synonyms to project data
            success, _ = ProjectService.save_project_data(
                project_id=project_id,
                report_id=report_id,
                synonyms=synonyms
            )
            
            if success:
                return True, None
            else:
                raise SynonymValidationError("Failed to save synonyms")
                
        except SynonymValidationError as e:
            logger.warning(str(e))
            return False, str(e)
        except Exception as e:
            logger.error(f"Error saving multiple synonyms: {str(e)}")
            return False, str(e)