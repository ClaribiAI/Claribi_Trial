import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class PowerBIDocumentationGenerator:
    """
    Handles AI-powered documentation generation for Power BI reports.
    This class constructs the prompts and uses a provided AI client to get results.
    """

    def __init__(self, client: Any):
        """
        Initializes the generator with an AI client.
        
        Args:
            client: An instance of an AI client that has a `generate_content` method.
        """
        self.client = client
        self.system_prompt = """
        You are a world-class Power BI expert and technical writer. Your purpose is to analyze Power BI report metadata and generate clear, concise, and professional documentation for a business audience.

        IMPORTANT CORE RULES:
        1.  Preserve all special characters, accents, and non-English text exactly as it appears in the provided JSON data (e.g., ñ, á, é, í, ó, ú).
        2.  Maintain the original language and technical terminology (table names, column names, measures) used in the data.
        3.  Use formal business language. Avoid jargon where possible, but use correct technical terms when necessary, explaining them simply.
        4.  Your analysis must be based *only* on the JSON data provided. Do not invent details.
        5.  Unless specifically asked for recommendations, your role is to document what currently exists, not to critique it.
        """

    def _generate_content(self, user_prompt: str, context_str: str, custom_instructions: str = '') -> str:
        """
        A centralized, private method to handle all interactions with the AI client.

        Args:
            user_prompt: The user-facing prompt with the specific task and data.
            context_str: A string identifier for logging (e.g., 'executive_summary').
            custom_instructions: Optional user-defined instructions to append.

        Returns:
            The generated text from the AI or an error message string.
        """
        try:
            final_user_prompt = user_prompt
            if custom_instructions and custom_instructions.strip():
                final_user_prompt += f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your response while maintaining the overall structure and professional tone.
                """
            
            logger.info(f"Generating '{context_str}' with Gemini.")
            return self.client.generate_content(
                prompt=final_user_prompt,
                system_instruction=self.system_prompt,
                context=context_str
            )

        except Exception as e:
            logger.error(f"Error in generator for '{context_str}': {str(e)}", exc_info=True)
            return f"An error occurred while generating the {context_str.replace('_', ' ')}."

    def generate_executive_summary(self, context: Dict, custom_instructions: str = '') -> str:
        """Generates the executive summary of the report."""
        # System instruction specific to executive summary generation
        executive_summary_system_instruction = self.system_prompt + """
        
        TASK: Generate Executive Summary
        You are tasked with creating a concise executive summary (2-3 paragraphs) that answers these key questions:
        - What is the primary purpose of this report?
        - What business domain does it serve?
        - What are the key metrics and KPIs being tracked?
        - Who are the typical users of this report?

        Focus on business value and purpose, not technical implementation details.
        """
        
        user_prompt = f"""
        Data Model Structure:
        ```json
        {json.dumps(context['model'], indent=2, ensure_ascii=False)}
        ```

        Report Visuals:
        ```json
        {json.dumps(context['report'], indent=2, ensure_ascii=False)}
        ```
        """
        
        # Use the specialized system instruction for this task
        try:
            final_user_prompt = user_prompt
            if custom_instructions and custom_instructions.strip():
                final_user_prompt += f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your response while maintaining the overall structure and professional tone.
                """
            
            logger.info("Generating 'executive_summary' with Gemini.")
            return self.client.generate_content(
                prompt=final_user_prompt,
                system_instruction=executive_summary_system_instruction,
                context='executive_summary'
            )

        except Exception as e:
            logger.error(f"Error in generator for 'executive_summary': {str(e)}", exc_info=True)
            return "An error occurred while generating the executive summary."

    def generate_data_model_analysis(self, context: Dict, custom_instructions: str = '') -> str:
        """Generates the detailed data model analysis."""
        # System instruction specific to data model analysis
        data_model_system_instruction = self.system_prompt + """
        
        TASK: Generate Data Model Analysis
        You are tasked with providing a comprehensive data model overview covering:
        1.  **Table Analysis**: For each table, describe its purpose, key columns, and granularity (fact vs. dimension).
        2.  **Measures Analysis**: For each measure, explain its business purpose, the calculation it performs, and the insights it provides.
        3.  **Relationships**: Analyze table-to-table connections, their cardinality, and cross-filter directions.
        4.  **Data Transformation Logic**: Based on the Power Query expressions, describe data sources and key transformation steps.

        Focus on how data flows from the source to the final model. Be specific about DAX formulas and business logic.
        """
        
        user_prompt = f"""
        Data Model Structure:
        ```json
        {json.dumps(context['model'], indent=2, ensure_ascii=False)}
        ```
        """
        
        try:
            final_user_prompt = user_prompt
            if custom_instructions and custom_instructions.strip():
                final_user_prompt += f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your response while maintaining the overall structure and professional tone.
                """
            
            logger.info("Generating 'data_model_analysis' with Gemini.")
            return self.client.generate_content(
                prompt=final_user_prompt,
                system_instruction=data_model_system_instruction,
                context='data_model_analysis'
            )

        except Exception as e:
            logger.error(f"Error in generator for 'data_model_analysis': {str(e)}", exc_info=True)
            return "An error occurred while generating the data model analysis."

    def generate_visualization_analysis(self, context: Dict, custom_instructions: str = '') -> str:
        """Generates the detailed visualization analysis."""
        # System instruction specific to visualization analysis
        visualization_system_instruction = self.system_prompt + """
        
        TASK: Generate Visualization Analysis
        You are tasked with providing a detailed visualization overview covering:
        1.  **Page Structure**: Infer and group visuals by likely report pages based on their data and purpose.
        2.  **Visual Analysis**: For each major visual, explain the data story it tells, the insights users can gain, and how it supports decision-making.
        3.  **Overall Design**: Analyze how the visuals work together to form a cohesive narrative for the user.

        Focus on the business value each visual provides and how they support analytical workflows.
        """
        
        user_prompt = f"""
        Report Visuals:
        ```json
        {json.dumps(context['report'], indent=2, ensure_ascii=False)}
        ```

        Data Model (for context):
        ```json
        {json.dumps(context['model'], indent=2, ensure_ascii=False)}
        ```
        """
        
        try:
            final_user_prompt = user_prompt
            if custom_instructions and custom_instructions.strip():
                final_user_prompt += f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your response while maintaining the overall structure and professional tone.
                """
            
            logger.info("Generating 'visualization_analysis' with Gemini.")
            return self.client.generate_content(
                prompt=final_user_prompt,
                system_instruction=visualization_system_instruction,
                context='visualization_analysis'
            )

        except Exception as e:
            logger.error(f"Error in generator for 'visualization_analysis': {str(e)}", exc_info=True)
            return "An error occurred while generating the visualization analysis."

    def generate_security_analysis(self, context: Dict, custom_instructions: str = '') -> str:
        """Generate security and access control analysis"""
        # System instruction specific to security analysis
        security_system_instruction = self.system_prompt + """
        
        TASK: Generate Security Analysis
        You are a Power BI security expert. Analyze this report for security considerations and provide a security overview covering:

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

        If no obvious security measures are detected, explain what should be considered.
        """
        
        user_prompt = f"""
        Data Model Structure:
        ```json
        {json.dumps(context['model'], indent=2, ensure_ascii=False)}
        ```

        Report Structure:
        ```json
        {json.dumps(context['report'], indent=2, ensure_ascii=False)}
        ```
        """
        
        try:
            final_user_prompt = user_prompt
            if custom_instructions and custom_instructions.strip():
                final_user_prompt += f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your response while maintaining the overall structure and professional tone.
                """
            
            logger.info("Generating 'security_analysis' with Gemini.")
            return self.client.generate_content(
                prompt=final_user_prompt,
                system_instruction=security_system_instruction,
                context='security_analysis'
            )

        except Exception as e:
            logger.error(f"Error in generator for 'security_analysis': {str(e)}", exc_info=True)
            return "An error occurred while generating the security analysis."

    def generate_improvement_recommendations(self, context: Dict, custom_instructions: str = '') -> str:
        """Generate data model improvement recommendations"""
        # System instruction specific to improvement recommendations
        improvement_system_instruction = self.system_prompt + """
        
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
            "description": "Detailed description of the improvement and why it's needed. Include implementation steps here."
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
        
        user_prompt = f"""
        Data Model Structure:
        ```json
        {json.dumps(context['model'], indent=2, ensure_ascii=False)}
        ```

        Report Structure:
        ```json
        {json.dumps(context['report'], indent=2, ensure_ascii=False)}
        ```
        """
        
        try:
            final_user_prompt = user_prompt
            if custom_instructions and custom_instructions.strip():
                final_user_prompt += f"""
                
                ADDITIONAL CUSTOM INSTRUCTIONS:
                {custom_instructions}
                
                Please incorporate these specific requirements into your improvement recommendations while maintaining the JSON format structure.
                """
            
            logger.info("Generating improvement recommendations with simple JSON format")
            response = self.client.generate_content(
                prompt=final_user_prompt,
                system_instruction=improvement_system_instruction,
                context='improvement_recommendations'
            )
           #
           #  logger.info(f"Gemini response: {response}")
            return response

        except Exception as e:
            logger.error(f"Error generating improvement recommendations: {str(e)}")
            return f"Error generating improvement recommendations: {str(e)}"

    def parse_improvement_recommendations(self, recommendations_text: str) -> List[Dict]:
        """Parse improvement recommendations from JSON text"""
        try:
            logger.info(f"Parsing recommendations JSON of length: {len(recommendations_text)}")
            
            # Clean up the response - remove any markdown formatting if present
            cleaned_text = recommendations_text.strip()
            
            # Remove markdown code blocks if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text.replace('```json', '').replace('```', '').strip()
            elif cleaned_text.startswith('```'):
                cleaned_text = cleaned_text.replace('```', '').strip()
            
            # Parse the JSON directly
            parsed_json = json.loads(cleaned_text)
            
            # Normalize the recommendations
            return self._normalize_recommendations(parsed_json)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            logger.error(f"Failed to parse text: {recommendations_text[:500]}...")
            # Return empty list if parsing fails
            return []
        except Exception as e:
            logger.error(f"Error parsing improvement recommendations: {str(e)}", exc_info=True)
            return []

    def _normalize_recommendations(self, parsed_json: List[Dict]) -> List[Dict]:
        """Normalize parsed JSON array into the internal recommendation format."""
        recommendations: List[Dict] = []
        for i, item in enumerate(parsed_json):
            if not isinstance(item, dict):
                continue
            
            recommendation = {
                'id': f"rec_{i + 1}",
                'category': item.get('category', 'General Improvement'),
                'title': item.get('title', 'Untitled Recommendation'),
                'priority': item.get('priority', 'medium').lower(),
                'complexity': item.get('complexity', 'medium').lower(),
                'description': item.get('description', ''),
                'applicable_files': item.get('applicable_files', ['semantic_model', 'report'])
            }

            if recommendation['title'] and recommendation['description']:
                recommendations.append(recommendation)
        logger.info(f"Parsed {len(recommendations)} recommendations")
        return recommendations




