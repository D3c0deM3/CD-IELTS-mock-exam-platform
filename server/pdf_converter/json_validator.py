"""
JSON Schema Validator for IELTS Test Data
Ensures converted PDF data conforms to expected structure for database insertion
"""

import json
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class QuestionType(Enum):
    """Supported IELTS question types"""
    MULTIPLE_CHOICE = "multiple_choice"
    MATCHING = "matching"
    TRUE_FALSE_NOT_GIVEN = "true_false_not_given"
    FILL_BLANK = "fill_blank"
    SHORT_ANSWER = "short_answer"
    SUMMARY = "summary"
    DIAGRAM_LABEL = "diagram_label"
    TABLE_COMPLETE = "table_complete"
    FLOW_CHART = "flow_chart"
    ESSAY = "essay"


class SectionType(Enum):
    """Supported section types"""
    READING_1 = "Reading Passage 1"
    READING_2 = "Reading Passage 2"
    READING_3 = "Reading Passage 3"
    LISTENING_1 = "Section 1"
    LISTENING_2 = "Section 2"
    LISTENING_3 = "Section 3"
    LISTENING_4 = "Section 4"
    WRITING_TASK_1 = "Writing Task 1"
    WRITING_TASK_2 = "Writing Task 2"


class IELTSJSONValidator:
    """Validates and normalizes IELTS test JSON structure"""
    
    # JSON Schema for IELTS tests
    SCHEMA = {
        "test": {
            "required_fields": ["name", "type", "sections", "questions"],
            "optional_fields": ["description", "source", "conversion_date", "metadata"],
            "types": {
                "name": str,
                "type": str,  # "reading", "listening", "writing"
                "sections": list,
                "questions": list,
                "description": str,
                "source": str,
                "conversion_date": str,
                "metadata": dict
            }
        },
        "section": {
            "required_fields": ["id", "type", "order"],
            "optional_fields": ["title", "content", "instructions", "passage"],
            "types": {
                "id": (int, str),
                "type": str,
                "order": int,
                "title": str,
                "content": str,
                "instructions": str,
                "passage": str
            }
        },
        "question": {
            "required_fields": ["id", "section_id", "type", "prompt"],
            "optional_fields": ["options", "answer_key", "explanation", "confidence"],
            "types": {
                "id": (int, str),
                "section_id": (int, str),
                "type": str,
                "prompt": str,
                "options": list,
                "answer_key": str,
                "explanation": str,
                "confidence": float
            }
        },
        "option": {
            "required_fields": ["id", "text"],
            "optional_fields": ["type"],
            "types": {
                "id": (str, int),
                "text": str,
                "type": str
            }
        }
    }
    
    # Validation rules
    RULES = {
        "min_questions_per_test": 20,
        "max_questions_per_test": 100,
        "min_options_multiple_choice": 2,
        "max_options_multiple_choice": 5,
        "valid_question_types": [e.value for e in QuestionType],
        "valid_test_types": ["reading", "listening", "writing"]
    }
    
    def __init__(self, json_data: Dict):
        """Initialize validator with JSON data"""
        self.json_data = json_data
        self.errors = []
        self.warnings = []
        self.validation_report = {}
    
    def validate(self) -> Tuple[bool, List[str], List[str]]:
        """
        Validate JSON against schema
        Returns: (is_valid, errors, warnings)
        """
        self.errors = []
        self.warnings = []
        
        # Validate test structure
        if "test" not in self.json_data:
            self.errors.append("Root 'test' object is missing")
            return False, self.errors, self.warnings
        
        test = self.json_data["test"]
        
        # Validate test fields
        self._validate_test(test)
        
        # Validate sections if present
        if "sections" in test:
            self._validate_sections(test["sections"])
        
        # Validate questions if present
        if "questions" in test:
            self._validate_questions(test["questions"], test.get("sections", []))
        
        # Check data integrity rules
        self._validate_integrity(test)
        
        is_valid = len(self.errors) == 0
        return is_valid, self.errors, self.warnings
    
    def _validate_test(self, test: Dict) -> None:
        """Validate test-level fields"""
        schema = self.SCHEMA["test"]
        
        # Check required fields
        for field in schema["required_fields"]:
            if field not in test:
                self.errors.append(f"Required field 'test.{field}' is missing")
        
        # Check field types
        for field, expected_type in schema["types"].items():
            if field in test:
                if not isinstance(test[field], expected_type):
                    self.errors.append(
                        f"Field 'test.{field}' has wrong type. "
                        f"Expected {expected_type}, got {type(test[field])}"
                    )
        
        # Validate test type
        if "type" in test:
            if test["type"] not in self.RULES["valid_test_types"]:
                self.errors.append(
                    f"Invalid test type '{test['type']}'. "
                    f"Must be one of {self.RULES['valid_test_types']}"
                )
    
    def _validate_sections(self, sections: List[Dict]) -> None:
        """Validate sections array"""
        if not isinstance(sections, list):
            self.errors.append("'sections' must be an array")
            return
        
        if len(sections) == 0:
            self.warnings.append("No sections found in test")
        
        for idx, section in enumerate(sections):
            if not isinstance(section, dict):
                self.errors.append(f"Section {idx} is not a dictionary")
                continue
            
            schema = self.SCHEMA["section"]
            
            # Check required fields
            for field in schema["required_fields"]:
                if field not in section:
                    self.errors.append(
                        f"Section {idx} missing required field '{field}'"
                    )
            
            # Check field types
            for field, expected_type in schema["types"].items():
                if field in section:
                    if not isinstance(section[field], expected_type):
                        self.errors.append(
                            f"Section {idx} field '{field}' has wrong type"
                        )
    
    def _validate_questions(self, questions: List[Dict], 
                           sections: List[Dict]) -> None:
        """Validate questions array"""
        if not isinstance(questions, list):
            self.errors.append("'questions' must be an array")
            return
        
        if len(questions) == 0:
            self.errors.append("No questions found in test")
            return
        
        if len(questions) < self.RULES["min_questions_per_test"]:
            self.warnings.append(
                f"Test has {len(questions)} questions "
                f"(minimum recommended: {self.RULES['min_questions_per_test']})"
            )
        
        section_ids = {str(s.get("id")) for s in sections} if sections else set()
        
        for idx, question in enumerate(questions):
            if not isinstance(question, dict):
                self.errors.append(f"Question {idx} is not a dictionary")
                continue
            
            schema = self.SCHEMA["question"]
            
            # Check required fields
            for field in schema["required_fields"]:
                if field not in question:
                    self.errors.append(
                        f"Question {idx} missing required field '{field}'"
                    )
            
            # Validate question type
            if "type" in question:
                if question["type"] not in self.RULES["valid_question_types"]:
                    self.errors.append(
                        f"Question {idx} has invalid type '{question['type']}'"
                    )
            
            # Validate section_id reference
            if "section_id" in question and section_ids:
                if str(question["section_id"]) not in section_ids:
                    self.warnings.append(
                        f"Question {idx} section_id '{question['section_id']}' "
                        f"not found in sections"
                    )
            
            # Validate options for multiple choice
            if question.get("type") == QuestionType.MULTIPLE_CHOICE.value:
                self._validate_options(question, idx)
    
    def _validate_options(self, question: Dict, question_idx: int) -> None:
        """Validate options for multiple choice questions"""
        options = question.get("options", [])
        
        if not options:
            self.warnings.append(
                f"Question {question_idx} is multiple_choice but has no options"
            )
            return
        
        if len(options) < self.RULES["min_options_multiple_choice"]:
            self.errors.append(
                f"Question {question_idx} has too few options "
                f"(minimum: {self.RULES['min_options_multiple_choice']})"
            )
        
        if len(options) > self.RULES["max_options_multiple_choice"]:
            self.errors.append(
                f"Question {question_idx} has too many options "
                f"(maximum: {self.RULES['max_options_multiple_choice']})"
            )
        
        for opt_idx, option in enumerate(options):
            schema = self.SCHEMA["option"]
            
            for field in schema["required_fields"]:
                if field not in option:
                    self.errors.append(
                        f"Question {question_idx} option {opt_idx} "
                        f"missing required field '{field}'"
                    )
    
    def _validate_integrity(self, test: Dict) -> None:
        """Validate data integrity across sections and questions"""
        sections = test.get("sections", [])
        questions = test.get("questions", [])
        
        # Check question count
        if len(questions) > self.RULES["max_questions_per_test"]:
            self.warnings.append(
                f"Test has {len(questions)} questions "
                f"(maximum recommended: {self.RULES['max_questions_per_test']})"
            )
        
        # Check for duplicate question IDs
        q_ids = [q.get("id") for q in questions]
        if len(q_ids) != len(set(q_ids)):
            self.errors.append("Duplicate question IDs found")
        
        # Check for duplicate section IDs
        s_ids = [s.get("id") for s in sections]
        if len(s_ids) != len(set(s_ids)):
            self.errors.append("Duplicate section IDs found")
    
    def normalize(self) -> Dict:
        """
        Normalize JSON data to consistent format
        Returns normalized JSON
        """
        normalized = self.json_data.copy()
        
        if "test" not in normalized:
            return normalized
        
        test = normalized["test"]
        
        # Normalize test type
        if "type" in test:
            test["type"] = test["type"].lower().strip()
        
        # Normalize sections
        if "sections" in test:
            for section in test["sections"]:
                # Ensure ID is present and unique
                if "id" not in section:
                    section["id"] = len(test["sections"]) + 1
                
                # Ensure order is present
                if "order" not in section:
                    section["order"] = test["sections"].index(section) + 1
        
        # Normalize questions
        if "questions" in test:
            for q_idx, question in enumerate(test["questions"]):
                # Ensure ID is present
                if "id" not in question:
                    question["id"] = q_idx + 1
                
                # Normalize type
                if "type" in question:
                    question["type"] = question["type"].lower().replace(" ", "_")
                
                # Normalize options
                if "options" in question and isinstance(question["options"], list):
                    for opt_idx, option in enumerate(question["options"]):
                        if "id" not in option:
                            option["id"] = chr(65 + opt_idx)  # A, B, C, D, E
        
        return normalized


