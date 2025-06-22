"""Value Validation Service

This module provides functions for validating and transforming values extracted from user queries
based on predefined rules.
"""

import re
import json
import logging
import datetime

# Configure logger
logger = logging.getLogger(__name__)

class ValidationRule:
    """Base class for validation rules"""
    def validate(self, value):
        """Validate the value against the rule

        Args:
            value: The value to validate

        Returns:
            tuple: (is_valid, transformed_value)
        """
        raise NotImplementedError("Subclasses must implement validate()")

class ExactMatchRule(ValidationRule):
    """Rule for validating against a list of exact matches"""
    def __init__(self, valid_values, case_sensitive=False):
        """Initialize the rule with valid values

        Args:
            valid_values (list): List of valid values
            case_sensitive (bool): Whether matching should be case-sensitive
        """
        self.valid_values = valid_values
        self.case_sensitive = case_sensitive
        
        # Create a case-insensitive lookup dictionary if needed
        if not case_sensitive:
            self.lookup = {str(v).lower(): v for v in valid_values}
    
    def validate(self, value):
        """Validate if the value exactly matches one of the valid values

        Args:
            value: The value to validate

        Returns:
            tuple: (is_valid, transformed_value)
        """
        if value is None:
            return False, None
            
        str_value = str(value)
        
        # Case-sensitive matching
        if self.case_sensitive:
            if str_value in self.valid_values:
                return True, str_value
            return False, None
            
        # Case-insensitive matching
        lower_value = str_value.lower()
        if lower_value in self.lookup:
            # Return the properly formatted value from our lookup
            return True, self.lookup[lower_value]
            
        return False, None

class PatternRule(ValidationRule):
    """Rule for validating against a regex pattern"""
    def __init__(self, pattern, replacement=None):
        """Initialize the rule with a pattern

        Args:
            pattern (str): Regex pattern for validation
            replacement (str, optional): Replacement pattern for transformation
        """
        self.pattern = pattern
        self.regex = re.compile(pattern)
        self.replacement = replacement
    
    def validate(self, value):
        """Validate if the value matches the pattern

        Args:
            value: The value to validate

        Returns:
            tuple: (is_valid, transformed_value)
        """
        if value is None:
            return False, None
            
        str_value = str(value)
        
        # Check if value matches the pattern
        match = self.regex.match(str_value)
        if not match:
            return False, None
 
        # Apply replacement if specified
        if self.replacement:
            try:
                transformed = self.regex.sub(self.replacement, str_value)
                return True, transformed
            except Exception as e:
                logger.error(f"Error applying pattern replacement: {e}")
                return True, str_value
        
        return True, str_value

class TransformationRule(ValidationRule):
    """Rule for transforming values"""
    def __init__(self, transformation_type):
        """Initialize the rule with a transformation type

        Args:
            transformation_type (str): Type of transformation to apply
                                    ('uppercase', 'lowercase', 'titlecase', 'trim')
        """
        self.transformation_type = transformation_type
    
    def validate(self, value):
        """Apply the transformation to the value

        Args:
            value: The value to transform

        Returns:
            tuple: (is_valid, transformed_value)
        """
        if value is None:
            return False, None
            
        str_value = str(value)
        try:
            if self.transformation_type == 'uppercase':
                return True, str_value.upper()
            elif self.transformation_type == 'lowercase':
                return True, str_value.lower()
            elif self.transformation_type == 'titlecase':
                return True, str_value.title()
            elif self.transformation_type == 'trim':
                return True, ''.join(str_value.split())
            else:
                logger.warning(f"Unknown transformation type: {self.transformation_type}")
                return True, str_value
        except Exception as e:
            logger.error(f"Error applying transformation: {e}")
            return True, str_value

class RangeRule(ValidationRule):
    """Rule for validating numeric ranges"""
    def __init__(self, min_value=None, max_value=None):
        """Initialize the rule with min and max values

        Args:
            min_value (number, optional): Minimum allowed value
            max_value (number, optional): Maximum allowed value
        """
        self.min_value = float(min_value) if min_value is not None else None
        self.max_value = float(max_value) if max_value is not None else None
    
    def validate(self, value):
        """Validate if the value is within the specified range

        Args:
            value: The value to validate

        Returns:
            tuple: (is_valid, transformed_value)
        """
        if value is None:
            return False, None
            
        # Try to convert to number
        try:
            num_value = float(value)
        except (ValueError, TypeError):
            return False, None
            
        # Check range
        if self.min_value is not None and num_value < self.min_value:
            return False, None
        if self.max_value is not None and num_value > self.max_value:
            return False, None
            
        return True, value

class DateFormatRule(ValidationRule):
    """Rule for validating and formatting dates"""
    def __init__(self, input_formats, output_format):
        """Initialize the rule with date formats

        Args:
            input_formats (list): List of possible input date formats
            output_format (str): Output date format
        """
        self.input_formats = input_formats
        self.output_format = output_format
    
    def validate(self, value):
        """Validate and format the date value

        Args:
            value: The date value to validate and format

        Returns:
            tuple: (is_valid, transformed_value)
        """
        if value is None:
            return False, None
            
        str_value = str(value)
        
        # Try each input format
        for format in self.input_formats:
            try:
                date_obj = datetime.datetime.strptime(str_value, format)
                return True, date_obj.strftime(self.output_format)
            except ValueError:
                continue
                
        return False, None

