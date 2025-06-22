"""AI Service

This module contains functions for interacting with the Gemini AI API.
It was extracted from the original routes.py as part of the application restructuring.
"""

import json
import re
import google.generativeai as genai
from app.config.settings import config
import logging

# Configure logger
logger = logging.getLogger(__name__)

# Configure Gemini API using settings
def initialize_ai():
    """
    Initialize the Gemini AI API with the API key from configuration.
    
    Returns:
        GenerativeModel: The configured Gemini model instance
    """
    genai.configure(api_key=config.GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash')
    chat = model.start_chat(history=[])
    return chat
# Get or create the model instance
#model = initialize_ai()
chat = initialize_ai()
def extract_with_gemini(query, selected_data, synonyms, value_rules=None):
    """
    Extract fields, values, and operators from a natural language query using Gemini AI.
    First checks for exact matches in the raw query, then uses Gemini for remaining extraction.
    
    Args:
        query (str): The natural language query to process
        selected_data (dict): The selected data structure containing tables and columns
        synonyms (dict): Dictionary of synonyms for table and column names
        value_rules (dict, optional): Dictionary of validation rules including regex patterns
        
    Returns:
        tuple: (fields_and_values, field_to_table, field_to_operator) where:
            - fields_and_values is a dictionary mapping field names to their values
            - field_to_table is a dictionary mapping field names to their table names
            - field_to_operator is a dictionary mapping field names to their operators (eq, ne, gt, lt, ge, le, in)
    """
    # Initialize empty results
    fields_and_values = {}
    field_to_table = {}
    field_to_operator = {}
    
    # Validate inputs
    if not query:
        logger.warning("Empty query provided to extract_with_gemini")
        return fields_and_values, field_to_table, field_to_operator

    # First, check for exact matches in the raw query
    if value_rules:
        for field_key, rules in value_rules.items():
            if 'rules' in rules:
                for rule in rules['rules']:
                    if rule.get('type') == 'exact_match':
                        valid_values = rule.get('valid_values', [])
                        case_sensitive = rule.get('case_sensitive', False)
                        
                        # Create lookup for case-insensitive matching
                        if not case_sensitive:
                            lookup = {str(v).lower(): v for v in valid_values}
                            query_lower = query.lower()
                            # Check each value in the lookup
                            for lower_value, original_value in lookup.items():
                                if lower_value in query_lower:
                                    # Split field_key into table and field
                                    table_name, field_name = field_key.split('.')
                                    fields_and_values[field_name] = original_value
                                    field_to_table[field_name] = table_name
                                    field_to_operator[field_name] = 'eq'
                                    logger.info(f"Found exact match for {field_key}: {original_value}")
                        else:
                            # Case-sensitive matching
                            for value in valid_values:
                                if str(value) in query:
                                    # Split field_key into table and field
                                    table_name, field_name = field_key.split('.')
                                    fields_and_values[field_name] = value
                                    field_to_table[field_name] = table_name
                                    field_to_operator[field_name] = 'eq'
                                    logger.info(f"Found exact match for {field_key}: {value}")

    # Prepare the selected data for the prompt
    try:
        tables_info = []
        for table_name, table_data in selected_data.items():
            columns = []
            if isinstance(table_data, list):
                columns = table_data
            else:
                logger.warning(f"table_data for {table_name} has unsupported format, skipping")
                continue
            
            tables_info.append({
                "table": table_name,
                "columns": columns
            })
    except Exception as e:
        logger.error(f"Error preparing tables_info: {str(e)}")
        tables_info = []
    
    # Prepare synonyms information for the prompt
    try:
        synonym_info = []
        for table_name, fields in synonyms.items():
            for field_name, synonym_value in fields.items():
                if not synonym_value or not isinstance(synonym_value, str):
                    continue
                    
                synonym_info.append({
                    "original": f"{table_name}.{field_name}",
                    "synonyms": [synonym_value]  # Wrap single synonym in a list
                })
    except Exception as e:
        logger.error(f"Error preparing synonym_info: {str(e)}")
        synonym_info = []

    # Prepare pattern information
    pattern_info = []
    if value_rules:
        try:
            for field_key, rules in value_rules.items():
                if 'rules' in rules:
                    for rule in rules['rules']:
                        if rule.get('type') == 'pattern':
                            pattern = rule.get('pattern')
                            if pattern:
                                # Split field_key into table and field
                                table_name, field_name = field_key.split('.')
                                pattern_info.append({
                                    "table": table_name,
                                    "field": field_name,
                                    "pattern": pattern
                                })
        except Exception as e:
            logger.error(f"Error preparing pattern_info: {str(e)}")

    # Add information about already found exact matches to the prompt
    exact_matches_info = []
    for field_name, value in fields_and_values.items():
        exact_matches_info.append({
            "field": field_name,
            "table": field_to_table[field_name],
            "value": value
        })

    # Construct the prompt for Gemini
    prompt = f"""
    You are a data extraction assistant. Extract the fields, values, and operators from the following query.
    
    Available operators:
    - eq (equals): Use for exact matches (default)
    - ne (not equal): Use when the query wants to exclude values
    - gt (greater than): Use when the query looks for values above a threshold
    - ge (greater than or equal): Use when the query looks for values at or above a threshold
    - lt (less than): Use when the query looks for values below a threshold
    - le (less than or equal): Use when the query looks for values at or below a threshold
    - in (including): Use when the query mentions multiple possible values or value lists (comma seperated, or using key words)
    
    Available tables and columns:
    {json.dumps(tables_info, indent=2)}
    
    Synonyms information:
    {json.dumps(synonym_info, indent=2)}
    """

    # Add exact matches information if any were found
    if exact_matches_info:
        prompt += f"""
    
    Already identified exact matches (DO NOT extract these again):
    {json.dumps(exact_matches_info, indent=2)}
    """

    # Add regex pattern information if available
    if pattern_info:
        prompt += f"""
    
    Required regex patterns for specific fields:
    {json.dumps(pattern_info, indent=2)}
    
    For any fields with regex patterns specified above, ensure the extracted values match the required pattern.
    If a value doesn't match the pattern but can be formatted to match it, format it accordingly.
    If a value cannot be made to match the pattern, extract it as is and let the validation system handle it.
    """

    prompt += f"""
    
    Query: {query}
    
    Return a JSON object with the following structure:
    {{
        "fields_and_values": {{
            "field_name": "value",
            ...
        }},
        "field_to_table": {{
            "field_name": "table_name",
            ...
        }},
        "field_to_operator": {{
            "field_name": "operator",
            ...
        }}
    }}

    Only include fields that are explicitly mentioned or clearly implied in the query.
    Use the synonyms to match query terms to the actual field names.
    Choose the most appropriate operator for each field based on the query's language.
    If the operator isn't clear, use "eq" as the default.
    All dictionaries must be JSON objects, not arrays.
    DO NOT extract fields and values that were already identified in the exact matches list.
    """

    try:
        # Generate response from Gemini
        response = chat.send_message(prompt)
        response_text = response.text
        if not response_text.strip():
            logger.warning("Received an empty response from Gemini.")
            return fields_and_values, field_to_table, field_to_operator
        
        # Extract JSON from the response
        # First, try to parse the entire response as JSON
        try:
            parsed_result = json.loads(response_text)
            # Extract additional fields and values from Gemini
            if 'fields_and_values' in parsed_result and isinstance(parsed_result['fields_and_values'], dict):
                # Merge with existing fields_and_values, but don't override exact matches
                for field, value in parsed_result['fields_and_values'].items():
                    if field not in fields_and_values:
                        fields_and_values[field] = value
            else:
                logger.warning("fields_and_values is missing or not a dictionary in the Gemini response")   

            # Extract additional field to table mappings
            if 'field_to_table' in parsed_result and isinstance(parsed_result['field_to_table'], dict):
                # Merge with existing field_to_table, but don't override exact matches
                for field, table in parsed_result['field_to_table'].items():
                    if field not in field_to_table:
                        field_to_table[field] = table
            else:
                logger.warning("field_to_table is missing or not a dictionary in the Gemini response")

            # Extract additional field to operator mappings
            if 'field_to_operator' in parsed_result and isinstance(parsed_result['field_to_operator'], dict):
                # Merge with existing field_to_operator, but don't override exact matches
                for field, operator in parsed_result['field_to_operator'].items():
                    if field not in field_to_operator:
                        field_to_operator[field] = operator
            else:
                logger.warning("field_to_operator is missing or not a dictionary in the Gemini response")
                
        except json.JSONDecodeError:
            # If that fails, try to extract JSON from markdown code blocks
            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', response_text, re.DOTALL)
            if json_match:
                try:
                    parsed_result = json.loads(json_match.group(1))
                    
                    # Extract additional fields and values
                    if 'fields_and_values' in parsed_result and isinstance(parsed_result['fields_and_values'], dict):
                        # Merge with existing fields_and_values, but don't override exact matches
                        for field, value in parsed_result['fields_and_values'].items():
                            if field not in fields_and_values:
                                fields_and_values[field] = value
                    else:
                        logger.warning("fields_and_values is missing or not a dictionary in the code block")
                    
                    # Extract additional field to table mappings
                    if 'field_to_table' in parsed_result and isinstance(parsed_result['field_to_table'], dict):
                        # Merge with existing field_to_table, but don't override exact matches
                        for field, table in parsed_result['field_to_table'].items():
                            if field not in field_to_table:
                                field_to_table[field] = table
                    else:
                        logger.warning("field_to_table is missing or not a dictionary in the code block")
                        
                    # Extract additional field to operator mappings
                    if 'field_to_operator' in parsed_result and isinstance(parsed_result['field_to_operator'], dict):
                        # Merge with existing field_to_operator, but don't override exact matches
                        for field, operator in parsed_result['field_to_operator'].items():
                            if field not in field_to_operator:
                                field_to_operator[field] = operator
                    else:
                        logger.warning("field_to_operator is missing or not a dictionary in the code block")
                except Exception as json_ex:
                    logger.error(f"Error parsing JSON from code block: {str(json_ex)}")
    
    except Exception as e:
        logger.error(f"Error in Gemini extraction: {str(e)}")
    
    # Final safety check to ensure we always return dictionaries
    if not isinstance(fields_and_values, dict):
        logger.warning(f"final fields_and_values is not a dictionary, converting to empty dict.")
        fields_and_values = {}
    if not isinstance(field_to_table, dict):
        logger.warning(f"final field_to_table is not a dictionary, converting to empty dict.")
        field_to_table = {}
    if not isinstance(field_to_operator, dict):
        logger.warning(f"final field_to_operator is not a dictionary, converting to empty dict.")
        field_to_operator = {}
    
    return fields_and_values, field_to_table, field_to_operator


def generate_content(prompt):
    """
    Generate content using the Gemini AI model.
    
    Args:
        prompt (str): The prompt to send to the model
        
    Returns:
        str: The generated content text
    """
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error generating content with Gemini: {str(e)}")
        return ""

def generate_validation_rules(prompt, field_name, field_type, table_name):
    """
    Generate validation rules for a specific field based on user prompt using Gemini AI.
    
    Args:
        prompt (str): User description of desired validation format
        field_name (str): Name of the field to validate
        field_type (str): Data type of the field (e.g., 'string', 'number', 'date')
        table_name (str): Name of the table containing the field
        
    Returns:
        dict: Generated validation rules or error response
    """
    if not prompt or not field_name:
        return {
            'success': False,
            'error': 'Prompt and field name are required'
        }
    
    # Determine available rule types based on field type
    available_rules = ['exact_match', 'pattern', 'transformation']
    
    # Add numeric-specific rules for numeric fields
    numeric_types = ['decimal', 'int64', 'integer', 'double', 'number', 'float', 'numeric', 'bigint', 'smallint', 'tinyint', 'real', 'calculated column (dax)']
    if field_type and field_type.lower() in numeric_types:
        available_rules.append('range')
    
    # Add date-specific rules for date/time fields
    date_types = ['date', 'datetime', 'timestamp', 'time', 'calculated column (dax)']
    if field_type and any(date_type in field_type.lower() for date_type in date_types):
        available_rules.append('date_format')

    # Construct the prompt for Gemini
    system_prompt = f"""
    You are a validation rule generator. Based on the user's description, generate appropriate validation rules for a database field.
    
    Field Information:
    - Field Name: {field_name}
    - Table: {table_name}
    - Data Type: {field_type}
    
    Available Rule Types:
    1. exact_match: Validates against a list of exact values
       Format: {{"type": "exact_match", "valid_values": ["value1", "value2"], "case_sensitive": false}}
    
    2. pattern: Validates using regex patterns
       Format: {{"type": "pattern", "pattern": "^[A-Z][a-z]+$"}}
    
    3. transformation: Transforms values (uppercase, lowercase, titlecase, trim)
       Format: {{"type": "transformation", "transformation_type": "uppercase"}}
    
    4. range: Validates numeric ranges (only for numeric fields)
       Format: {{"type": "range", "min_value": 0, "max_value": 100}}
    
    5. date_format: Validates and formats dates (only for date fields or calculated DAX fields)
       Format: {{"type": "date_format", "input_formats": ["%Y-%m-%d", "%m/%d/%Y"], "output_format": "%Y-%m-%d"}}
    
    User Request: {prompt}
    
    Analyze the user's request and generate the most appropriate validation rules. Consider:
    - If they provide examples, use exact_match rules
    - If they describe patterns, use pattern rules with appropriate regex
    - If they mention formatting (uppercase, lowercase, etc.), use transformation rules
    - If they specify ranges for numeric fields, use range rules
    - If they mention date formats, use date_format rules
    
    Return a JSON object with the following structure:
    {{
        "success": true,
        "rules": [
            // Array of rule objects based on the analysis
        ],
        "default_value": "optional_default_value",
        "explanation": "Brief explanation (max 20 words) of why these rules were chosen, refer to user as 'you'"
    }}
    
    If you cannot determine appropriate rules from the prompt, return:
    {{
        "success": false,
        "error": "Cannot generate validation logic from the provided description. Please provide more specific requirements or examples."
    }}
    
    Only generate rules that are in the available rule types list: {available_rules}
    """

    try:
        # Generate response from Gemini
        response = chat.send_message(system_prompt)
        response_text = response.text
        
        if not response_text.strip():
            logger.warning("Received an empty response from Gemini for validation rules generation.")
            return {
                'success': False,
                'error': 'AI service returned empty response'
            }
        
        # Parse the JSON response
        try:
            # First, try to parse the entire response as JSON
            parsed_result = json.loads(response_text)
            
            # Validate the response structure
            if not isinstance(parsed_result, dict):
                raise ValueError("Response is not a JSON object")
            
            if not parsed_result.get('success', False):
                return {
                    'success': False,
                    'error': parsed_result.get('error', 'AI could not generate validation rules')
                }
            
            # Validate rules structure
            rules = parsed_result.get('rules', [])
            if not isinstance(rules, list):
                raise ValueError("Rules must be an array")
            
            # Validate each rule
            for rule in rules:
                if not isinstance(rule, dict) or 'type' not in rule:
                    raise ValueError("Each rule must be an object with a 'type' field")
                
                if rule['type'] not in available_rules:
                    raise ValueError(f"Rule type '{rule['type']}' is not available for this field type")
            
            return {
                'success': True,
                'rules': rules,
                'default_value': parsed_result.get('default_value'),
                'explanation': parsed_result.get('explanation', 'Rules generated based on your description')
            }
            
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            json_match = re.search(r'```(?:json)?\s*({.*?})\s*```', response_text, re.DOTALL)
            if json_match:
                try:
                    parsed_result = json.loads(json_match.group(1))
                    
                    if not isinstance(parsed_result, dict):
                        raise ValueError("Response is not a JSON object")
                    
                    if not parsed_result.get('success', False):
                        return {
                            'success': False,
                            'error': parsed_result.get('error', 'AI could not generate validation rules')
                        }
                    
                    rules = parsed_result.get('rules', [])
                    if not isinstance(rules, list):
                        raise ValueError("Rules must be an array")
                    
                    for rule in rules:
                        if not isinstance(rule, dict) or 'type' not in rule:
                            raise ValueError("Each rule must be an object with a 'type' field")
                        
                        if rule['type'] not in available_rules:
                            raise ValueError(f"Rule type '{rule['type']}' is not available for this field type")
                    
                    return {
                        'success': True,
                        'rules': rules,
                        'default_value': parsed_result.get('default_value'),
                        'explanation': parsed_result.get('explanation', 'Rules generated based on your description')
                    }
                    
                except Exception as json_ex:
                    logger.error(f"Error parsing JSON from code block: {str(json_ex)}")
                    return {
                        'success': False,
                        'error': 'Failed to parse AI response'
                    }
            
            logger.error("Could not extract valid JSON from AI response")
            return {
                'success': False,
                'error': 'AI response format is invalid'
            }
    
    except Exception as e:
        logger.error(f"Error in AI validation rules generation: {str(e)}")
        return {
            'success': False,
            'error': f'AI service error: {str(e)}'
        }