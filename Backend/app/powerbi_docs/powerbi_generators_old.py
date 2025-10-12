import json
import base64
import logging
from typing import Dict, List
import re

# Configure logger
logger = logging.getLogger(__name__)

class PowerBIDocumentationGenerator:
    """Handles AI documentation generation using Gemini"""
    
    def __init__(self, gemini_chat):
        self.chat = gemini_chat
    
    def generate_executive_summary(self, context: Dict, custom_instructions: str = '') -> str:
        """Generate executive summary of the report"""
        try:
            base_prompt = f"""
            You are a Power BI expert. Analyze this Power BI report and provide a brief executive summary.

            IMPORTANT: Preserve all special characters, accents, and non-English text exactly as they appear (ñ, á, é, í, ó, ú, etc.). Maintain the original language and terminology used in the data.

            Data Model Structure:
            ```json
            {json.dumps(context['model'], indent=2, ensure_ascii=False)}
            ```

            Report Visuals:
            ```json
            {json.dumps(context['report'], indent=2, ensure_ascii=False)}
            ```

            Provide a concise executive summary (2-3 paragraphs) covering:
            - What is the primary purpose of this report?
            - What business domain does it serve?
            - What are the key metrics and KPIs being tracked?
            - Who would be the typical users of this report?

            Focus on business value and purpose, not technical details. Stick to formal business language and avoid technical jargon. Your response will be used in formal documentation. Preserve original terminology and special characters exactly as they appear.
            """

            # Add custom instructions if provided
            if custom_instructions and custom_instructions.strip():
                prompt = base_prompt + f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your executive summary while maintaining the overall structure and professional tone.
                """
            else:
                prompt = base_prompt

            logger.info("Generating executive summary with Gemini")
            #logger.info(f"prompt: {prompt}")
            response = self.chat.send_message(prompt)
            return response.text

        except Exception as e:
            logger.error(f"Error generating executive summary: {str(e)}")
            return f"Error generating executive summary: {str(e)}"

    def generate_data_model_analysis(self, context: Dict, custom_instructions: str = '') -> str:
        """Generate detailed data model analysis"""
        try:
            base_prompt = f"""
            You are a Power BI data modeling expert. Analyze this data model in detail to generate documentation of the data model.

            IMPORTANT: Preserve all special characters, accents, and non-English text exactly as they appear (ñ, á, é, í, ó, ú, etc.). Maintain the original language and terminology used in the data.

            Data Model Structure:
            ```json
            {json.dumps(context['model'], indent=2, ensure_ascii=False)}
            ```

            Provide a comprehensive data model overview covering:

            1. **Table Analysis**: For each table, describe:
               - Purpose and business context
               - Key columns and their significance
               - Data granularity (fact vs dimension)

            2. **Measures Analysis**: For each measure, explain:
               - Business purpose and what it calculates
               - Key business insights it provides
               - How it relates to other measures
               - Any complex logic or calculations

            3. **Relationships**: Analyze the data model relationships:
               - Table-to-table connections and their cardinality
               - Cross-filter directions and active relationships
               - Data flow and dependencies between fact and dimension tables

            4. **Data Transformation Logic**: Analyze the Power Query expressions:
               - Data source connections and origins
               - Key transformation steps and their business purpose
               - Data cleaning and preparation logic
               - Query groups and their organization
               - How raw data is transformed into the final model structure
               - Complex M code transformations and their impact

            Be specific about DAX formulas, Power Query transformations, and business logic. Explain measures and transformations in business terms. Focus on how data flows from source to final model. Stick to formal business language and avoid technical jargon. Your response will be used in formal documentation. Do not include any suggestions for improvements or optimizations. Preserve original terminology and special characters exactly as they appear.
            """

            # Add custom instructions if provided
            if custom_instructions and custom_instructions.strip():
                prompt = base_prompt + f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your data model analysis while maintaining the overall structure and professional tone.
                """
            else:
                prompt = base_prompt

            logger.info("Generating data model analysis with Gemini")
            response = self.chat.send_message(prompt)
            return response.text

        except Exception as e:
            logger.error(f"Error generating data model analysis: {str(e)}")
            return f"Error generating data model analysis: {str(e)}"

    def generate_visualization_analysis(self, context: Dict, custom_instructions: str = '') -> str:
        """Generate detailed visualization analysis"""
        try:
            base_prompt = f"""
            You are a Power BI visualization expert. Analyze this report's visual structure. Your response will be used in formal documentation.

            IMPORTANT: Preserve all special characters, accents, and non-English text exactly as they appear (ñ, á, é, í, ó, ú, etc.). Maintain the original language and terminology used in the data.

            Report Visuals:
            ```json
            {json.dumps(context['report'], indent=2, ensure_ascii=False)}
            ```

            Data Available:
            ```json
            {json.dumps(context['model'], indent=2, ensure_ascii=False)}
            ```

            Provide a detailed visualization overview covering:

            1. **Page Structure**: Group visuals by likely report pages based on visual types and data usage

            2. **Visual Analysis**: For each visual, explain:
               - What data story it tells
               - What insights users can gain
               - How it supports decision making
               - Interactivity and filtering capabilities

            3. **Overall Design**: Analyze:
               - How visuals work together to tell a cohesive story
               - User experience and navigation flow
               - Key performance indicators highlighted
               - Dashboard vs detailed analysi\s sections

            Focus on the business value each visual provides and how they support analytical workflows. Stick to formal business language and avoid technical jargon. Your response will be used in formal documentation. Do not include any suggestions for improvements or optimizations. Preserve original terminology and special characters exactly as they appear.
            """

            # Add custom instructions if provided
            if custom_instructions and custom_instructions.strip():
                prompt = base_prompt + f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your visualization analysis while maintaining the overall structure and professional tone.
                """
            else:
                prompt = base_prompt

            logger.info("Generating visualization analysis with Gemini")
            response = self.chat.send_message(prompt)
            return response.text

        except Exception as e:
            logger.error(f"Error generating visualization analysis: {str(e)}")
            return f"Error generating visualization analysis: {str(e)}"

    def generate_security_analysis(self, context: Dict, custom_instructions: str = '') -> str:
        """Generate security and access control analysis"""
        try:
            base_prompt = f"""
            You are a Power BI security expert. Analyze this report for security considerations. Your response will be used in formal documentation.

            IMPORTANT: Preserve all special characters, accents, and non-English text exactly as they appear (ñ, á, é, í, ó, ú, etc.). Maintain the original language and terminology used in the data.

            Data Model Structure:
            ```json
            {json.dumps(context['model'], indent=2, ensure_ascii=False)}
            ```

            Report Structure:
            ```json
            {json.dumps(context['report'], indent=2, ensure_ascii=False)}
            ```

            Provide a security overview covering:

            1. **Row-Level Security (RLS)**:
               - Look for patterns in tables that suggest RLS implementation
               - Identify dimension tables that might control access (like users, departments, regions)
               - Assess if security filters are likely in place

            2. **Data Sensitivity**:
               - Identify potentially sensitive data elements
               - Assess what level of access control might be needed
               - Recommend security considerations

            3. **Access Patterns**:
               - Who should have access to this report?
               - What different permission levels might be appropriate?
               - Any data that requires special protection?

            4. **Security Recommendations**:
               - Suggested RLS implementation if not present
               - Data governance considerations
               - Best practices for this type of report

            If no obvious security measures are detected, explain what should be considered. Preserve original terminology and special characters exactly as they appear.
            """

            # Add custom instructions if provided
            if custom_instructions and custom_instructions.strip():
                prompt = base_prompt + f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your security analysis while maintaining the overall structure and professional tone.
                """
            else:
                prompt = base_prompt

            logger.info("Generating security analysis with Gemini")
            response = self.chat.send_message(prompt)
            return response.text

        except Exception as e:
            logger.error(f"Error generating security analysis: {str(e)}")
            return f"Error generating security analysis: {str(e)}"

    def generate_improvement_recommendations(self, context: Dict, custom_instructions: str = '') -> str:
        """Generate data model improvement recommendations"""
        try:
            base_prompt = f"""
            You are a Power BI data modeling expert and consultant. Analyze this data model and provide actionable improvement recommendations following the best practices.

            IMPORTANT: Preserve all special characters, accents, and non-English text exactly as they appear (ñ, á, é, í, ó, ú, etc.). Maintain the original language and terminology used in the data.

            Data Model Structure:
            ```json
            {json.dumps(context['model'], indent=2, ensure_ascii=False)}
            ```

            Report Structure:
            ```json
            {json.dumps(context['report'], indent=2, ensure_ascii=False)}
            ```

            CRITICAL: Construct a valid JSON array with this structure (objects may repeat for each recommendation):
            [
              {{
                "CATEGORY": "Category Name",
                "TITLE": "Brief descriptive title",
                "PRIORITY": "high" | "medium" | "low",
                "COMPLEXITY": "high" | "medium" | "low",
                "APPLICABLE_FILES": "semantic_model" | "report" | "both",
                "DESCRIPTION": "Detailed description of the improvement and why it's needed",
                "IMPLEMENTATION": "Specific steps on how to implement this improvement (plain text only)"
              }}
            ]

            MACHINE-READABLE OUTPUT (STRICT - for parsing):
            You MUST include a machine-readable payload exactly as follows. Do not add any extra characters or formatting around it.

            Place the base64-encoded JSON array (UTF-8) between these markers on its own lines:

            <<<RECOMMENDATIONS_JSON_BASE64_START>>>
            <base64-encoded-utf8-of-the-JSON-array-described-above>
            <<<RECOMMENDATIONS_JSON_BASE64_END>>>

            Rules for the payload:
            - The JSON array MUST be valid JSON.
            - Encode the raw JSON array bytes as base64 (standard base64, no URL-safe variant).
            - Do NOT include code fences (no ```), backticks, or any JSON code blocks anywhere in the response. If you show human-readable content, use plain text only.
            - Do NOT include any extra whitespace before/after the base64 line.
            - Do NOT include additional lines between the START and END markers aside from the single base64 line.
            - The base64 line MUST contain only ASCII characters in the standard base64 alphabet: [A-Z][a-z][0-9]+/ and '=' padding. No other characters.

            Provide comprehensive improvement recommendations covering:

            1. **Data Model Optimization**:
               - Table structure improvements (star schema, dimension modeling)
               - Relationship optimization and missing relationships
               - Data type optimizations for better performance
               - Calculated column vs measure recommendations

            2. **DAX and Measure Improvements**:
               - More efficient DAX formulas
               - Missing key measures that would add business value
               - Performance optimization opportunities
               - Better naming conventions and organization

            3. **Relationship Enhancements**:
               - Missing relationships that should be created
               - Bidirectional filtering recommendations
               - Inactive relationships that could be optimized
               - Many-to-many relationship alternatives

            4. **Data Transformation Optimization**:
               - Power Query performance improvements
               - Query folding opportunities
               - Redundant transformation steps that can be eliminated
               - Data source connection optimization
               - Query group organization and efficiency
               - M code best practices and optimization opportunities
               - Data loading and refresh performance improvements

            5. **Performance Optimizations**:
               - Indexing and partitioning suggestions
               - Query performance improvements
               - Memory usage optimizations
               - Data refresh optimization opportunities
               - Transformation performance enhancements

            6. **User Experience Improvements**:
               - Better organization of tables and measures
               - Improved naming conventions for business users
               - Missing calculated tables or columns for easier reporting
               - Hierarchies and drill-down improvements

            7. **Data Quality and Governance**:
               - Data validation and quality checks
               - Documentation and metadata improvements
               - Standardization opportunities
               - Best practices compliance

            Focus on practical, actionable recommendations that would provide real business value. Prioritize the most impactful improvements first. Be specific about implementation steps where possible. Provide examples of DAX formulas, Power Query optimizations, and measures whenever applicable. 

            REMEMBER: Your entire response must be a valid JSON array wrapped in ```json code blocks. Each recommendation must be a separate object in the array with all the required fields.

            STRICT FORMAT RULES (CRITICAL):
            - Do NOT use triple backticks inside any JSON string values. If you need to include code, include it as plain text without ``` fences.
            - Inside JSON string values, avoid using double quotes (") unless they are escaped as \". Prefer single quotes where possible in prose and code.
            - Ensure all newlines inside JSON string values are represented as \n, not raw line breaks.
            """

            # Add custom instructions if provided
            if custom_instructions and custom_instructions.strip():
                prompt = base_prompt + f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your improvement recommendations while maintaining the JSON format structure.
                """
            else:
                prompt = base_prompt

            logger.info("Generating improvement recommendations with JSON format")
            response = self.chat.send_message(prompt)
            logger.info(f"Gemini response: {response.text}")
            return response.text

        except Exception as e:
            logger.error(f"Error generating improvement recommendations: {str(e)}")
            return f"Error generating improvement recommendations: {str(e)}"

    def parse_improvement_recommendations(self, recommendations_text: str) -> List[Dict]:
        """Parse improvement recommendations text into individual actionable items"""
        try:
            logger.info(f"Parsing structured recommendations text of length: {len(recommendations_text)}")

            # Parse base64 payload between explicit markers by scanning lines (simple and robust)
            start_marker = '<<<RECOMMENDATIONS_JSON_BASE64_START>>>'
            end_marker = '<<<RECOMMENDATIONS_JSON_BASE64_END>>>'
            lines = recommendations_text.splitlines()

            payload_lines: List[str] = []
            collecting = False
            for line in lines:
                if not collecting and start_marker in line:
                    collecting = True
                    continue
                if collecting:
                    if end_marker in line:
                        break
                    # Collect non-empty lines (some models may wrap long base64)
                    if line.strip():
                        payload_lines.append(line.strip())

            if not payload_lines:
                raise ValueError("Missing machine-readable payload: base64 block not found")

            # Join any wrapped lines
            raw_payload = ''.join(payload_lines)

            # Attempt strict base64 decode first
            try:
                # Filter to base64 alphabet to avoid non-ASCII errors
                allowed = set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=')
                filtered_payload = ''.join(ch for ch in raw_payload if ch in allowed)
                if not filtered_payload:
                    raise ValueError("Payload between markers is empty or contains no base64 characters")
                logger.info("Found base64 payload between markers. Decoding...")
                raw_json_bytes = base64.b64decode(filtered_payload, validate=True)
                parsed_json = json.loads(raw_json_bytes.decode('utf-8'))
            except Exception as decode_err:
                logger.warning(f"Base64 decode failed; attempting raw JSON parse: {decode_err}")
                # Some models may place the raw JSON array directly between markers
                parsed_json = json.loads(raw_payload)
            return self._normalize_recommendations(parsed_json)
            
        except Exception as e:
            logger.error(f"Error parsing improvement recommendations: {str(e)}", exc_info=True)
            # Do not attempt any fallback; surface the error
            raise

    def _normalize_recommendations(self, parsed_json: List[Dict]) -> List[Dict]:
        """Normalize parsed JSON array into the internal recommendation format."""
        recommendations: List[Dict] = []
        for i, item in enumerate(parsed_json):
            if not isinstance(item, dict):
                continue
            rec_data = item.get('recommendation', item) if isinstance(item, dict) else {}
            recommendation = {
                'id': f"rec_{i + 1}",
                'category': rec_data.get('CATEGORY', rec_data.get('category', 'General Improvement')),
                'title': rec_data.get('TITLE', rec_data.get('title', 'Untitled Recommendation')),
                'priority': rec_data.get('PRIORITY', rec_data.get('priority', 'medium')).lower(),
                'complexity': rec_data.get('COMPLEXITY', rec_data.get('complexity', 'medium')).lower(),
                'description': rec_data.get('DESCRIPTION', rec_data.get('description', '')),
                'implementation': rec_data.get('IMPLEMENTATION', rec_data.get('implementation', '')),
            }
            applicable_files = rec_data.get('APPLICABLE_FILES', rec_data.get('applicable_files', 'both'))
            if isinstance(applicable_files, str):
                if applicable_files.lower() == 'both':
                    recommendation['applicable_files'] = ['semantic_model', 'report']
                elif applicable_files.lower() in ['semantic_model', 'report']:
                    recommendation['applicable_files'] = [applicable_files.lower()]
                else:
                    recommendation['applicable_files'] = ['semantic_model', 'report']
            elif isinstance(applicable_files, list):
                recommendation['applicable_files'] = applicable_files
            else:
                recommendation['applicable_files'] = ['semantic_model', 'report']

            # Combine description and implementation for a single long description if implementation exists
            full_description = recommendation['description']
            if recommendation.get('implementation'):
                full_description += f"\n\nImplementation:\n{recommendation['implementation']}"
            recommendation['description'] = full_description

            if recommendation['title'] and recommendation['description']:
                recommendations.append(recommendation)
        logger.info(f"Parsed {len(recommendations)} recommendations")
        return recommendations

    def _sanitize_json_content(self, json_content: str) -> str:
        """Sanitize JSON content to handle common escape sequence issues"""
        try:
            # Handle common problematic escape sequences
            # First, let's log a preview of the content to see what we're dealing with
            logger.info(f"Original JSON content preview (first 200 chars): {json_content[:200]}")
            
            # First, try to parse as-is since the JSON might already be valid
            try:
                json.loads(json_content)
                logger.info("JSON content is already valid, no sanitization needed")
                return json_content
            except json.JSONDecodeError:
                logger.info("JSON content needs sanitization")
            
            # Step 0: Escape any raw newlines that appear inside JSON string literals
            json_content = self._escape_raw_newlines_in_json_strings(json_content)

            # Step 1: Strip markdown code fences (```lang ... ```), but keep their content safely escaped
            json_content = self._strip_code_fences_and_escape(json_content)

            # The main issue is unescaped quotes in string values
            # Let's fix this by properly escaping quotes inside JSON strings
            json_content = self._fix_unescaped_quotes_in_json(json_content)
            
            # Replace common problematic escape sequences
            # Handle backslashes that aren't proper escape sequences (but preserve valid ones)
            json_content = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', json_content)
            
            # Handle any remaining problematic control characters (but keep newlines, tabs, returns)
            json_content = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', json_content)

            # Step 2: Targeted escaping for DESCRIPTION and IMPLEMENTATION fields
            for field_name in ["DESCRIPTION", "description", "IMPLEMENTATION", "implementation"]:
                json_content = self._escape_field_string_value(json_content, field_name)
            
            logger.info(f"Sanitized JSON content preview (first 200 chars): {json_content[:200]}")
            
            return json_content
            
        except Exception as e:
            logger.error(f"Error sanitizing JSON content: {str(e)}")
            return json_content

    def _strip_code_fences_and_escape(self, text: str) -> str:
        """Remove markdown code fences from within the JSON text and escape inner quotes/backslashes.
        This helps when the model includes ```dax ...``` or similar inside JSON string values.
        """
        try:
            # Replace fenced code blocks with their inner content, but escape for JSON string safety
            def repl(match: re.Match) -> str:
                inner = match.group(1)
                # Normalize newlines to \n literals to be JSON-safe inside strings
                inner = inner.replace('\\', '\\\\').replace('"', '\\"').replace('\r\n', '\n').replace('\r', '\n')
                # Replace actual newlines with \n so if this sits inside a JSON string it's valid
                inner = inner.replace('\n', '\\n')
                return inner

            # ```lang(optional)\r?\n ... \r?\n   ``` (with optional indentation)
            pattern = re.compile(r"```[a-zA-Z0-9_\-]*\s*\r?\n([\s\S]*?)\r?\n\s*```", re.MULTILINE)
            return re.sub(pattern, repl, text)
        except Exception as e:
            logger.error(f"Error stripping code fences: {str(e)}")
            return text

    def _escape_field_string_value(self, text: str, field_name: str) -> str:
        """Escapes problematic quotes and raw newlines inside a specific JSON string field value in a lenient way.
        It looks for the pattern "FIELD": "..." and ensures the inner content has escaped quotes and newlines.
        """
        try:
            # Use a regex with a lookahead to capture until the closing quote before the next known key or end of object
            known_keys = [
                'CATEGORY','TITLE','PRIORITY','COMPLEXITY','APPLICABLE_FILES','DESCRIPTION','IMPLEMENTATION',
                'category','title','priority','complexity','applicable_files','description','implementation'
            ]
            # Build lookahead for next key or end brace
            next_keys_alt = '|'.join(re.escape(k) for k in known_keys)
            pattern = re.compile(
                rf'("{re.escape(field_name)}"\s*:\s*")([\s\S]*?)("(?=\s*,\s*"(?:{next_keys_alt})"|\s*\}}))'
            )

            def _field_repl(m: re.Match) -> str:
                prefix, value, closing = m.group(1), m.group(2), m.group(3)
                # Make value JSON-string safe
                safe = value
                safe = safe.replace('\\', '\\\\').replace('"', '\\"')
                # Turn raw newlines into \n
                safe = safe.replace('\r\n', '\n').replace('\r', '\n').replace('\n', '\\n')
                return f"{prefix}{safe}{closing}"

            return re.sub(pattern, _field_repl, text)
        except Exception as e:
            logger.error(f"Error escaping field value for {field_name}: {str(e)}")
            return text

    def _fix_unescaped_quotes_in_json(self, json_content: str) -> str:
        """Fix unescaped quotes inside JSON string values using a direct approach"""
        try:
            logger.info("Fixing unescaped quotes in JSON")
            
            # Direct approach: Since we know the issue is with markdown in string values,
            # let's escape problematic characters in a targeted way
            
            # First, let's look at what's around the error position
            logger.info("Looking for common patterns that break JSON")
            
            # Common patterns that break JSON in markdown content:
            # 1. **bold** text (asterisks might not be the issue, but quotes around them could be)
            # 2. Unescaped quotes in text
            # 3. Backslashes in paths or other content
            
            # Simple fix: escape all unescaped quotes that are not field delimiters
            result = json_content
            
            # Method 1: Replace common problematic patterns
            # Pattern: "field": "value with "quotes" inside"
            # This will be harder to match with regex, so let's use a different approach
            
            # Method 2: Use Python's json module to detect and fix issues
            # Try to parse and see where it fails, then fix that specific area
            
            import json
            try:
                json.loads(result)
                logger.info("JSON is already valid after basic checks")
                return result
            except json.JSONDecodeError as e:
                logger.info(f"JSON error at position {e.pos}: {str(e)}")
                
                # Get the area around the error
                start_pos = max(0, e.pos - 100)
                end_pos = min(len(result), e.pos + 100)
                error_context = result[start_pos:end_pos]
                logger.info(f"Error context: {repr(error_context)}")
                
                # Try to fix the specific issue
                # Look for the pattern of unterminated strings
                
                # Find the line with the error
                lines = result.split('\n')
                char_count = 0
                error_line_idx = 0
                
                for i, line in enumerate(lines):
                    if char_count + len(line) + 1 > e.pos:  # +1 for newline
                        error_line_idx = i
                        break
                    char_count += len(line) + 1
                
                logger.info(f"Error on line {error_line_idx}: {repr(lines[error_line_idx])}")
                
                # Simple fix: escape quotes in the problematic line
                if error_line_idx < len(lines):
                    problematic_line = lines[error_line_idx]
                    
                    
                    # Check if this line contains a field:value pair
                    if '": "' in problematic_line:
                        # Split at the field:value boundary
                        field_value_split = problematic_line.split('": "', 1)
                        if len(field_value_split) == 2:
                            field_part = field_value_split[0] + '": "'
                            value_part = field_value_split[1]
                            
                            # Escape quotes in the value part, but be careful about the ending
                            # Find the last quote that should be the string terminator
                            if value_part.endswith('"') or value_part.endswith('",') or value_part.endswith('"}'):
                                # Find the real end
                                end_patterns = ['"', '",', '"}']
                                ending = ''
                                actual_value = value_part
                                
                                for pattern in end_patterns:
                                    if value_part.endswith(pattern):
                                        ending = pattern
                                        actual_value = value_part[:-len(pattern)]
                                        break
                                
                                # Escape quotes in the actual value
                                escaped_value = actual_value.replace('\\', '\\\\').replace('"', '\\"')
                                
                                # Reconstruct the line
                                fixed_line = field_part + escaped_value + ending
                                lines[error_line_idx] = fixed_line
                                
                                result = '\n'.join(lines)
                                logger.info(f"Fixed line: {repr(fixed_line)}")
                
                return result
            
        except Exception as e:
            logger.error(f"Error fixing unescaped quotes: {str(e)}")
            return json_content

    def _find_next_non_whitespace(self, text: str, start_index: int) -> int:
        """Find the next non-whitespace character starting from start_index"""
        i = start_index
        while i < len(text) and text[i] in ' \t\n\r':
            i += 1
        return i if i < len(text) else None

    def _aggressive_json_sanitization(self, json_content: str) -> str:
        """More aggressive JSON sanitization for problematic content"""
        try:
            logger.info("Attempting aggressive JSON sanitization")
            
            # Try a different approach - parse the JSON structure more carefully
            # Look for the specific issue in the error message
            
            # First, try to fix common structural issues
            # Remove trailing commas before closing brackets/braces
            json_content = re.sub(r',(\s*[\}\]])', r'\1', json_content)
            
            # Fix any unescaped quotes in string values (but be very careful)
            # This is complex, so let's try a simpler approach first
            
            # Handle backslashes more carefully
            # Only fix backslashes that are clearly problematic
            json_content = re.sub(r'\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})', r'\\\\', json_content)
            
            # Remove any remaining problematic control characters but keep valid whitespace
            json_content = ''.join(char for char in json_content if ord(char) >= 32 or char in '\n\t\r')
            
            # Try to fix specific common issues
            # Remove any BOM characters
            json_content = json_content.replace('\ufeff', '')

            # Strip code fences again as a safety net and escape values for known fields
            json_content = self._strip_code_fences_and_escape(json_content)
            # Escape any raw newlines that appear inside JSON string literals
            json_content = self._escape_raw_newlines_in_json_strings(json_content)
            for field_name in ["DESCRIPTION", "description", "IMPLEMENTATION", "implementation"]:
                json_content = self._escape_field_string_value(json_content, field_name)
            
            # Log the first few lines to see structure
            lines = json_content.split('\n')[:5]
            logger.info(f"Aggressive sanitization first 5 lines: {lines}")
            
            return json_content
            
        except Exception as e:
            logger.error(f"Error in aggressive JSON sanitization: {str(e)}")
            return json_content

    def _escape_raw_newlines_in_json_strings(self, text: str) -> str:
        """Walk the JSON text and replace raw newline characters with \n only when inside string literals.
        This preserves structure while making multiline values JSON-safe.
        """
        try:
            result_chars = []
            in_string = False
            escape = False
            for ch in text:
                if escape:
                    # Whatever follows a backslash is part of an escape sequence
                    result_chars.append(ch)
                    escape = False
                    continue
                if ch == '\\':
                    result_chars.append(ch)
                    escape = True
                    continue
                if ch == '"':
                    result_chars.append(ch)
                    in_string = not in_string
                    continue
                if ch == '\n' and in_string:
                    result_chars.append('\\n')
                    continue
                if ch == '\r' and in_string:
                    # drop CR or convert to \n (we'll normalize to \n)
                    result_chars.append('\\n')
                    continue
                result_chars.append(ch)
            return ''.join(result_chars)
        except Exception as e:
            logger.error(f"Error escaping raw newlines in strings: {str(e)}")
            return text

    def _fallback_parse_recommendations(self, recommendations_text: str) -> List[Dict]:
        """Fallback method for parsing unstructured recommendations"""
        try:
            recommendations = []
            
            # Split by paragraphs and look for actionable content
            paragraphs = re.split(r'\n\s*\n\s*', recommendations_text)
            
            for i, paragraph in enumerate(paragraphs):
                paragraph = paragraph.strip()
                # Look for paragraphs that contain action words
                if (paragraph and len(paragraph) > 50 and 
                    any(word in paragraph.lower() for word in ['improve', 'optimize', 'consider', 'implement', 'add', 'create', 'modify', 'update', 'replace', 'should', 'could', 'recommend'])):
                    recommendations.append({
                        'id': f"rec_{i + 1}",
                        'category': "General Improvement",
                        'title': self._extract_title_from_content(paragraph),
                        'description': paragraph,
                        'priority': self._determine_priority(paragraph),
                        'complexity': self._determine_complexity(paragraph),
                        'applicable_files': self._determine_applicable_files(paragraph)
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in fallback parsing: {str(e)}")
            return []

    def _extract_title_from_content(self, content: str) -> str:
        """Extract a title from recommendation content"""
        # Get the first sentence or up to 80 characters
        sentences = content.split('.')
        if sentences:
            title = sentences[0].strip()
            if len(title) > 80:
                title = title[:80] + "..."
            return title
        return content[:80] + "..." if len(content) > 80 else content

    def _determine_priority(self, content: str) -> str:
        """Determine priority based on content keywords"""
        high_priority_keywords = ['performance', 'critical', 'urgent', 'slow', 'error', 'security', 'memory']
        medium_priority_keywords = ['optimize', 'improve', 'enhance', 'better', 'efficient']
        
        content_lower = content.lower()
        
        if any(keyword in content_lower for keyword in high_priority_keywords):
            return 'high'
        elif any(keyword in content_lower for keyword in medium_priority_keywords):
            return 'medium'
        else:
            return 'low'

    def _determine_complexity(self, content: str) -> str:
        """Determine complexity based on content keywords"""
        high_complexity_keywords = ['relationship', 'model', 'architecture', 'schema', 'complex', 'advanced']
        low_complexity_keywords = ['naming', 'format', 'simple', 'rename', 'label']
        
        content_lower = content.lower()
        
        if any(keyword in content_lower for keyword in high_complexity_keywords):
            return 'high'
        elif any(keyword in content_lower for keyword in low_complexity_keywords):
            return 'low'
        else:
            return 'medium'

    def _determine_applicable_files(self, content: str) -> List[str]:
        """Determine which files this recommendation applies to"""
        applicable_files = []
        
        content_lower = content.lower()
        
        if any(keyword in content_lower for keyword in ['measure', 'dax', 'calculation']):
            applicable_files.append('semantic_model')
        if any(keyword in content_lower for keyword in ['visual', 'report', 'chart', 'dashboard']):
            applicable_files.append('report')
        if any(keyword in content_lower for keyword in ['query', 'power query', 'm code', 'transformation']):
            applicable_files.append('semantic_model')
        if any(keyword in content_lower for keyword in ['relationship', 'table', 'column']):
            applicable_files.append('semantic_model')
        
        # Default to both if unclear
        if not applicable_files:
            applicable_files = ['semantic_model', 'report']
            
        return applicable_files

    def apply_improvement_recommendation(self, context: Dict, recommendation: Dict, report_files: Dict, semantic_model_files: Dict) -> Dict:
        """Apply a specific improvement recommendation to the files"""
        try:
            logger.info(f"Applying improvement recommendation: {recommendation['title']}")
            
            # Prepare the prompt for Gemini to modify the files
            prompt = f"""
            You are a Power BI expert. Apply the following improvement recommendation to the provided Power BI files.

            RECOMMENDATION TO APPLY:
            Category: {recommendation['category']}
            Title: {recommendation['title']}
            Description: {recommendation['description']}

            CURRENT DATA MODEL STRUCTURE:
            ```json
            {json.dumps(context['model'], indent=2, ensure_ascii=False)}
            ```

            CURRENT REPORT STRUCTURE:
            ```json
            {json.dumps(context['report'], indent=2, ensure_ascii=False)}
            ```

            ORIGINAL FILES PROVIDED:
            Report Files: {list(report_files.keys())}
            Semantic Model Files: {list(semantic_model_files.keys())}

            INSTRUCTIONS:
            1. Analyze the recommendation and determine what specific changes need to be made
            2. Apply the changes to the appropriate files
            3. Provide the modified file contents
            4. Explain what changes were made and why

            IMPORTANT:
            - Preserve all special characters, accents, and non-English text exactly as they appear
            - Only modify files that are relevant to this specific recommendation
            - Maintain the original JSON structure and formatting
            - Ensure all changes are valid and functional
            - If the recommendation cannot be applied due to technical limitations, explain why

            OUTPUT FORMAT:
            Please provide your response in the following JSON format:
            {{
                "success": true/false,
                "message": "Description of changes made or error message",
                "modified_files": {{
                    "filename1": "modified_content",
                    "filename2": "modified_content"
                }},
                "changes_summary": "Summary of all changes made"
            }}
            """

            logger.info("Generating file modifications with Gemini")
            logger.info(f"Prompt: {prompt}")
            response = self.chat.send_message(prompt)
            logger.info(f"Gemini response: {response.text}")
            try:
                # Try to parse the response as JSON
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                # If JSON parsing fails, return the text response
                return {
                    "success": False,
                    "message": "Failed to parse Gemini response as JSON",
                    "modified_files": {},
                    "changes_summary": response.text
                }

        except Exception as e:
            logger.error(f"Error applying improvement recommendation: {str(e)}")
            return {
                "success": False,
                "message": f"Error applying recommendation: {str(e)}",
                "modified_files": {},
                "changes_summary": ""
            } 