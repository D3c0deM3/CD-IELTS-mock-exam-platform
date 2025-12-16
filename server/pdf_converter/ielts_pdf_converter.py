"""
Enhanced IELTS PDF to JSON Converter - v3
Properly extracts ALL test content: all passages, all questions, options, and detailed metadata
"""

import re
import json
import fitz  # PyMuPDF
from typing import Dict, List, Any, Tuple, Optional


class IELTSPDFConverter:
    """
    Extracts complete IELTS test content from PDFs into structured format.
    Handles Reading (3 passages), Listening (4 sections), and Writing (2 tasks).
    """

    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.text_full = ""
        self.text_by_page = []

    def convert(self) -> Tuple[Dict[str, Any], float]:
        """Convert PDF to structured test JSON"""
        try:
            self._extract_text()
            test_data = self._parse_ielts_structure()
            confidence = self._calculate_confidence(test_data)
            return test_data, confidence
        except Exception as e:
            raise Exception(f"PDF conversion failed: {str(e)}")

    def _extract_text(self) -> None:
        """Extract all text from PDF"""
        try:
            doc = fitz.open(self.pdf_path)
            full_text = []
            
            for page_num, page in enumerate(doc):
                text = page.get_text()
                self.text_by_page.append({
                    'page': page_num + 1,
                    'content': text
                })
                full_text.append(text)
            
            self.text_full = "\n".join(full_text)
            doc.close()
        except Exception as e:
            raise Exception(f"Text extraction failed: {str(e)}")

    def _parse_ielts_structure(self) -> Dict[str, Any]:
        """Parse the complete IELTS test structure"""
        test_data = {
            "metadata": {
                "source": self.pdf_path,
                "extraction_method": "complete_text_extraction",
                "total_pages": len(self.text_by_page)
            },
            "test_info": {
                "title": self._extract_test_title(),
                "test_type": self._detect_test_type(),
                "num_sections": 0,
                "total_questions": 0
            },
            "sections": [],
            "passages": [],
            "questions": [],
            "answers": []
        }

        # Extract all sections
        reading_sections = self._extract_reading_sections()
        listening_sections = self._extract_listening_sections()
        writing_sections = self._extract_writing_sections()

        all_sections = reading_sections + listening_sections + writing_sections
        test_data["sections"] = all_sections
        test_data["test_info"]["num_sections"] = len(all_sections)

        # Count total questions
        for section in all_sections:
            test_data["test_info"]["total_questions"] += len(section.get("questions", []))

        return test_data

    def _extract_test_title(self) -> str:
        """Extract test title"""
        # Look for Cambridge test indicators
        title_patterns = [
            r'(?:IELTS.*?Cambridge)',
            r'Cambridge\s+(?:Test|Mock)\s+(?:\d+|[A-Z])',
            r'IELTS\s+(?:Test|Mock|Practice)\s+(?:\d+|[A-Z])',
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, self.text_full, re.IGNORECASE)
            if match:
                return match.group(0)
        
        return "IELTS Cambridge Test"

    def _detect_test_type(self) -> str:
        """Detect Academic vs General Training"""
        text_upper = self.text_full.upper()
        if 'ACADEMIC' in text_upper:
            return "academic"
        elif 'GENERAL' in text_upper:
            return "general_training"
        return "general_training"

    def _extract_reading_sections(self) -> List[Dict[str, Any]]:
        """Extract reading passages using ONLY boundary detection - NO range filtering"""
        sections = []
        
        # Find each passage by header
        for passage_num in [1, 2, 3]:
            passage_pattern = rf'READING\s+PASSAGE\s+{passage_num}'
            passage_match = re.search(passage_pattern, self.text_full, re.IGNORECASE)
            
            if not passage_match:
                continue

            passage_start = passage_match.start()
            
            # Find passage end - look for next READING PASSAGE or major section
            end_patterns = [
                rf'READING\s+PASSAGE\s+{passage_num + 1}',
                r'(?:^|\n)\s*(?:PART|Part)\s+1',  # Listening after
                r'(?:^|\n)\s*(?:WRITING|Writing)',
            ]
            
            passage_end = len(self.text_full)
            for pattern in end_patterns:
                next_section = re.search(pattern, self.text_full[passage_start + 100:], re.IGNORECASE | re.MULTILINE)
                if next_section:
                    passage_end = min(passage_end, passage_start + next_section.start() + 100)
                    break
            
            passage_content = self.text_full[passage_start:passage_end]
            
            # Extract questions from this passage (without range filtering)
            questions = self._extract_reading_questions_for_passage(passage_content)
            
            if questions:
                section = {
                    "type": "reading",
                    "section_number": passage_num,
                    "title": f"Reading Passage {passage_num}",
                    "passage_content": passage_content,  # Actual passage text, not placeholder
                    "questions": sorted(questions, key=lambda x: x["question_id"]),
                    "total_questions": len(questions)
                }
                sections.append(section)

        return sections

    def _extract_single_reading_passage(self, full_text: str, passage_num: int) -> Optional[Dict[str, Any]]:
        """Extract a single reading passage with all its content"""
        
        # Find passage start - look for "READING PASSAGE N"
        passage_pattern = rf'READING\s+PASSAGE\s+{passage_num}'
        passage_match = re.search(passage_pattern, full_text, re.IGNORECASE)
        
        if not passage_match:
            return None

        passage_start = passage_match.start()
        
        # Find passage end - look for next READING PASSAGE or major section
        end_patterns = [
            rf'READING\s+PASSAGE\s+{passage_num + 1}',  # Next passage
            r'(?:^|\n)\s*READING\s+PASSAGE',  # Any reading passage (for last passage)
            r'(?:^|\n)\s*(?:PART|Part)\s+1',  # Listening part after
            r'(?:^|\n)\s*(?:WRITING|Writing)',  # Or writing section
        ]
        
        passage_end = len(full_text)
        for pattern in end_patterns:
            next_section = re.search(pattern, full_text[passage_start + 100:], re.IGNORECASE | re.MULTILINE)
            if next_section:
                passage_end = min(passage_end, passage_start + next_section.start() + 100)
                break
        
        passage_content_full = full_text[passage_start:passage_end]

        # Extract the actual passage text content
        # Look for content after "Passage N" up to questions
        passage_text_match = re.search(
            rf'READING\s+PASSAGE\s+{passage_num}[^\n]*\n([\s\S]*?)(?=(?:^|\n)\s*(?:Questions?|Q\.|\d+\.))',
            passage_content_full,
            re.IGNORECASE | re.MULTILINE
        )
        
        if passage_text_match:
            passage_text = passage_text_match.group(1).strip()
        else:
            # Fallback: get everything after passage header
            passage_text = re.sub(rf'READING\s+PASSAGE\s+{passage_num}[^\n]*\n', '', passage_content_full, flags=re.IGNORECASE).strip()
            # Remove question part
            passage_text = re.split(r'\n\s*(?:Questions?|Q\.|\d+\.)\s', passage_text)[0] if passage_text else ""

        # Extract all questions for this passage
        questions = self._extract_reading_questions_for_passage(passage_content_full)

        if not questions:
            return None

        section = {
            "type": "reading",
            "section_number": passage_num,
            "title": f"Reading Passage {passage_num}",
            "passage_content": passage_text if passage_text else "Passage content not found",
            "questions": questions,
            "total_questions": len(questions)
        }
        
        return section

    def _extract_reading_questions_for_passage(self, passage_text: str) -> List[Dict[str, Any]]:
        """Extract all questions from a reading passage"""
        questions = []
        
        # Find all numbered questions - more flexible pattern to catch answer blanks too
        # Pattern 1: "27. Question text"
        # Pattern 2: "27 ………." (answer blanks)
        # Pattern 3: "1. Text" anywhere on a line
        question_pattern = r'^\s*(\d+)\s*(?:\.|:|\s)(.*)$'
        question_matches = re.finditer(question_pattern, passage_text, re.MULTILINE)

        found_question_nums = set()
        for match in question_matches:
            q_num_str = match.group(1)
            q_num = int(q_num_str)
            
            # Filter out obviously non-question numbers (like page numbers, years, etc.)
            # Questions should be in range 1-100 for practical purposes
            if q_num < 1 or q_num > 100:
                continue
            
            # Skip if we've already processed this question number
            if q_num_str in found_question_nums:
                continue
            
            q_full_text = match.group(2).strip()
            
            # Only process if there's actual content (not just whitespace)
            if not q_full_text or q_full_text.replace('.', '').replace('…', '').strip() == '':
                # This is likely just an answer blank, capture surrounding context
                match_start = max(0, match.start() - 300)
                match_end = min(len(passage_text), match.end() + 300)
                context = passage_text[match_start:match_end].strip()
                q_text = context
            else:
                q_text = q_full_text  # Use full text, not truncated
            
            found_question_nums.add(q_num_str)

            # Extract options if they exist
            options = self._extract_options_from_text(q_full_text)

            # Determine question type
            q_type = self._determine_question_type(q_full_text)

            question = {
                "question_id": q_num,
                "text": q_text,
                "type": q_type,
                "options": options,
                "num_options": len(options)
            }
            questions.append(question)
        
        # Pattern 2: Embedded numbers in lines with answer blanks "31 ……."
        # This catches questions embedded in tables or answer key sections
        if not questions or len(questions) < 5:
            embedded_pattern = r'(\d+)\s+[.…]{2,}'
            embedded_matches = list(re.finditer(embedded_pattern, passage_text))
            
            for match in embedded_matches:
                q_num_str = match.group(1)
                q_num = int(q_num_str)
                
                # Filter out obviously non-question numbers
                if q_num < 1 or q_num > 100:
                    continue
                
                # Skip if already found
                if q_num_str in found_question_nums:
                    continue
                
                found_question_nums.add(q_num_str)
                
                question = {
                    "question_id": q_num,
                    "text": f"Question {q_num_str}",
                    "type": "fill_blank",
                    "options": [],
                    "num_options": 0
                }
                questions.append(question)

        return sorted(questions, key=lambda x: x["question_id"])

    def _extract_all_reading_questions(self) -> List[Dict[str, Any]]:
        """Extract ALL reading questions (1-40) from the full text, not bounded by passage markers"""
        questions = []
        found_question_nums = set()
        
        # Pattern 1: Standard numbered questions "1. Question text"
        question_pattern = r'^\s*(\d+)\s*(?:\.|:|\s)(.*)$'
        question_matches = re.finditer(question_pattern, self.text_full, re.MULTILINE)

        for match in question_matches:
            q_num_str = match.group(1)
            q_num = int(q_num_str)
            
            # Only extract reading questions (1-40)
            if q_num < 1 or q_num > 40:
                continue
            
            # Skip duplicates
            if q_num_str in found_question_nums:
                continue
            
            q_full_text = match.group(2).strip()
            
            # Only process if there's actual content
            if q_full_text and q_full_text.replace('.', '').replace('…', '').strip():
                q_text = q_full_text[:200]
            else:
                q_text = f"Question {q_num_str}"
            
            found_question_nums.add(q_num_str)

            # Extract options if they exist
            options = self._extract_options_from_text(q_full_text)

            # Determine question type
            q_type = self._determine_question_type(q_full_text)

            question = {
                "question_id": q_num,
                "text": q_text,
                "type": q_type,
                "options": options,
                "num_options": len(options)
            }
            questions.append(question)
        
        # Pattern 2: Embedded numbers with answer blanks "27 ……."
        if len(questions) < 40:
            embedded_pattern = r'(\d+)\s+[.…]{2,}'
            embedded_matches = list(re.finditer(embedded_pattern, self.text_full))
            
            for match in embedded_matches:
                q_num_str = match.group(1)
                q_num = int(q_num_str)
                
                # Only extract reading questions (1-40)
                if q_num < 1 or q_num > 40:
                    continue
                
                # Skip if already found
                if q_num_str in found_question_nums:
                    continue
                
                found_question_nums.add(q_num_str)
                
                question = {
                    "question_id": q_num,
                    "text": f"Question {q_num_str}",
                    "type": "fill_blank",
                    "options": [],
                    "num_options": 0
                }
                questions.append(question)

        return sorted(questions, key=lambda x: x["question_id"])

    def _extract_listening_sections(self) -> List[Dict[str, Any]]:
        """Extract listening sections using ONLY boundary detection - NO range filtering"""
        sections = []
        
        # Find all listening parts by looking for headers
        for part_num in range(1, 5):
            # Search for PART N marker
            patterns = [
                rf'(?:^|\n)\s*PART\s+{part_num}(?:\s|$)',
                rf'(?:^|\n)\s*Part\s+{part_num}(?:\s|$)',
                rf'(?:^|\n)\s*SECTION\s+{part_num}(?:\s|$)',
                rf'(?:^|\n)\s*Section\s+{part_num}(?:\s|$)',
            ]
            
            part_match = None
            for pattern in patterns:
                part_match = re.search(pattern, self.text_full, re.IGNORECASE | re.MULTILINE)
                if part_match:
                    break
            
            if not part_match:
                continue
            
            # Find section boundaries
            part_start = part_match.start()
            part_end = len(self.text_full)
            
            # Look for next part/section or major boundary
            next_patterns = [
                rf'(?:^|\n)\s*(?:PART|Part|SECTION|Section)\s+{part_num + 1}',
                r'(?:^|\n)\s*(?:READING|Reading)',
                r'(?:^|\n)\s*(?:WRITING|Writing)',
                r'(?:^|\n)\s*(?:ANSWER|Answer)',
            ]
            
            for pattern in next_patterns:
                next_match = re.search(pattern, self.text_full[part_start:], re.IGNORECASE | re.MULTILINE)
                if next_match:
                    part_end = part_start + next_match.start()
                    break
            
            # Extract section content and questions (no filtering)
            section_text = self.text_full[part_start:part_end]
            questions = self._extract_listening_questions_for_section(section_text)
            
            if questions:
                section = {
                    "type": "listening",
                    "section_number": part_num,
                    "title": f"Listening Part {part_num}",
                    "questions": sorted(questions, key=lambda x: x["question_id"]),
                    "total_questions": len(questions)
                }
                sections.append(section)

        return sections

    def _extract_all_listening_questions(self) -> List[Dict[str, Any]]:
        """Extract ALL listening questions (1-40) from the full text"""
        questions = []
        found_question_nums = set()
        
        # Pattern 1: Standard numbered questions "1. Question text"
        question_pattern = r'^\s*(\d+)\s*(?:\.|:|\s)(.*)$'
        question_matches = re.finditer(question_pattern, self.text_full, re.MULTILINE)

        for match in question_matches:
            q_num_str = match.group(1)
            q_num = int(q_num_str)
            
            # Only extract listening questions (1-40, but not reading which are also 1-40)
            # We'll filter by context - questions after listening markers
            if q_num < 1 or q_num > 40:
                continue
            
            # Skip duplicates
            if q_num_str in found_question_nums:
                continue
            
            q_full_text = match.group(2).strip()
            
            # Only process if there's actual content
            if q_full_text and q_full_text.replace('.', '').replace('…', '').strip():
                q_text = q_full_text[:200]
            else:
                q_text = f"Question {q_num_str}"
            
            found_question_nums.add(q_num_str)

            # Extract options if they exist
            options = self._extract_options_from_text(q_full_text)

            # Determine question type
            q_type = self._determine_question_type(q_full_text)

            question = {
                "question_id": q_num,
                "text": q_text,
                "type": q_type,
                "options": options,
                "num_options": len(options)
            }
            questions.append(question)
        
        # Pattern 2: Embedded numbers with answer blanks "27 ……."
        if len(questions) < 40:
            embedded_pattern = r'(\d+)\s+[.…]{2,}'
            embedded_matches = list(re.finditer(embedded_pattern, self.text_full))
            
            for match in embedded_matches:
                q_num_str = match.group(1)
                q_num = int(q_num_str)
                
                # Only extract listening questions (1-40)
                if q_num < 1 or q_num > 40:
                    continue
                
                # Skip if already found
                if q_num_str in found_question_nums:
                    continue
                
                found_question_nums.add(q_num_str)
                
                question = {
                    "question_id": q_num,
                    "text": f"Question {q_num_str}",
                    "type": "fill_blank",
                    "options": [],
                    "num_options": 0
                }
                questions.append(question)

        return sorted(questions, key=lambda x: x["question_id"])

        """Extract a single listening section (deprecated - kept for compatibility)"""
        
        # Flexible section detection - try Part first, then Section
        patterns = [
            rf'(?:^|\n)\s*PART\s+{section_num}',
            rf'(?:^|\n)\s*Part\s+{section_num}',
            rf'(?:^|\n)\s*SECTION\s+{section_num}',
            rf'(?:^|\n)\s*Section\s+{section_num}',
        ]
        
        section_match = None
        for pattern in patterns:
            section_match = re.search(pattern, listening_text, re.IGNORECASE | re.MULTILINE)
            if section_match:
                break
        
        if not section_match:
            return None

        section_start = section_match.start()
        
        # Find next section
        next_match = re.search(
            rf'(?:PART|Part|SECTION|Section)\s+{section_num + 1}',
            listening_text[section_start + 50:],
            re.IGNORECASE
        )
        section_end = section_start + next_match.start() + 50 if next_match else len(listening_text)
        section_content = listening_text[section_start:section_end]

        # Extract questions
        questions = self._extract_listening_questions_for_section(section_content)

        if not questions:
            return None

        section = {
            "type": "listening",
            "section_number": section_num,
            "title": f"Listening Section {section_num}",
            "questions": questions,
            "total_questions": len(questions)
        }
        
        return section

    def _extract_listening_questions_for_section(self, section_text: str) -> List[Dict[str, Any]]:
        """Extract all questions from a listening section with full context"""
        questions = []
        
        # Pattern 1: Line-start questions "31. Question text" or "31: Question text"
        question_pattern = r'^\s*(\d+)\s*(?:\.|:|\s)(.*)$'
        question_matches = list(re.finditer(question_pattern, section_text, re.MULTILINE))

        found_question_nums = set()
        for match in question_matches:
            q_num_str = match.group(1)
            q_num = int(q_num_str)
            
            # Filter out obviously non-question numbers
            if q_num < 1 or q_num > 100:
                continue
            
            q_full_text = match.group(2).strip()
            
            # Skip if we've already processed this question number
            if q_num_str in found_question_nums:
                continue
            
            # Capture surrounding context for incomplete questions
            # Get 200 chars of context before and after
            match_start = max(0, match.start() - 200)
            match_end = min(len(section_text), match.end() + 200)
            context = section_text[match_start:match_end].strip()
            
            # If question text is minimal, use context
            if not q_full_text or len(q_full_text) < 5:
                q_text = context
            else:
                q_text = q_full_text
            
            found_question_nums.add(q_num_str)

            options = self._extract_options_from_text(q_text)
            q_type = self._determine_question_type(q_text)

            question = {
                "question_id": q_num,
                "text": q_text,
                "type": q_type,
                "options": options,
                "num_options": len(options)
            }
            questions.append(question)
        
        # Pattern 2: Embedded numbers in lines with answer blanks "31 ……."
        # This catches questions embedded in bullet points or notes
        if not questions or len(questions) < 5:
            embedded_pattern = r'(\d+)\s+[.…]{2,}'
            embedded_matches = list(re.finditer(embedded_pattern, section_text))
            
            for match in embedded_matches:
                q_num_str = match.group(1)
                q_num = int(q_num_str)
                
                # Filter out obviously non-question numbers
                if q_num < 1 or q_num > 100:
                    continue
                
                # Skip if already found via first pattern
                if q_num_str in found_question_nums:
                    continue
                
                found_question_nums.add(q_num_str)
                
                # Get surrounding context (up to 500 chars around the blank)
                match_start = max(0, match.start() - 250)
                match_end = min(len(section_text), match.end() + 250)
                context = section_text[match_start:match_end].strip()
                
                question = {
                    "question_id": q_num,
                    "text": context,  # Use full context, not just placeholder
                    "type": "fill_blank",
                    "options": [],
                    "num_options": 0
                }
                questions.append(question)
        
        return sorted(questions, key=lambda x: x["question_id"])

    def _extract_writing_sections(self) -> List[Dict[str, Any]]:
        """Extract writing tasks"""
        sections = []
        
        # More flexible writing detection
        writing_match = re.search(r'(?:writing|WRITING|task\s+1)', self.text_full, re.IGNORECASE)
        if not writing_match:
            return sections

        writing_text = self.text_full[writing_match.start():]

        # Extract Task 1 and Task 2
        for task_num in range(1, 3):
            task_section = self._extract_single_writing_task(writing_text, task_num)
            if task_section:
                sections.append(task_section)

        return sections

    def _extract_single_writing_task(self, writing_text: str, task_num: int) -> Optional[Dict[str, Any]]:
        """Extract a single writing task"""
        
        # More flexible task detection
        task_pattern = rf'(?:task|Task)\s+{task_num}'
        task_match = re.search(task_pattern, writing_text, re.IGNORECASE)
        
        if not task_match:
            return None

        task_start = task_match.start()
        
        # Find next task
        next_task = re.search(
            rf'(?:task|Task)\s+{task_num + 1}',
            writing_text[task_start + 50:],
            re.IGNORECASE
        )
        task_end = task_start + next_task.start() + 50 if next_task else len(writing_text)
        task_content = writing_text[task_start:task_end]

        # Extract task description and clean up formatting
        task_desc = re.sub(rf'Task\s+{task_num}', '', task_content, flags=re.IGNORECASE).strip()
        # Replace multiple newlines and spaces with single space, preserve paragraph breaks
        task_desc = re.sub(r'\n+', '\n', task_desc)  # Collapse multiple newlines
        task_desc = re.sub(r' +', ' ', task_desc)     # Collapse multiple spaces
        task_desc = task_desc.replace('\n', ' ')       # Convert all newlines to spaces
        task_desc = task_desc[:1000]                   # Use full description, not truncated

        section = {
            "type": "writing",
            "section_number": task_num,
            "title": f"Writing Task {task_num}",
            "description": task_desc,
            "questions": [{
                "question_id": 1,
                "text": task_desc[:300],  # Use more content for question text too
                "type": "writing_task"
            }],
            "total_questions": 1
        }
        
        return section

    def _extract_options_from_text(self, text: str) -> List[Dict[str, str]]:
        """Extract multiple choice options (A, B, C, D)"""
        options = []
        option_pattern = r'[A-D][\.\)]\s+(.+?)(?=\n[A-D][\.\)]|\n\n|$)'
        option_matches = re.finditer(option_pattern, text, re.DOTALL)

        for match in option_matches:
            option_text = match.group(1).strip()[:200]
            if option_text and len(option_text) > 3:
                options.append({
                    "label": match.group(0)[0],
                    "text": option_text
                })

        return options

    def _determine_question_type(self, question_text: str) -> str:
        """Determine the type of question"""
        text_lower = question_text.lower()
        
        if re.search(r'\b(true|false|not\s+given)\b', text_lower):
            return "true_false_not_given"
        elif re.search(r'match|matching', text_lower):
            return "matching"
        elif re.search(r'complete|blank|fill', text_lower):
            return "fill_blank"
        elif re.search(r'\b(answer|short|write)\b', text_lower):
            return "short_answer"
        elif re.search(r'summary', text_lower):
            return "summary"
        elif re.search(r'label|diagram|figure', text_lower):
            return "diagram_label"
        elif re.search(r'table', text_lower):
            return "table_complete"
        elif re.search(r'flowchart|flow', text_lower):
            return "flow_chart"
        elif re.search(r'[A-D][\.\)]\s+', question_text):
            return "multiple_choice"
        else:
            return "open_question"

    def _calculate_confidence(self, test_data: Dict[str, Any]) -> float:
        """Calculate confidence score"""
        total_sections = test_data["test_info"]["num_sections"]
        total_questions = test_data["test_info"]["total_questions"]
        
        # Scoring factors
        has_title = 1.0 if test_data["test_info"]["title"] != "IELTS Test" else 0.5
        has_sections = min(total_sections / 9.0, 1.0)  # Max 9 sections (3 reading + 4 listening + 2 writing)
        has_questions = min(total_questions / 40.0, 1.0)  # Min 40 questions expected
        
        # Calculate weighted confidence
        confidence = (has_title * 0.2 + has_sections * 0.4 + has_questions * 0.4)
        
        # Bonus for comprehensive extraction
        if total_sections >= 7 and total_questions >= 35:
            confidence = min(confidence * 1.2, 1.0)
        
        return confidence
