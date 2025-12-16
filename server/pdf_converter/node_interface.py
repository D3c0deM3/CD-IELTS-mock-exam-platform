"""
Node.js Interface Module for PDF Conversion
This module is called by Node.js using python-shell
Handles conversion and returns JSON suitable for database insertion
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, Any, Tuple

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

# Try v4 first (new improved version), fall back to v3
try:
    from ielts_pdf_converter_v4 import IELTSPDFConverter
except ImportError:
    from ielts_pdf_converter import IELTSPDFConverter

from json_validator import IELTSJSONValidator


def convert_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Convert PDF to JSON and validate
    
    Returns JSON with structure:
    {
        "success": bool,
        "testData": {...converted test JSON...},
        "confidence": float (0-1.0),
        "message": str,
        "validation": {...validation results...},
        "errors": [...],
        "warnings": [...]
    }
    """
    result = {
        "success": False,
        "testData": None,
        "confidence": 0.0,
        "message": "Conversion pending",
        "validation": {},
        "errors": [],
        "warnings": []
    }
    
    try:
        # Verify file exists
        if not os.path.exists(pdf_path):
            result["errors"].append(f"PDF file not found: {pdf_path}")
            result["message"] = "File not found"
            return result

        # Stage 1: Convert PDF to JSON
        converter = IELTSPDFConverter(pdf_path)
        test_data, confidence = converter.convert()
        
        # Stage 2: Validate with the converted data
        validator = IELTSJSONValidator(test_data)
        is_valid, errors, warnings = validator.validate()
        
        if errors:
            result["errors"].extend(errors)
        if warnings:
            result["warnings"].extend(warnings)
        
        # Normalize data
        normalized_data = validator.normalize()
        
        result["testData"] = normalized_data
        result["confidence"] = confidence
        result["success"] = True
        result["message"] = f"PDF converted successfully (confidence: {confidence:.1%})"
        result["validation"] = {
            "is_valid": is_valid,
            "errors": errors,
            "warnings": warnings
        }
        result["errors"] = errors
    
    except FileNotFoundError as e:
        result["errors"].append(f"File not found: {str(e)}")
        result["message"] = "File not found"
    except Exception as e:
        result["errors"].append(f"Conversion error: {str(e)}")
        result["message"] = f"Error: {str(e)}"
    
    return result

if __name__ == "__main__":
    # Called from Node.js with pdf_path as argument
    if len(sys.argv) < 2:
        output = {
            "success": False,
            "message": "No PDF path provided",
            "errors": ["No PDF path provided"]
        }
    else:
        pdf_path = sys.argv[1]
        output = convert_pdf(pdf_path)
    
    # Output as JSON for Node.js to parse
    print(json.dumps(output, indent=2, ensure_ascii=False))
