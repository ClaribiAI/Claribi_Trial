# app/powerbi_chat/services/dataset_summary_service.py

import logging
from typing import Dict, List, Any
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

class DatasetSummaryService:
    """
    Service for generating a concise summary document containing only table names and measure names.
    This document will always be attached to the initial call made to Gemini.
    """
    
    @staticmethod
    def generate_dataset_summary(structured_metadata: Dict[str, Any]) -> Document:
        """
        Generate a summary document containing only table names and measure names.
        
        Args:
            structured_metadata: The structured metadata from PBIX parsing
            
        Returns:
            Document: A document containing the dataset summary
        """
        tables = structured_metadata.get("tables", [])
        
        # Extract table names
        table_names = []
        measure_names = []
        
        for table in tables:
            table_name = table.get("name", "")
            if table_name:
                table_names.append(table_name)
            
            # Extract measure names from this table
            measures = table.get("measures", [])
            for measure in measures:
                measure_name = measure.get("name", "")
                if measure_name:
                    measure_names.append(measure_name)
        
        # Create the summary document
        summary_content = "DATASET SUMMARY\n"
        summary_content += "===============\n\n"
        
        # Add table names
        summary_content += f"TABLES ({len(table_names)}):\n"
        if table_names:
            for table_name in sorted(table_names):
                summary_content += f"- {table_name}\n"
        else:
            summary_content += "- No tables found\n"
        
        summary_content += "\n"
        
        # Add measure names
        summary_content += f"MEASURES ({len(measure_names)}):\n"
        if measure_names:
            for measure_name in sorted(measure_names):
                summary_content += f"- {measure_name}\n"
        else:
            summary_content += "- No measures found\n"
        
        # Add RLS roles
        rls_roles = structured_metadata.get("rls_roles", [])
        role_names = [role.get("role_name", "") for role in rls_roles if role.get("role_name")]
        
        summary_content += "\n"
        summary_content += f"RLS ROLES ({len(role_names)}):\n"
        if role_names:
            for role_name in sorted(role_names):
                summary_content += f"- {role_name}\n"
        else:
            summary_content += "- No RLS roles found\n"
        
        # Create the document
        summary_document = Document(
            page_content=summary_content,
            metadata={
                "source": "dataset_summary",
                "type": "dataset_summary",
                "table_count": len(table_names),
                "measure_count": len(measure_names),
                "table_names": table_names,
                "measure_names": measure_names
            }
        )
        
        logger.info(f"Generated dataset summary with {len(table_names)} tables and {len(measure_names)} measures")
        
        return summary_document

# Singleton instance
dataset_summary_service = DatasetSummaryService()
