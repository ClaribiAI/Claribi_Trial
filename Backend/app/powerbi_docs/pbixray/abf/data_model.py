from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class DataModel:
    file_log: list
    decompressed_data: bytes
    error_code: bool = False
    apply_compression: bool = False
    report_layout: Optional[Dict[str, Any]] = None
