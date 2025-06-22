"""Chatbot Services Module

This module contains business logic related to chatbot functionality.
It provides services for processing natural language queries and interacting with Power BI reports.
"""

from typing import Dict, Any, Optional, Tuple
import json
import logging
from flask import session, g

from app.services.ai_service import extract_with_gemini, initialize_ai
from app.file_processing.file_processing_services import FileProcessingService
from app.core.database import get_db_cursor
from app.report_pages.report_pages_services import ReportPageService
from app.reports.reports_services import ReportService
from app.projects.services.project_service import ProjectService
from app.services.value_validation_service import validate_all_fields
from .validators import (
    validate_query,
    validate_powerbi_url,
    validate_filter_parameters,
    QueryValidationError,
    ReportUrlValidationError,
    FilterValidationError
)

# Configure logger
logger = logging.getLogger(__name__)

# Initialize the chat model once for the module
chat_model = initialize_ai()

class ChatbotService:
    """Service class for chatbot operations."""
    
    @staticmethod
    def select_best_report(query: str, project_id: int, report_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Select the best report based on the user query.
        
        Args:
            query: The natural language query
            project_id: The ID of the project
            report_id: Optional report ID. If provided, indicates request is from data analyst view
            
        Returns:
            Optional[Dict[str, Any]]: The selected report or None if no reports found
            
        Raises:
            QueryValidationError: If the query is invalid
        """
        try:
            validate_query(query)
            
            # Get all reports for the current project
            reports = ReportService.get_all_reports_for_project(project_id)
            
            if not reports:
                logger.warning("No reports found for the current project")
                return None
            
            # If there's only one report, return it directly
            if len(reports) == 1:
                logger.info(f"Only one report found, using it: {reports[0]['name']}")
                return reports[0]
            
            # Create a prompt for report selection
            report_context = "\n".join([
                f"Report {i+1}:\nName: {report['name']}\nDescription: {report['description'] or 'No description'}" 
                for i, report in enumerate(reports)
            ])
            
            report_selection_prompt = f"""
            Based on the following user query, identify the most appropriate report.
            
            User Query: {query}
            
            Available Reports:
            {report_context}
            
            Return the result in the following JSON format:
            {{
                "selected_report_index": <index of the most appropriate report (0-based)>,
                "reason": "<brief explanation of why this report is most appropriate>"
            }}
            """
            
            logger.info("Searching for the best matching report based on user query...")
            
            # Get report selection from Gemini
            try:
                response = chat_model.send_message(report_selection_prompt)
                response_text = response.text
                
                # Try to find JSON content within markdown code blocks
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0].strip()
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0].strip()
                else:
                    # If no code blocks, try to find JSON-like content
                    import re
                    json_match = re.search(r'\{[^}]+\}', response_text)
                    if json_match:
                        response_text = json_match.group(0)
                    else:
                        response_text = response_text.strip()
                
                # Clean up any remaining markdown or unwanted characters
                response_text = response_text.replace('`', '').strip()
                
                try:
                    report_selection = json.loads(response_text)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON from response: {response_text}")
                    # Default to first report
                    return reports[0]
                
                selected_report_index = report_selection.get('selected_report_index')
                if selected_report_index is not None and 0 <= selected_report_index < len(reports):
                    selected_report = reports[selected_report_index]
                    logger.info(f"Selected report: {selected_report['name']} - {report_selection.get('reason')}")
                    return selected_report
            except Exception as e:
                logger.error(f"Error in report selection: {str(e)}")
            
            # Default to first report if selection fails
            logger.info("Using first report as default")
            return reports[0]
        except QueryValidationError as e:
            logger.error(f"Query validation error: {str(e)}")
            return None

    @staticmethod
    def select_best_page(query: str, project_id: int, report_id: int) -> Optional[Dict[str, Any]]:
        """Select the best report page based on the user query.
        
        Args:
            query: The natural language query
            project_id: The ID of the project
            report_id: The ID of the report
            
        Returns:
            Optional[Dict[str, Any]]: The selected page or None if no pages found
            
        Raises:
            QueryValidationError: If the query is invalid
        """
        try:
            validate_query(query)
            
            # Get all report pages for the selected report
            pages = ReportPageService.get_report_pages_for_project(project_id, report_id)
            
            if not pages or len(pages) == 0:
                logger.warning(f"No report pages found for the selected report ID: {report_id}")
                return None
            
            # If there's only one page, return it directly
            if len(pages) == 1:
                logger.info(f"Only one page found, using it: {pages[0]['page_name']}")
                return pages[0]
            
            # Create a prompt for page selection
            page_context = "\n".join([
                f"Page {i+1}:\nName: {page['page_name']}\nDescription: {page.get('page_description', 'No description')}" 
                for i, page in enumerate(pages)
            ])
            
            # Get the report name for context
            report_name = ""
            with get_db_cursor() as cursor:
                cursor.execute('SELECT name FROM reports WHERE id = %s', (report_id,))
                report = cursor.fetchone()
                if report:
                    report_name = report['name']
            
            page_selection_prompt = f"""
            Based on the following user query, identify the most appropriate report page.
            
            User Query: {query}
            
            Available Pages for Report '{report_name}':
            {page_context}
            
            Return the result in the following JSON format:
            {{
                "selected_page_index": <index of the most appropriate page (0-based)>,
                "reason": "<brief explanation of why this page is most appropriate>"
            }}
            """
            
            logger.info("Searching for the best matching report page based on user query...")
            
            # Get page selection from Gemini
            try:
                response = chat_model.send_message(page_selection_prompt)
                response_text = response.text
                
                # Try to find JSON content within markdown code blocks
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0].strip()
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0].strip()
                else:
                    # If no code blocks, try to find JSON-like content
                    import re
                    json_match = re.search(r'\{[^}]+\}', response_text)
                    if json_match:
                        response_text = json_match.group(0)
                    else:
                        response_text = response_text.strip()
                
                # Clean up any remaining markdown or unwanted characters
                response_text = response_text.replace('`', '').strip()
                
                try:
                    page_selection = json.loads(response_text)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON from response: {response_text}")
                    # Default to first page
                    return pages[0]
                
                selected_page_index = page_selection.get('selected_page_index')
                if selected_page_index is not None and 0 <= selected_page_index < len(pages):
                    selected_page = pages[selected_page_index]
                    logger.info(f"Selected page: {selected_page['page_name']} - {page_selection.get('reason')}")
                    return selected_page
            except Exception as e:
                logger.error(f"Error in page selection: {str(e)}")
            
            # Default to first page if selection fails
            logger.info("Using first page as default")
            return pages[0]
        except QueryValidationError as e:
            logger.error(f"Query validation error: {str(e)}")
            return None

    @staticmethod
    def process_query(
        project_id: int,
        query: str,
        selected_data: Dict[str, Any],
        synonyms: Dict[str, Any],
        report_id: Optional[int] = None,
        report_url: Optional[str] = None,
        value_rules: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Optional[str], str]:
        """Process a natural language query and generate a filtered Power BI URL.
        
        This function analyzes a natural language query, extracts relevant fields and values,
        and generates a filtered Power BI URL. It uses Gemini AI to determine the most appropriate operators:
        - eq (equals): for exact matches
        - ne (not equal): for exclusions or negations
        - ge (greater than or equal): for minimum thresholds
        - gt (greater than): for values above a threshold
        - le (less than or equal): for maximum thresholds
        - lt (less than): for values below a threshold
        - in (including): for multiple possible values
        
        Args:
            project_id: The ID of the project
            query: The natural language query
            selected_data: Selected tables and fields
            synonyms: Synonyms for tables and fields
            report_id: Optional ID of the report
            report_url: Optional URL of the report page
            value_rules: Optional rules for value validation
            
        Returns:
            Tuple[bool, Optional[str], str]: (success, url, response_message)
            
        Raises:
            QueryValidationError: If the query is invalid
            ReportUrlValidationError: If the report URL is invalid
            FilterValidationError: If the filter parameters are invalid
        """
        try:
            validate_query(query)
            
            # If no report_id is provided, use AI to select the best report
            if report_id is None or report_id == "":
                logger.info("No report ID provided, selecting best report based on query")
                selected_report = ChatbotService.select_best_report(query, project_id)
                if not selected_report:
                    return False, None, "No reports found for this project"
                report_id = selected_report['id']
                logger.info(f"Selected report ID: {report_id}")
            else:
                logger.info(f"Using provided report ID: {report_id}")
            
            # Select the best page based on the query and report ID
            selected_page = ChatbotService.select_best_page(query, project_id, report_id)
            
            if not selected_page:
                return False, None, "No pages found for the selected report"
            
            # Extract the report URL
            try:
                if isinstance(selected_page, dict):
                    report_url = selected_page.get('page_url')
                    if not report_url:
                        logger.warning("page_url not found in selected_page dictionary")
                        return False, None, "Report URL not found in selected page"
                else:
                    report_url = getattr(selected_page, 'page_url', None)
                    if not report_url:
                        logger.error(f"Cannot access page_url from selected_page")
                        return False, None, "Cannot access page URL from selected page"
                
                # Validate and convert to embed link
                validate_powerbi_url(report_url)
                report_url = ChatbotService._convert_to_embed_link(report_url)
                session['report_url'] = report_url
            except ReportUrlValidationError as e:
                logger.error(f"URL validation error: {str(e)}")
                return False, None, str(e)
            except Exception as e:
                logger.error(f"Error extracting report_url: {str(e)}")
                return False, None, f"Error extracting report URL: {str(e)}"

            # Extract field-value pairs, table mapping, and operators with value rules
            field_value_pairs, field_to_table, field_to_operator = extract_with_gemini(
                query, selected_data, synonyms, value_rules
            )
            
            try:
                validate_filter_parameters(field_value_pairs, field_to_table, field_to_operator)
            except FilterValidationError as e:
                logger.warning(f"Filter validation warning: {str(e)}")
                # Continue processing with valid filters only
                field_value_pairs = {k: v for k, v in field_value_pairs.items() 
                                   if k in field_to_table and 
                                   (k not in field_to_operator or 
                                    field_to_operator[k] in {'eq', 'ne', 'gt', 'lt', 'ge', 'le', 'in'})}

            # Create validated_fields with table.field format for validation
            validation_fields = {}
            for field, value in field_value_pairs.items():
                table_name = field_to_table.get(field)
                if table_name:
                    # Check if field already includes table name
                    if '.' in field:
                        # Field already has table name, use it as is
                        table_field_key = field
                    else:
                        # Construct table.field format
                        table_field_key = f"{table_name}.{field}"
                    validation_fields[table_field_key] = value

            # Apply value validation rules
            if value_rules:
                validated_fields, validation_messages = validate_all_fields(validation_fields, value_rules)
                
                # Convert validated fields back to original format for filter building
                updated_field_value_pairs = {}
                updated_field_to_table = {}  # Keep track of table mappings for validated fields
                for table_field, value in validated_fields.items():
                    # Split the table.field key back into components
                    parts = table_field.split('.')
                    if len(parts) == 2:
                        # Normal case: table.field
                        table_name, field_name = parts
                        # Store the field name and value
                        updated_field_value_pairs[field_name] = value
                        # Keep track of the table mapping
                        updated_field_to_table[field_name] = table_name
                    else:
                        logger.warning(f"Unexpected field key format: {table_field}")
                        updated_field_value_pairs[table_field] = value
                
                # Update field_value_pairs and field_to_table with validated values
                field_value_pairs = updated_field_value_pairs
                field_to_table = updated_field_to_table

            # Build filters based on the extracted pairs
            filters = set()
            for field, value in field_value_pairs.items():
                table_name = field_to_table.get(field)
                if not table_name:
                    continue
                    
                # Convert special characters in table and field names
                converted_table = FileProcessingService.convert_special_chars(table_name)
                converted_field = FileProcessingService.convert_special_chars(field)
                
                # Get the operator determined by Gemini AI
                operator = field_to_operator.get(field, "eq")  # Default to eq if not specified
                
                # Escape the value and create the filter string based on the operator
                escaped_value = FileProcessingService.escape_value(value)
                
                if operator == "in":
                    # Handle comma-separated values for 'in' operator
                    if "," in str(value):
                        values = [v.strip() for v in str(value).split(",")]
                        escaped_values = [f"'{FileProcessingService.escape_value(v)}'" for v in values]
                        filter_str = f"{converted_table}/{converted_field} in ({', '.join(escaped_values)})"
                    else:
                        # Single value, but still using 'in' operator
                        filter_str = f"{converted_table}/{converted_field} in ('{escaped_value}')"
                elif operator in ["gt", "lt", "ge", "le"]:
                    # Numeric comparison operators don't use quotes around numbers
                    try:
                        # Try to convert to number for numeric operators
                        numeric_value = float(value)
                        # For numeric values, don't use quotes in the filter
                        filter_str = f"{converted_table}/{converted_field} {operator} {numeric_value}"
                    except (ValueError, TypeError):
                        # If not a number, fall back to eq with quotes
                        filter_str = f"{converted_table}/{converted_field} eq '{escaped_value}'"
                else:
                    # String comparison operators (eq, ne) use quotes
                    filter_str = f"{converted_table}/{converted_field} {operator} '{escaped_value}'"
                
                filters.add(filter_str)
            
            logger.info(f"All filters built: {filters}")
            
            if not report_url:
                logger.error("Report URL not set")
                return False, None, "Report URL not set"

            # Get report and page names for the response message
            report_name = "Unknown report"
            page_name = selected_page.get('page_name', 'Unknown page')
            
            with get_db_cursor() as cursor:
                cursor.execute('SELECT name FROM reports WHERE id = %s', (report_id,))
                report = cursor.fetchone()
                if report:
                    report_name = report['name']
            
            # Construct the final URL and response message
            if filters:
                # Combine filters with 'and' operator and sort for consistency
                filter_str = ' and '.join(sorted(filters))
                # Add filters to the URL
                final_url = f"{report_url}{'&' if '?' in report_url else '?'}$filter={filter_str}"
                logger.info(f"Final URL with filters: {final_url}")
                
                # Create filter descriptions for the response message
                filter_description = []
                for key, value in field_value_pairs.items():
                    operator = field_to_operator.get(key, "eq")
                    description = ChatbotService._get_filter_description(key, value, operator)
                    filter_description.append(description)
                
                # Add validation info if applicable
                validation_info = ""
                if value_rules and validation_messages and any(len(msgs) > 0 for msgs in validation_messages.values()):
                    validation_info = " Values have been validated and formatted according to the report configuration."
                
                response_message = f"I've found data for your query in the '{report_name}' report, '{page_name}' page. Filtering by {', '.join(filter_description)}.{validation_info}"
            else:
                final_url = report_url
                logger.info(f"No filters applied, using base URL: {final_url}")
                response_message = f"I've found the report '{report_name}', page '{page_name}', but couldn't identify specific filters for your query."
            
            return True, final_url, response_message
                
        except (QueryValidationError, ReportUrlValidationError, FilterValidationError) as e:
            logger.error(f"Validation error in process_query: {str(e)}")
            return False, None, str(e)
        except Exception as e:
            logger.error(f"Error in process_query: {str(e)}")
            return False, None, f"Error processing query: {str(e)}"

    @staticmethod
    def _get_filter_description(key: str, value: Any, operator: str) -> str:
        """Get a human-readable description of a filter.
        
        Args:
            key: The field name
            value: The field value
            operator: The operator (eq, ne, gt, lt, ge, le, in)
            
        Returns:
            str: A human-readable description of the filter
        """
        if operator == "eq":
            return f"{key} = {value}"
        elif operator == "ne":
            return f"{key} is not {value}"
        elif operator == "gt":
            return f"{key} is greater than {value}"
        elif operator == "ge":
            return f"{key} is greater than or equal to {value}"
        elif operator == "lt":
            return f"{key} is less than {value}"
        elif operator == "le":
            return f"{key} is less than or equal to {value}"
        elif operator == "in":
            if "," in str(value):
                return f"{key} is one of [{value}]"
            return f"{key} is {value}"
        return f"{key} = {value}"  # Default fallback

    @staticmethod
    def _convert_to_embed_link(report_url: str) -> str:
        """Convert a regular Power BI report URL to the new embed link format.
        
        Args:
            report_url: The original report URL
            
        Returns:
            str: The converted embed link URL
            
        Raises:
            ReportUrlValidationError: If the URL is invalid
        """
        import re
        
        try:
            validate_powerbi_url(report_url)
            
            # Already in correct embed format
            if report_url.startswith("https://app.powerbi.com/reportEmbed?"):
                # Check if it matches the new format (autoAuth and appId if needed)
                if 'autoAuth=true' in report_url:
                    return report_url
            
            # Regular workspace link
            m = re.match(r"https://app\.powerbi\.com/groups/([\w-]+)/reports/([\w-]+)/([\w-]+)?", report_url)
            if m:
                workspace_id, report_id, _ = m.groups()
                # Try to extract pageName from the URL fragment or query
                page_name = None
                if "pageName=" in report_url:
                    page_name = re.search(r"pageName=([\w-]+)", report_url)
                    page_name = page_name.group(1) if page_name else None
                else:
                    # Try to extract from the last part of the path
                    parts = report_url.rstrip('/').split('/')
                    if len(parts) > 0:
                        page_name = parts[-1] if parts[-1].startswith('ReportSection') else None
                if not page_name:
                    page_name = 'ReportSection'
                # New embed format (no groupId, add autoAuth)
                return f"https://app.powerbi.com/reportEmbed?reportId={report_id}&autoAuth=true&pageName={page_name}"

            # App-published link
            m = re.match(r"https://app\.powerbi\.com/groups/me/apps/([\w-]+)/reports/([\w-]+)/([\w-]+)?", report_url)
            if m:
                app_id, report_id, _ = m.groups()
                # Try to extract pageName from the URL fragment or query
                page_name = None
                if "pageName=" in report_url:
                    page_name = re.search(r"pageName=([\w-]+)", report_url)
                    page_name = page_name.group(1) if page_name else None
                else:
                    parts = report_url.rstrip('/').split('/')
                    if len(parts) > 0:
                        page_name = parts[-1] if parts[-1].startswith('ReportSection') else None
                if not page_name:
                    page_name = 'ReportSection'
                # New embed format for app (use appId, add autoAuth)
                return f"https://app.powerbi.com/reportEmbed?reportId={report_id}&appId={app_id}&autoAuth=true&pageName={page_name}"

            # If not matching known formats, return as is
            return report_url
            
        except ReportUrlValidationError:
            raise
        except Exception as e:
            raise ReportUrlValidationError(f"Error converting URL: {str(e)}", "url", report_url) 