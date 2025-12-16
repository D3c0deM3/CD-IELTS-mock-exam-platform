"""
PDF Converter Package
IELTS Cambridge PDF to JSON conversion system
"""

from .ielts_pdf_converter import IELTSPDFConverter, convert_pdf_to_json
from .json_validator import validate_and_normalize_json, IELTSJSONValidator
from .database_inserter import insert_test_from_json, TestDatabaseInserter

__version__ = "1.0.0"
__author__ = "CD Mock Development Team"

__all__ = [
    "IELTSPDFConverter",
    "convert_pdf_to_json",
    "validate_and_normalize_json",
    "IELTSJSONValidator",
    "insert_test_from_json",
    "TestDatabaseInserter"
]