def parse_rule_definition(rule_def):
    """Parse a rule definition into a ValidationRule object

    Args:
        rule_def (dict): Rule definition dictionary

    Returns:
        ValidationRule: The instantiated rule object
    """
    try:
        rule_type = rule_def.get('type')
        
        if rule_type == 'exact_match':
            return ExactMatchRule(
                rule_def.get('valid_values', []),
                rule_def.get('case_sensitive', False)
            )
        elif rule_type == 'pattern':
            return PatternRule(
                rule_def.get('pattern', ''),
                rule_def.get('replacement')
            )
        elif rule_type == 'transformation':
            return TransformationRule(
                rule_def.get('transformation_type', 'trim')
            )
        elif rule_type == 'range':
            return RangeRule(
                rule_def.get('min_value'),
                rule_def.get('max_value')
            )
        elif rule_type == 'date_format':
            return DateFormatRule(
                rule_def.get('input_formats', []),
                rule_def.get('output_format', '%Y-%m-%d')
            )
        else:
            logger.warning(f"Unknown rule type: {rule_type}")
            return None
            
    except Exception as e:
        logger.error(f"Error parsing rule definition: {e}")
        return None

def validate_field_value(field, value, value_rules):
    """Validate and transform a field value based on defined rules

    Args:
        field (str): The field name in format "table_name.field_name"
        value: The value to validate (can be a single value or a list for 'in' operator)
        value_rules (dict): Dictionary of field validation rules

    Returns:
        tuple: (is_valid, transformed_value, messages)
    """
    # Initialize results
    is_valid = True
    transformed_value = value
    messages = []

    # Skip validation if no rules defined
    if not value_rules:
        return True, value, []
        
    # Get field-specific rules using the full table-qualified field name
    field_rules = value_rules.get(field, {})
    
    # Skip if no rules defined for this field
    if not field_rules or 'rules' not in field_rules:
        return True, value, []

    # Handle multiple values for 'in' operator
    values_to_validate = []
    if isinstance(value, str) and ',' in value:
        # Split comma-separated string into list
        values_to_validate = [v.strip() for v in value.split(',')]
    elif isinstance(value, (list, tuple)):
        # Already a list/tuple
        values_to_validate = list(value)
    else:
        # Single value
        values_to_validate = [value]

    # Process each value
    transformed_values = []
    for single_value in values_to_validate:
        value_is_valid = True
        current_value = single_value

        # Process each rule in sequence
        for rule_def in field_rules.get('rules', []):
            try:
                rule = parse_rule_definition(rule_def)
                if rule is None:
                    continue
                    
                # Apply the rule
                rule_valid, rule_value = rule.validate(current_value)
                
                # If invalid, mark this value as invalid
                if not rule_valid:
                    value_is_valid = False
                    messages.append(f"Value '{single_value}' is invalid for field '{field}'")
                    break
                
                # Update the value with the transformed one
                if rule_value is not None:
                    current_value = rule_value
                    
            except Exception as e:
                logger.error(f"Error applying rule to field '{field}' value '{single_value}': {e}")
                value_is_valid = False
                messages.append(f"Error validating value '{single_value}' for field '{field}'")
                break

        # If value is valid, add it to transformed values
        if value_is_valid:
            transformed_values.append(current_value)
            if current_value != single_value:
                messages.append(f"Value '{single_value}' transformed to '{current_value}'")

    # Check if we have any valid values
    if not transformed_values:
        is_valid = False
        # Check if we should use a default value
        if 'default_value' in field_rules:
            transformed_value = field_rules['default_value']
            messages.append(f"Using default value '{transformed_value}'")
            is_valid = True
            return is_valid, transformed_value, messages
        return False, value, messages

    # If we had multiple values, join them back together
    if len(transformed_values) > 1:
        transformed_value = ','.join(str(v) for v in transformed_values)
    else:
        transformed_value = transformed_values[0]

    return is_valid, transformed_value, messages

def validate_all_fields(fields_and_values, value_rules):
    """Validate all fields in a dictionary against defined rules

    Args:
        fields_and_values (dict): Dictionary of field-value pairs where keys are in format "table_name.field_name"
        value_rules (dict): Dictionary of field validation rules

    Returns:
        tuple: (validated_fields, validation_messages)
    """
    if not value_rules:
        return fields_and_values, {}
        
    validated_fields = {}
    validation_messages = {}
    
    for field, value in fields_and_values.items():
        # field should already be in format "table_name.field_name"
        is_valid, transformed_value, messages = validate_field_value(field, value, value_rules)
        
        if is_valid:
            validated_fields[field] = transformed_value
        
        if messages:
            validation_messages[field] = messages
    
    return validated_fields, validation_messages 