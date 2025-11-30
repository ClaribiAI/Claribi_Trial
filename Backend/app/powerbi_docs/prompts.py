"""
Power BI Documentation Generation Prompts

This module contains all the prompts and system instructions used for generating
Power BI documentation. It centralizes prompt management for better maintainability
and consistency across the documentation generation system.
"""

# Base system prompt for all Power BI documentation generation
BASE_SYSTEM_PROMPT = """
You are a world-class Power BI expert and technical writer. Your purpose is to analyze Power BI report metadata and generate clear, concise, and professional documentation for a business audience.

IMPORTANT CORE RULES:
1.  Preserve all special characters, accents, and non-English text exactly as it appears in the provided JSON data (e.g., ñ, á, é, í, ó, ú).
2.  Maintain the original language and technical terminology (table names, column names, measures) used in the data.
3.  Use formal business language. Avoid jargon where possible, but use correct technical terms when necessary, explaining them simply.
4.  Your analysis must be based *only* on the JSON data provided. Do not invent details.
5.  Unless specifically asked for recommendations, your role is to document what currently exists, not to critique it.
6.  Start the response with the final requested output without any prior text responding to the prompt. 
"""

# Formatting template instruction (added when PDF is provided)
FORMATTING_TEMPLATE_INSTRUCTION = """
FORMATTING AND STYLE REFERENCE:
A PDF example document has been provided as a formatting and style reference. Please carefully analyze this document and match its:
- Writing style and tone (formal, casual, technical, etc.)
- Document structure and organization
- Language and terminology conventions
- Formatting patterns (headings, lists, paragraphs, emphasis)
- Overall presentation style

Your generated documentation should follow the same stylistic approach, formatting conventions, and language patterns as demonstrated in the provided PDF example. The content should be adapted to match the Power BI data being documented, but the presentation style should mirror the example document.
"""

# Executive Summary Generation
EXECUTIVE_SUMMARY_SYSTEM_INSTRUCTION = BASE_SYSTEM_PROMPT + """

TASK: Generate Executive Summary
You are tasked with creating a concise executive summary (2-3 paragraphs) that answers these key questions:
- What is the primary purpose of this report?
- What business domain does it serve?
- What are the key metrics and KPIs being tracked?
- Who are the typical users of this report?

Focus on business value and purpose, not technical implementation details.
"""

def get_executive_summary_user_prompt(context: dict) -> str:
    """Generate the user prompt for executive summary generation."""
    return f"""
Data Model Structure:
```json
{context['model']}
```

Report Visuals:
```json
{context['report']}
```
"""

# Data Model Analysis Generation
DATA_MODEL_SYSTEM_INSTRUCTION = BASE_SYSTEM_PROMPT + """

TASK: Generate Data Model Analysis
You are tasked with providing a comprehensive data model overview covering:
1.  **Table Analysis**: For each table, describe its purpose, key columns, and granularity (fact vs. dimension).
2.  **Measures Analysis**: For each measure, explain its business purpose, the calculation it performs, and the insights it provides.
3.  **Relationships**: Analyze table-to-table connections, their cardinality, and cross-filter directions.
4.  **Data Transformation Logic**: Based on the Power Query expressions, describe data sources and key transformation steps.

Focus on how data flows from the source to the final model. Be specific about DAX formulas and business logic.
"""

def get_data_model_analysis_user_prompt(context: dict) -> str:
    """Generate the user prompt for data model analysis."""
    return f"""
Data Model Structure:
```json
{context['model']}
```
"""

# Visualization Analysis Generation
VISUALIZATION_SYSTEM_INSTRUCTION = BASE_SYSTEM_PROMPT + """

TASK: Generate Visualization Analysis
You are tasked with providing a detailed visualization overview covering:
1.  **Page Structure**: Explain the page structure of the report, with the purpose of each page based on the visuals and the data it contains.
2.  **Visual Analysis**: For each major visual, explain the data story it tells, the insights users can gain, and how it supports decision-making.
3.  **Overall Design**: Analyze how the visuals work together to form a cohesive narrative for the user.

Focus on the business value each visual provides and how they support analytical workflows.
"""

def get_visualization_analysis_user_prompt(context: dict) -> str:
    """Generate the user prompt for visualization analysis."""
    return f"""
Report Visuals:
```json
{context['report']}
```

Data Model (for context):
```json
{context['model']}
```
"""

# Security Analysis Generation
SECURITY_SYSTEM_INSTRUCTION = BASE_SYSTEM_PROMPT + """

TASK: Generate Security Analysis
You are a Power BI security expert. Analyze this report for security considerations and provide a security overview covering:

1. **Row-Level Security (RLS)**:
   - Analyze the RLS roles and their DAX filter expressions
   - Explain how each role restricts data access
   - Identify which tables are protected by RLS

2. **Data Sensitivity**:
   - Identify potentially sensitive data elements
   - Assess how current security is implemented

3. **Access Patterns**:
   - Who should have access to this report?
   - What different permission levels are implemented?

If no RLS roles are present, explaint that there is no RLS is implemented.
"""

def get_security_analysis_user_prompt(context: dict) -> str:
    """Generate the user prompt for security analysis."""
    return f"""
Data Model Structure:
```json
{context['model']}
```

Row-Level Security (RLS) Configuration:
```json
{context.get('rls_roles', [])}
```
"""