def validate_and_normalize_json(json_data: Dict) -> Tuple[bool, Dict, List[str], List[str]]:
    """
    Validate and normalize IELTS JSON data
    
    Returns:
        (is_valid, normalized_data, errors, warnings)
    """
    validator = IELTSJSONValidator(json_data)
    is_valid, errors, warnings = validator.validate()
    normalized = validator.normalize()
    
    return is_valid, normalized, errors, warnings


if __name__ == "__main__":
    # Test example
    test_data = {
        "test": {
            "name": "IELTS Reading Practice Test 1",
            "type": "reading",
            "sections": [
                {
                    "id": 1,
                    "type": "Reading Passage 1",
                    "order": 1,
                    "content": "Sample passage..."
                }
            ],
            "questions": [
                {
                    "id": 1,
                    "section_id": 1,
                    "type": "multiple_choice",
                    "prompt": "What is the main idea?",
                    "options": [
                        {"id": "A", "text": "Option A"},
                        {"id": "B", "text": "Option B"},
                        {"id": "C", "text": "Option C"},
                        {"id": "D", "text": "Option D"}
                    ]
                }
            ]
        }
    }
    
    is_valid, normalized, errors, warnings = validate_and_normalize_json(test_data)
    print(f"Valid: {is_valid}")
    print(f"Errors: {errors}")
    print(f"Warnings: {warnings}")
