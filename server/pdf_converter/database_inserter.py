"""
Database Insertion Module for IELTS Tests
Converts validated JSON to database records following existing schema
"""

from typing import Dict, List, Tuple, Optional, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class TestDatabaseInserter:
    """Handles insertion of IELTS test JSON data into database"""
    
    def __init__(self, db_connection):
        """
        Initialize inserter with database connection
        
        Args:
            db_connection: mysql2/promise connection pool
        """
        self.db = db_connection
        self.insertion_log = []
    
    async def insert_test(self, test_json: Dict) -> Tuple[int, Dict]:
        """
        Insert complete test from JSON into database
        
        Returns:
            (test_id, insertion_summary)
        """
        summary = {
            "test_id": None,
            "sections_inserted": 0,
            "questions_inserted": 0,
            "answers_inserted": 0,
            "errors": [],
            "warnings": []
        }
        
        try:
            test_data = test_json.get("test", {})
            
            # Insert test record
            test_id = await self._insert_test_record(test_data)
            summary["test_id"] = test_id
            
            # Insert sections
            sections_data = test_data.get("sections", [])
            section_map = {}  # Map JSON section IDs to DB section IDs
            
            for section in sections_data:
                db_section_id = await self._insert_section(test_id, section)
                section_map[str(section.get("id"))] = db_section_id
                summary["sections_inserted"] += 1
            
            # Insert questions and answers
            questions_data = test_data.get("questions", [])
            
            for question in questions_data:
                section_id = section_map.get(str(question.get("section_id")))
                
                if not section_id:
                    summary["warnings"].append(
                        f"Question {question.get('id')} has no valid section"
                    )
                    continue
                
                # Insert question
                db_question_id = await self._insert_question(section_id, question)
                summary["questions_inserted"] += 1
                
                # Insert answer options for multiple choice
                if question.get("type") == "multiple_choice":
                    options = question.get("options", [])
                    for option in options:
                        await self._insert_answer(db_question_id, option)
                        summary["answers_inserted"] += 1
        
        except Exception as e:
            summary["errors"].append(str(e))
            logger.error(f"Error inserting test: {e}")
        
        return summary["test_id"], summary
    
    async def _insert_test_record(self, test_data: Dict) -> int:
        """Insert test record and return ID"""
        name = test_data.get("name", "Unnamed Test")
        description = test_data.get("description", "")
        
        try:
            query = """
                INSERT INTO tests (name, description, created_at)
                VALUES (?, ?, ?)
            """
            
            result = await self.db.execute(
                query,
                [name, description, datetime.now()]
            )
            
            test_id = result[0].insertId
            logger.info(f"Inserted test record: ID {test_id}")
            self.insertion_log.append(("test", test_id, "success"))
            
            return test_id
        
        except Exception as e:
            logger.error(f"Failed to insert test: {e}")
            raise
    
    async def _insert_section(self, test_id: int, section: Dict) -> int:
        """Insert section record and return ID"""
        section_type = section.get("type", "Unknown")
        content = section.get("content", "") or section.get("passage", "")
        order = section.get("order", 1)
        
        try:
            query = """
                INSERT INTO sections (test_id, type, content, ordering)
                VALUES (?, ?, ?, ?)
            """
            
            result = await self.db.execute(
                query,
                [test_id, section_type, content[:5000], order]  # Limit content
            )
            
            section_id = result[0].insertId
            logger.info(f"Inserted section: ID {section_id} for test {test_id}")
            self.insertion_log.append(("section", section_id, "success"))
            
            return section_id
        
        except Exception as e:
            logger.error(f"Failed to insert section: {e}")
            raise
    
    async def _insert_question(self, section_id: int, question: Dict) -> int:
        """Insert question record and return ID"""
        question_text = question.get("prompt", "")
        question_type = question.get("type", "unknown")
        
        try:
            query = """
                INSERT INTO questions (section_id, question_text, question_type)
                VALUES (?, ?, ?)
            """
            
            result = await self.db.execute(
                query,
                [section_id, question_text, question_type]
            )
            
            question_id = result[0].insertId
            logger.info(f"Inserted question: ID {question_id} for section {section_id}")
            self.insertion_log.append(("question", question_id, "success"))
            
            return question_id
        
        except Exception as e:
            logger.error(f"Failed to insert question: {e}")
            raise
    
    async def _insert_answer(self, question_id: int, option: Dict) -> int:
        """Insert answer option and return ID"""
        answer_text = option.get("text", "")
        option_id = option.get("id", "")
        is_correct = option.get("is_correct", False)
        
        try:
            query = """
                INSERT INTO answers (question_id, answer_text, is_correct, option_label)
                VALUES (?, ?, ?, ?)
            """
            
            result = await self.db.execute(
                query,
                [question_id, answer_text, is_correct, option_id]
            )
            
            answer_id = result[0].insertId
            logger.info(f"Inserted answer: ID {answer_id} for question {question_id}")
            self.insertion_log.append(("answer", answer_id, "success"))
            
            return answer_id
        
        except Exception as e:
            logger.error(f"Failed to insert answer: {e}")
            raise
    
    def get_insertion_log(self) -> List[Tuple]:
        """Get log of all insertions"""
        return self.insertion_log


async def insert_test_from_json(db_connection, test_json: Dict) -> Tuple[int, Dict]:
    """
    Main function to insert test from JSON into database
    
    Args:
        db_connection: Database connection pool
        test_json: Validated test JSON
    
    Returns:
        (test_id, summary)
    """
    inserter = TestDatabaseInserter(db_connection)
    return await inserter.insert_test(test_json)