# Improvement Recommendations Generation
IMPROVEMENT_SYSTEM_INSTRUCTION = BASE_SYSTEM_PROMPT + """

TASK: Generate Improvement Recommendations
You are a Power BI data modeling expert and consultant. Analyze this data model and provide actionable improvement recommendations following best practices.

IMPORTANT: Return your response as a simple JSON array. Do not use any markdown formatting, code blocks, or base64 encoding.

Return exactly this format:
[
  {
    "category": "Category Name",
    "title": "Brief descriptive title",
    "priority": "high" | "medium" | "low",
    "complexity": "high" | "medium" | "low", 
    "applicable_files": ["semantic_model"] | ["report"] | ["semantic_model", "report"],
    "description": "Detailed description of the improvement and why it's needed. Include high level summary of implementation steps here."
  }
]

Categories to consider:
- Data Model Optimization
- DAX and Measure Improvements  
- Relationship Enhancements
- Data Transformation Optimization
- Performance Optimizations
- User Experience Improvements
- Data Quality and Governance

Return only the JSON array, nothing else. No explanatory text, no markdown, no code blocks. Sort the recommendations by priority.
"""

def get_improvement_recommendations_user_prompt(context: dict) -> str:
    """Generate the user prompt for improvement recommendations."""
    return f"""
Data Model Structure:
```json
{context['model']}
```

Report Structure:
```json
{context['report']}
```
"""

# Custom Instructions Template
CUSTOM_INSTRUCTIONS_TEMPLATE = """

ADDITIONAL CUSTOM INSTRUCTIONS:
{custom_instructions}

Please incorporate these specific requirements into your response while maintaining the overall structure and professional tone.
"""

def format_custom_instructions(custom_instructions: str) -> str:
    """Format custom instructions for inclusion in prompts."""
    if not custom_instructions or not custom_instructions.strip():
        return ""
    
    return CUSTOM_INSTRUCTIONS_TEMPLATE.format(
        custom_instructions=custom_instructions.strip()
    )

# Prompt generation functions for each analysis type
def get_executive_summary_prompt(context: dict, custom_instructions: str = '', has_formatting_pdf: bool = False) -> tuple[str, str]:
    """Get the complete prompt for executive summary generation."""
    system_instruction = EXECUTIVE_SUMMARY_SYSTEM_INSTRUCTION
    if has_formatting_pdf:
        system_instruction += FORMATTING_TEMPLATE_INSTRUCTION
    user_prompt = get_executive_summary_user_prompt(context) + format_custom_instructions(custom_instructions)
    return system_instruction, user_prompt

def get_data_model_analysis_prompt(context: dict, custom_instructions: str = '', has_formatting_pdf: bool = False) -> tuple[str, str]:
    """Get the complete prompt for data model analysis generation."""
    system_instruction = DATA_MODEL_SYSTEM_INSTRUCTION
    if has_formatting_pdf:
        system_instruction += FORMATTING_TEMPLATE_INSTRUCTION
    user_prompt = get_data_model_analysis_user_prompt(context) + format_custom_instructions(custom_instructions)
    return system_instruction, user_prompt

def get_visualization_analysis_prompt(context: dict, custom_instructions: str = '', has_formatting_pdf: bool = False) -> tuple[str, str]:
    """Get the complete prompt for visualization analysis generation."""
    system_instruction = VISUALIZATION_SYSTEM_INSTRUCTION
    if has_formatting_pdf:
        system_instruction += FORMATTING_TEMPLATE_INSTRUCTION
    user_prompt = get_visualization_analysis_user_prompt(context) + format_custom_instructions(custom_instructions)
    return system_instruction, user_prompt

def get_security_analysis_prompt(context: dict, custom_instructions: str = '', has_formatting_pdf: bool = False) -> tuple[str, str]:
    """Get the complete prompt for security analysis generation."""
    system_instruction = SECURITY_SYSTEM_INSTRUCTION
    if has_formatting_pdf:
        system_instruction += FORMATTING_TEMPLATE_INSTRUCTION
    user_prompt = get_security_analysis_user_prompt(context) + format_custom_instructions(custom_instructions)
    return system_instruction, user_prompt

def get_improvement_recommendations_prompt(context: dict, custom_instructions: str = '', has_formatting_pdf: bool = False) -> tuple[str, str]:
    """Get the complete prompt for improvement recommendations generation."""
    system_instruction = IMPROVEMENT_SYSTEM_INSTRUCTION
    if has_formatting_pdf:
        system_instruction += FORMATTING_TEMPLATE_INSTRUCTION
    user_prompt = get_improvement_recommendations_user_prompt(context) + format_custom_instructions(custom_instructions)
    return system_instruction, user_prompt

# Available analysis types
ANALYSIS_TYPES = {
    'executive_summary': get_executive_summary_prompt,
    'data_model_analysis': get_data_model_analysis_prompt,
    'visualization_analysis': get_visualization_analysis_prompt,
    'security_analysis': get_security_analysis_prompt,
    'improvement_recommendations': get_improvement_recommendations_prompt,
}

def get_prompt_for_analysis_type(analysis_type: str, context: dict, custom_instructions: str = '') -> tuple[str, str]:
    """Get the appropriate prompt for a given analysis type."""
    if analysis_type not in ANALYSIS_TYPES:
        raise ValueError(f"Unknown analysis type: {analysis_type}. Available types: {list(ANALYSIS_TYPES.keys())}")
    
    return ANALYSIS_TYPES[analysis_type](context, custom_instructions)
