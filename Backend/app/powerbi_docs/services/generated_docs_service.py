import logging
from typing import Dict, Any, Optional, List
from psycopg.types.json import Jsonb
from app.core.database import get_db_cursor

logger = logging.getLogger(__name__)

class GeneratedDocsService:
    """
    Service for managing generated PowerBI documentation sections in the database.
    Handles saving, retrieving, and updating generated documentation content.
    """
    
    @staticmethod
    def _clean_content(content: Any) -> Any:
        """
        Recursively clean content by removing trailing whitespace and unwanted characters.
        
        Args:
            content: The content to clean (can be str, dict, list, or other types)
            
        Returns:
            Cleaned content with trailing whitespace removed from all strings
        """
        if isinstance(content, str):
            # Strip trailing whitespace and any trailing control characters
            cleaned = content.rstrip()
            # Remove any trailing null bytes or other unwanted characters
            cleaned = cleaned.rstrip('\x00')
            return cleaned
        elif isinstance(content, dict):
            # Recursively clean all values in the dictionary
            return {key: GeneratedDocsService._clean_content(value) for key, value in content.items()}
        elif isinstance(content, list):
            # Recursively clean all items in the list
            return [GeneratedDocsService._clean_content(item) for item in content]
        else:
            # For other types, return as-is
            return content
    
    @staticmethod
    def save_generated_section(collection_name: str, section_name: str, content: Any) -> bool:
        """
        Save or update a generated documentation section.
        Content is automatically cleaned to remove trailing whitespace and unwanted characters.
        
        Args:
            collection_name: The collection name (file identifier)
            section_name: The section type (executive_summary, data_model_analysis, etc.)
            content: The generated content to store
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Clean the content first to remove trailing whitespace and unwanted characters
            cleaned_content = GeneratedDocsService._clean_content(content)
            
            # Log content length before saving
            if isinstance(cleaned_content, str):
                content_length = len(cleaned_content)
            elif isinstance(cleaned_content, dict):
                content_length = len(str(cleaned_content))
            else:
                content_length = len(str(cleaned_content))
            logger.info(f"Saving {section_name} for {collection_name} - Content length: {content_length} chars")
            
            # Ensure content is properly formatted for JSONB storage
            if isinstance(cleaned_content, str):
                # If it's a string, wrap it in a JSON object
                formatted_content = {"content": cleaned_content, "type": "text"}
            elif isinstance(cleaned_content, dict):
                # If it's already a dict, use it as-is
                formatted_content = cleaned_content
            else:
                # For other types, convert to string and wrap
                formatted_content = {"content": str(cleaned_content), "type": "text"}
            
            with get_db_cursor(commit=True) as cursor:
                # Use UPSERT (INSERT ... ON CONFLICT UPDATE)
                cursor.execute("""
                    INSERT INTO powerbi_generated_docs (collection_name, section_name, generated_content)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (collection_name, section_name)
                    DO UPDATE SET 
                        generated_content = EXCLUDED.generated_content,
                        updated_at = CURRENT_TIMESTAMP
                """, (collection_name, section_name, Jsonb(formatted_content)))
                
                # Verify saved content length
                saved_length = len(str(formatted_content))
                logger.info(f"Saved {section_name} for {collection_name} - Saved length: {saved_length} chars")
                logger.info(f"Successfully saved {section_name} for collection {collection_name}")
                return True
                    
        except Exception as e:
            logger.error(f"Error saving generated section {section_name} for {collection_name}: {e}", exc_info=True)
            return False
    
    @staticmethod
    def get_all_generated_sections(collection_name: str) -> Dict[str, Any]:
        """
        Retrieve all generated sections for a collection.
        
        Args:
            collection_name: The collection name to retrieve sections for
            
        Returns:
            Dict keyed by section_name with content and metadata
        """
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT section_name, generated_content, created_at, updated_at
                    FROM powerbi_generated_docs 
                    WHERE collection_name = %s
                    ORDER BY section_name
                """, (collection_name,))
                
                results = cursor.fetchall()
                
                sections = {}
                for section_name, content, created_at, updated_at in results:
                    sections[section_name] = {
                        'content': content,
                        'created_at': created_at.isoformat() if created_at else None,
                        'updated_at': updated_at.isoformat() if updated_at else None
                    }
                
                logger.info(f"Retrieved {len(sections)} generated sections for collection {collection_name}")
                return sections
                    
        except Exception as e:
            logger.error(f"Error retrieving generated sections for {collection_name}: {e}", exc_info=True)
            return {}
    
    @staticmethod
    def get_generated_section(collection_name: str, section_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific generated section.
        
        Args:
            collection_name: The collection name
            section_name: The section type to retrieve
            
        Returns:
            Dict with content and metadata, or None if not found
        """
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("""
                    SELECT generated_content, created_at, updated_at
                    FROM powerbi_generated_docs 
                    WHERE collection_name = %s AND section_name = %s
                """, (collection_name, section_name))
                
                result = cursor.fetchone()
                
                if result:
                    content, created_at, updated_at = result
                    return {
                        'content': content,
                        'created_at': created_at.isoformat() if created_at else None,
                        'updated_at': updated_at.isoformat() if updated_at else None
                    }
                
                return None
                    
        except Exception as e:
            logger.error(f"Error retrieving section {section_name} for {collection_name}: {e}", exc_info=True)
            return None
    
    @staticmethod
    def delete_generated_section(collection_name: str, section_name: str) -> bool:
        """
        Delete a specific generated section.
        
        Args:
            collection_name: The collection name
            section_name: The section type to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute("""
                    DELETE FROM powerbi_generated_docs 
                    WHERE collection_name = %s AND section_name = %s
                """, (collection_name, section_name))
                
                logger.info(f"Successfully deleted {section_name} for collection {collection_name}")
                return True
                    
        except Exception as e:
            logger.error(f"Error deleting section {section_name} for {collection_name}: {e}", exc_info=True)
            return False
    
    @staticmethod
    def delete_all_generated_sections(collection_name: str) -> bool:
        """
        Delete all generated sections for a collection.
        
        Args:
            collection_name: The collection name to delete sections for
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with get_db_cursor(commit=True) as cursor:
                cursor.execute("""
                    DELETE FROM powerbi_generated_docs 
                    WHERE collection_name = %s
                """, (collection_name,))
                
                logger.info(f"Successfully deleted all generated sections for collection {collection_name}")
                return True
                    
        except Exception as e:
            logger.error(f"Error deleting all sections for {collection_name}: {e}", exc_info=True)
            return False
    
    @staticmethod
    def update_section_by_positions(collection_name: str, section_name: str, start_pos: int, end_pos: int, new_text: str) -> Optional[str]:
        """
        Update a section by replacing text between start_pos and end_pos with new_text.
        Uses position-based replacement, not text matching.
        
        Args:
            collection_name: The collection name
            section_name: The section type to update
            start_pos: Start position (character index) in raw text
            end_pos: End position (character index) in raw text
            new_text: The new text to replace the selected portion
            
        Returns:
            The full updated content as a string, or None if section not found
        """
        try:
            # Get current section content
            section_data = GeneratedDocsService.get_generated_section(collection_name, section_name)
            if not section_data:
                logger.error(f"Section {section_name} not found for collection {collection_name}")
                return None
            
            content = section_data['content']
            
            # Extract raw text from JSONB format
            raw_text = None
            if isinstance(content, dict):
                if 'content' in content and isinstance(content['content'], str):
                    raw_text = content['content']
                elif isinstance(content, str):
                    # Fallback: if content is already a string
                    raw_text = content
            elif isinstance(content, str):
                raw_text = content
            
            if raw_text is None:
                logger.error(f"Could not extract raw text from section {section_name} for collection {collection_name}")
                return None
            
            # Validate positions
            if start_pos < 0 or end_pos < 0 or start_pos > len(raw_text) or end_pos > len(raw_text) or start_pos > end_pos:
                logger.error(f"Invalid positions: start_pos={start_pos}, end_pos={end_pos}, text_length={len(raw_text)}")
                raise ValueError(f"Invalid text positions: start_pos={start_pos}, end_pos={end_pos}, text_length={len(raw_text)}")
            
            # Replace text at specified positions
            updated_text = raw_text[:start_pos] + new_text + raw_text[end_pos:]
            
            logger.info(f"Updating section {section_name} for {collection_name} - Replaced chars {start_pos}-{end_pos} ({end_pos - start_pos} chars) with {len(new_text)} chars")
            
            # Save updated content
            success = GeneratedDocsService.save_generated_section(
                collection_name,
                section_name,
                updated_text
            )
            
            if success:
                return updated_text
            else:
                logger.error(f"Failed to save updated section {section_name} for collection {collection_name}")
                return None
                    
        except Exception as e:
            logger.error(f"Error updating section {section_name} by positions for {collection_name}: {e}", exc_info=True)
            raise

# Create a singleton instance
generated_docs_service = GeneratedDocsService()
