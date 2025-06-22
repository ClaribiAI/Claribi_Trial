"""File Parser Service

This module contains functions for parsing TMDL files and extracting table and column information.
It was extracted from the original model.py as part of the application restructuring.
"""

import re

def parse_uploaded_file(file_path):
    """
    Parse the uploaded TMDL file and extract table and column information.
    
    Args:
        file_path (str): Path to the uploaded file
        
    Returns:
        dict: Dictionary containing table information with columns and measures
    """
    tables_info = {}
    current_table = None
    in_table = False
    in_columns = False
    in_measures = False
    
    with open(file_path, 'r', encoding='utf-8') as file:
        for line in file:
            line = line.strip()
            
            # Check for table definition
            if line.startswith('table ') and ' {' in line:
                table_name = line.split(' ')[1].split(' {')[0].strip()
                current_table = table_name
                in_table = True
                tables_info[current_table] = {
                    'columns': {},
                    'measures': []
                }
            
            # Check for end of table
            elif line == '}' and in_table:
                in_table = False
                in_columns = False
                in_measures = False
            
            # Check for columns section
            elif in_table and 'columns' in line and '{' in line:
                in_columns = True
            
            # Check for measures section
            elif in_table and 'measures' in line and '{' in line:
                in_columns = False
                in_measures = True
            
            # Parse column definitions
            elif in_table and in_columns and '=' in line and not line.startswith('/'): 
                parts = line.split('=', 1)
                if len(parts) == 2:
                    col_name = parts[0].strip()
                    data_type = 'string'  # Default type
                    
                    # Try to extract data type
                    if 'Int64' in parts[1] or 'integer' in parts[1].lower():
                        data_type = 'integer'
                    elif 'Decimal' in parts[1] or 'double' in parts[1].lower() or 'real' in parts[1].lower():
                        data_type = 'decimal'
                    elif 'DateTime' in parts[1] or 'date' in parts[1].lower():
                        data_type = 'datetime'
                    elif 'Boolean' in parts[1] or 'bool' in parts[1].lower():
                        data_type = 'boolean'
                    
                    tables_info[current_table]['columns'][col_name] = data_type
            
            # Parse measure definitions
            elif in_table and in_measures and '=' in line and not line.startswith('/'):
                parts = line.split('=', 1)
                if len(parts) == 2:
                    measure_name = parts[0].strip()
                    tables_info[current_table]['measures'].append(measure_name)
    
    return tables_info


def clean_name(name):
    """
    Clean a name by removing quotes and extra whitespace.
    
    Args:
        name (str): The name to clean
        
    Returns:
        str: The cleaned name
    """
    name = name.strip()
    if name.startswith("'") and name.endswith("'"):
        name = name[1:-1].strip()
    return name


def extract_column_name_from_expression(expression):
    """
    Extract the column name from expressions like `Año = YEAR([Date])`
    
    Args:
        expression (str): The expression to extract from
        
    Returns:
        str: The extracted column name
    """
    # First check for quoted names ('Column Name')
    quoted_match = re.match(r'\'([^\']+)\'', expression.strip())
    if quoted_match:
        return quoted_match.group(1)
    
    # Then check for unquoted names
    unquoted_match = re.match(r'([^\s=]+)', expression.strip())
    if unquoted_match:
        return unquoted_match.group(1)
    
    return expression.strip()


def parse_file_content(file_content):
    """
    Parse the TMDL file content directly from memory and extract table and column information.
    
    Args:
        file_content (str): Content of the uploaded file as a string
        
    Returns:
        dict: Dictionary containing table information with columns and measures
    """
    # Initialize tables dictionary
    tables = {}
    
    # Split the file into blocks where each block starts with "table "
    blocks = re.split(r'\btable\s+', file_content)
    
    # Process each block (skip the first one as it's content before the first table)
    for block in blocks[1:]:
        lines = block.splitlines()
        if not lines:
            continue

        # The first line is expected to be the table name
        table_name = lines[0].strip()
        
        # If there's an "=" artifact, take only the part before it
        if "=" in table_name:
            table_name = table_name.split("=")[0].strip()
            
        # Remove quotes or brackets from table name
        table_name = table_name.replace("[", "").replace("]", "")
        table_name = clean_name(table_name)
        
        # Skip LocalDateTable or any table that is hidden
        if "LocalDateTable" in table_name or "isHidden" in block:
            continue
            
        if not table_name:
            continue
            
        if table_name not in tables:
            tables[table_name] = {'columns': {}, 'measures': []}
            
        # Extract column definitions using regex that handles newlines/indentations
        col_defs = re.findall(r'column\s+([^\n]+?)(?:\s*\n\s+)+dataType:\s*([^\n]+)', block, re.DOTALL)
        for col, dtype in col_defs:
            col = extract_column_name_from_expression(col)  # Extract just the column name
            col = clean_name(col)
            dtype = dtype.strip()
            if col:
                tables[table_name]['columns'][col] = dtype
                
        # Handle calculated columns or expressions (DAX)
        dax_columns = re.findall(r'column\s+\'([^\']+)\'\s*=\s*([^\n]+)', block)
        for col_name, expression in dax_columns:
            col_name = clean_name(col_name)
            if col_name:
                tables[table_name]['columns'][col_name] = "Calculated Column (DAX)"
                
        # Extract measure definitions: capture text after "measure" up to "="
        measure_defs = re.findall(r'measure\s+([^\n=]+?)\s*=', block)
        for mname in measure_defs:
            mname = clean_name(mname)
            if mname and mname not in tables[table_name]['measures']:
                tables[table_name]['measures'].append(mname)
                
    return tables
