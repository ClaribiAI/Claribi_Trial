import logging
import os
import subprocess
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create a Python script with the analysis code
analysis_code = '''
import logging
import os
from app.powerbi_docs.powerbi_service_pbix import PowerBIPbixService

logging.basicConfig(level=logging.INFO)

# Note: This script now requires a .pbix file instead of folders
# You would need to provide the path to a .pbix file
pbix_file_path = "path/to/your/file.pbix"  # Update this path

if not os.path.exists(pbix_file_path):
    print(f"Error: .pbix file not found at {pbix_file_path}")
    print("Please update the pbix_file_path variable with the correct path to your .pbix file")
    exit(1)

service = PowerBIPbixService("your-api-key")
result = service.analyze_pbix_file(pbix_file_path)

print("\\nDocumentation:")
if result.get("documentation"):
    for section, content in result["documentation"].items():
        if section != "technical_details":
            print(f"\\n=== {section.upper().replace('_', ' ')} ===")
            print(content[:500] + "..." if len(content) > 500 else content)
else:
    print("No documentation generated")

print("\\nTechnical Details:")
print(f"Tables: {len(result.get('pbix_data', {}).get('tables', []))}")
print(f"Measures: {len(result.get('pbix_data', {}).get('dax_measures', []))}")
print(f"Relationships: {len(result.get('pbix_data', {}).get('relationships', []))}")
'''

# Write the code to a temporary file
temp_script = os.path.join(os.path.dirname(__file__), 'temp_analysis.py')
with open(temp_script, 'w') as f:
    f.write(analysis_code)

try:
    # Run the analysis script
    result = subprocess.run([sys.executable, temp_script], 
                          capture_output=True, 
                          text=True,
                          cwd=os.path.dirname(__file__))
    
    # Print the output
    print(result.stdout)
    
    if result.stderr:
        print("Errors:", result.stderr)
finally:
    # Clean up the temporary file
    if os.path.exists(temp_script):
        os.remove(temp_script) 