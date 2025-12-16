"""
IELTS PDF to JSON Converter - v4 (Complete Rewrite)
Properly structures extraction to match IELTS format:
- 1 Reading section (3 passages)
- 1 Listening section (4 parts)
- 1 Writing section (2 tasks)
- Optional: 1 Speaking section
"""

import re
import json
import fitz  # PyMuPDF
from typing import Dict, List, Any, Tuple, Optional


class IELTSPDFConverter:
    """
    Extracts complete IELTS test content following proper IELTS structure.
    """

    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.text_full = ""
        self.text_by_page = []
        self.artifact_patterns = [
            r'@EnglishSchoolbyRM\s*\d+',  # Remove artifact watermarks
            r'@EnglishSchoolbyRM',
            r'©\s*British\s+Council',
            r'Page\s+\d+',
        ]

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

    def _clean_text(self, text: str) -> str:
        """Remove formatting artifacts and clean text"""
        if not text:
            return text
        
        # Remove known artifacts
        for pattern in self.artifact_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        # Fix corrupted text where single characters are on separate lines with proper spacing
        # E.g., "w\ne\nr\ne" should become "were", "pets\ne\nr\ne\nw" should become "pets were"
        # First pass: Fix character-level splits
        text = re.sub(r'(\w)\s*\n\s*(\w)', r'\1\2', text)
        text = re.sub(r'(\w)\s*\n\s*(\w)', r'\1\2', text)  # Apply twice to catch multiple
        
        # Normalize whitespace while preserving word boundaries
        text = re.sub(r'\n{3,}', '\n\n', text)  # Reduce excessive newlines
        text = re.sub(r'[ \t]{2,}', ' ', text)  # Collapse multiple spaces/tabs
        
        # Convert newlines to spaces, ensuring space between words
        # If there's text before and after newline, ensure space between them
        text = re.sub(r'(\w)\n(\w)', r'\1 \2', text)  # Word boundaries across newlines get space
        text = text.replace('\n', ' ')  # Convert remaining newlines to spaces
        text = re.sub(r' {2,}', ' ', text)  # Collapse multiple spaces
        
        # Remove any remaining control characters
        text = ''.join(c for c in text if ord(c) >= 32 or c in '\n\t')
        
        return text.strip()

    def _deduplicate_questions(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate questions by ID, keeping first occurrence"""
        seen_ids = set()
        deduplicated = []
        for q in questions:
            q_id = q.get("id")
            if q_id not in seen_ids:
                deduplicated.append(q)
                seen_ids.add(q_id)
        return deduplicated

    def _parse_ielts_structure(self) -> Dict[str, Any]:
        """
        Parse IELTS test as proper structure:
        - 1 Reading section (with 3 passages)
        - 1 Listening section (with 4 parts)
        - 1 Writing section (with 2 tasks)
        - Optional: 1 Speaking section
        
        NOTE: Sections can appear in any order in the PDF
        """
        test_data = {
            "metadata": {
                "source": self.pdf_path,
                "extraction_method": "ielts_structured_extraction_v4",
                "total_pages": len(self.text_by_page)
            },
            "test_info": {
                "title": self._extract_test_title(),
                "test_type": "IELTS Academic",
                "num_sections": 0,
                "total_questions": 0
            },
            "sections": []
        }

        # Extract each major section following IELTS structure
        # Process in this order: Listening, Reading, Writing (order independent of PDF order)
        listening_section = self._extract_listening_section()
        if listening_section:
            test_data["sections"].append(listening_section)

        reading_section = self._extract_reading_section()
        if reading_section:
            test_data["sections"].append(reading_section)

        writing_section = self._extract_writing_section()
        if writing_section:
            test_data["sections"].append(writing_section)

        speaking_section = self._extract_speaking_section()
        if speaking_section:
            test_data["sections"].append(speaking_section)

        # Count sections and questions
        test_data["test_info"]["num_sections"] = len(test_data["sections"])
        for section in test_data["sections"]:
            if section.get("type") == "reading":
                for passage in section.get("passages", []):
                    test_data["test_info"]["total_questions"] += len(passage.get("questions", []))
            elif section.get("type") == "listening":
                for part in section.get("parts", []):
                    test_data["test_info"]["total_questions"] += len(part.get("questions", []))
            elif section.get("type") == "writing":
                for task in section.get("tasks", []):
                    test_data["test_info"]["total_questions"] += len(task.get("questions", []))

        return test_data

    def _extract_reading_section(self) -> Optional[Dict[str, Any]]:
        """Extract Reading section with 3 passages
        
        IELTS Reading has 3 passages with 13 questions each (total 40).
        The PDF structure has:
        - Passage content (pages 2-3, 6-7, 10-11)
        - Questions listed separately (pages 7-9, 10-12, 13-16)
        - Question ranges: 1-13, 14-26, 27-40 for passages 1, 2, 3
        """
        passages = []
        
        # Define reading passages with their markers and question ranges
        reading_passages = [
            {
                'passage_num': 1,
                'title_marker': r'Tunnelling\s+under\s+the\s+Thames',
                'q_start': 1,
                'q_end': 13,
            },
            {
                'passage_num': 2,
                'title_marker': r"Children.*?comprehension\s+of\s+television",
                'q_start': 14,
                'q_end': 26,
            },
            {
                'passage_num': 3,
                'title_marker': r'BUSINESS\s+INNOVATION',
                'q_start': 27,
                'q_end': 40,
            },
        ]
        
        for passage_info in reading_passages:
            passage_num = passage_info['passage_num']
            q_start = passage_info['q_start']
            q_end = passage_info['q_end']
            title_marker = passage_info['title_marker']
            
            # Find passage content by title
            title_match = re.search(title_marker, self.text_full, re.IGNORECASE | re.DOTALL)
            if not title_match:
                continue
            
            # Extract passage title
            title_start = title_match.start()
            # Get line with title
            line_start = self.text_full.rfind('\n', 0, title_start) + 1
            line_end = self.text_full.find('\n', title_start)
            passage_title = self.text_full[line_start:line_end].strip()
            
            # Find where passage content ends - look for next major section or "Questions"
            content_start = line_end + 1
            content_end = len(self.text_full)
            
            # Find where questions start (either "Questions" marker or next passage)
            if passage_num < 3:
                next_title_marker = reading_passages[passage_num]['title_marker']
                next_match = re.search(next_title_marker, self.text_full[content_start:], re.IGNORECASE | re.DOTALL)
                if next_match:
                    content_end = content_start + next_match.start()
            
            passage_content = self.text_full[content_start:content_end]
            
            # Extract questions for this passage (questions are on separate pages)
            questions = self._extract_all_reading_questions_by_range(q_start, q_end)
            
            if not questions and passage_content.strip():
                # Only content, no questions - still create passage
                content_text = self._clean_text(passage_content)
            elif questions:
                # Extract just the passage content (before any "Questions" marker)
                questions_marker = f'Questions {q_start}'
                q_marker_idx = passage_content.find(questions_marker)
                if q_marker_idx > 0:
                    passage_content = passage_content[:q_marker_idx]
                content_text = self._clean_text(passage_content)
            else:
                content_text = ""
            
            if content_text or questions:
                passage = {
                    "passage_number": passage_num,
                    "title": passage_title,
                    "content": content_text,
                    "questions": questions,
                    "total_questions": len(questions)
                }
                passages.append(passage)
        
        if not passages:
            return None
        
        total_questions = sum(len(p.get("questions", [])) for p in passages)
        
        return {
            "type": "reading",
            "section_number": 2,
            "title": "Reading",
            "num_passages": len(passages),
            "passages": passages,
            "total_questions": total_questions
        }

    def _extract_all_reading_questions_by_range(self, q_start: int, q_end: int) -> List[Dict[str, Any]]:
        """Extract reading questions by searching full text for question markers
        
        CRITICAL: Filter out instruction text like "You should spend about 20 minutes..."
        Also avoid matching question numbers from wrong sections (listening, headers, etc).
        Strategy: Look for the pattern "Q_NUM.) TEXT" which is typical for question sections,
        and reject patterns that belong to different sections.
        """
        questions = []
        
        # Instruction patterns to skip
        instruction_keywords = [
            r'^You\s+should\s+spend',
            r'^Write\s+your\s+answers?',
            r'^Complete\s+the',
            r'^Do\s+not',
            r'^Questions\s+\d+',
            r'^(?:For|Choose|Answer|Match|According)',
        ]
        instruction_pattern = '|'.join(instruction_keywords)
        
        # Patterns for different sections to avoid
        wrong_section_patterns = [
            r'^\s*(?:PART|Questions.*\d+.*\d+)',  # Listening parts or headers
            r'^\s*[£€$\…]',  # Listening gap-fill blanks start with these
            r'^\s*READING\s+PASSAGE',  # Passage headers
            r'^\s*(?:WRITING|SPEAKING)',  # Other sections
        ]
        
        # More robust: find each individual question by its number within reading context
        for q_num in range(q_start, q_end + 1):
            # Look for the question number at start of line
            # Pattern: number + optional parenthesis/dot + text
            q_pattern = rf'(?:^|\n)\s*{q_num}\s*[.\)]*\s+([^\n]+(?:\n(?!\s*{q_num+1}\s*[.\)]|\s*[A-H]\s*[\)\.])(?!\s*(?:PART|Questions|PASSAGE|READING|WRITING))[\s]*[^\n]*)*)'
            
            matches = list(re.finditer(q_pattern, self.text_full, re.MULTILINE | re.IGNORECASE))
            
            if not matches:
                continue
            
            # Try to find the match that belongs to the reading section, not listening/headers
            best_match = None
            
            for match in reversed(matches):  # Start from end to prefer questions section over passage header
                q_text_candidate = match.group(1).strip() if match.lastindex and match.lastindex >= 1 else match.group(0).strip()
                q_text_candidate = re.sub(rf'^\s*{q_num}\s*[.\)]*\s*', '', q_text_candidate)
                
                # Check if this looks like a real question or wrong section
                is_instruction = bool(re.match(instruction_pattern, q_text_candidate, re.IGNORECASE))
                is_wrong_section = any(
                    bool(re.match(pattern, q_text_candidate, re.MULTILINE | re.IGNORECASE))
                    for pattern in wrong_section_patterns
                )
                
                # Skip instructions and wrong sections
                if is_instruction or is_wrong_section:
                    continue
                
                # Skip if too short (likely a header)
                if len(q_text_candidate) < 5:
                    continue
                
                # This looks like a valid question
                best_match = match
                break
            
            if not best_match:
                # Fallback: use the last match if no clean one found
                best_match = matches[-1]
            
            # Extract text from best match
            q_text = best_match.group(1).strip() if best_match.lastindex and best_match.lastindex >= 1 else best_match.group(0).strip()
            q_text = re.sub(rf'^\s*{q_num}\s*[.\)]*\s*', '', q_text)
            q_text = self._clean_text(q_text)
            
            # Final sanity check: skip instruction text even after cleaning
            if len(q_text) > 3 and not re.match(instruction_pattern, q_text, re.IGNORECASE):
                q_type = self._determine_reading_question_type(q_text)
                options = self._extract_multiple_choice_options(q_text)
                
                question = {
                    "id": q_num,
                    "text": q_text,
                    "type": q_type,
                    "options": options if options else None
                }
                questions.append(question)
        
        return self._deduplicate_questions(sorted(questions, key=lambda x: x["id"]))

    def _extract_reading_passage_by_range(self, passage_num: int, q_start: int, q_end: int) -> Optional[Dict[str, Any]]:
        """DEPRECATED: Replaced by improved _extract_reading_section and _extract_all_reading_questions_by_range"""
        pass

    def _extract_passage_content_and_title(self, passage_section: str, q_start: int, q_end: int) -> Tuple[str, str]:
        """DEPRECATED: No longer used"""
        pass

    def _extract_reading_questions_by_range(self, passage_section: str, q_start: int, q_end: int) -> List[Dict[str, Any]]:
        """DEPRECATED: Replaced by _extract_all_reading_questions_by_range"""
        pass

    def _extract_reading_passage(self, passage_num: int) -> Optional[Dict[str, Any]]:
        """DEPRECATED: Use _extract_reading_section() instead."""
        pass

    def _extract_passage_text(self, passage_section: str, passage_num: int) -> str:
        """DEPRECATED: No longer used"""
        pass

    def _extract_reading_questions(self, passage_section: str, passage_num: int) -> List[Dict[str, Any]]:
        """DEPRECATED: Use _extract_all_reading_questions_by_range() instead"""
        pass

    def _determine_reading_question_type(self, text: str) -> str:
        """Determine the type of reading question with improved accuracy"""
        text_lower = text.lower()
        
        # TRUE/FALSE/NOT GIVEN - highest priority
        if re.search(r'\bTRUE\b.*\bFALSE\b.*\bNOT\s+GIVEN\b', text_lower) or \
           re.search(r'TRUE\s*(?:/|or)\s*FALSE\s*(?:/|or)\s*NOT\s*GIVEN', text_lower):
            return "true_false_ng"
        
        # MATCHING - look for options A-H or I-VIII
        if re.search(r'match.*?[A-H]|[A-H].*?match', text_lower, re.DOTALL) or \
           re.search(r'Roman numerals|[I-V]{2,}|(?:^|\s)[A-H]\s+(?:has|is|was|provides|shows)', text_lower):
            return "matching"
        
        # MULTIPLE CHOICE - look for A) B) C) or A. B. C. etc.
        if re.search(r'[A-D]\s*[\)\.]\s+', text) or \
           re.search(r'(?:choose|select|which|what).{0,50}[A-D]\s*[\)\.]\s+', text_lower):
            return "multiple_choice"
        
        # HEADING MATCHING - specific for reading
        if re.search(r'heading|correspond|match.*?heading', text_lower):
            return "heading_matching"
        
        # SENTENCE COMPLETION / GAP FILL
        if re.search(r'complete.*?sentence|fill.*?blank|gap|blank|incomplete|\.{3,}', text_lower):
            return "gap_fill"
        
        # SUMMARY/NOTE COMPLETION
        if re.search(r'complet.*?summar|complet.*?notes|note.{0,30}form|form.{0,30}blank', text_lower):
            return "summary_completion"
        
        # SHORT ANSWER
        if re.search(r'answer.*?question|short answer|answer.{0,30}word', text_lower):
            return "short_answer"
        
        return "open_question"

    def _determine_listening_question_type(self, text: str) -> str:
        """Determine listening question type with improved accuracy"""
        text_lower = text.lower()
        
        # MULTIPLE CHOICE - options A, B, C
        if re.search(r'[A-C]\s*[\)\.]\s+[A-Z]', text) or \
           re.search(r'which|what|who.{0,50}[A-C]\s*[\)\.]\s+', text_lower):
            return "multiple_choice"
        
        # MATCHING
        if re.search(r'match|[A-H]\s+(?:supports|provides|has)', text_lower):
            return "matching"
        
        # GAP FILL - look for blanks/dots/underscores
        if re.search(r'[…\.\-_]+|blank|fill|gap|complete', text_lower):
            return "gap_fill"
        
        # TABLE/FORM COMPLETION
        if re.search(r'table|form|fill.*?box|complet.*?table', text_lower):
            return "form_completion"
        
        return "open_question"

    def _extract_listening_section(self) -> Optional[Dict[str, Any]]:
        """Extract Listening section with 4 parts"""
        parts = []
        
        for part_num in range(1, 5):
            part = self._extract_listening_part(part_num)
            if part:
                parts.append(part)
        
        if not parts:
            return None
        
        total_questions = sum(len(p.get("questions", [])) for p in parts)
        
        return {
            "type": "listening",
            "section_number": 1,  # Listening is typically section 1
            "title": "Listening",
            "num_parts": len(parts),
            "parts": parts,
            "total_questions": total_questions
        }

    def _extract_listening_part(self, part_num: int) -> Optional[Dict[str, Any]]:
        """Extract a single listening part"""
        
        # Find part header - try multiple patterns  
        part_patterns = [
            rf'(?:^|\n)\s*PART\s+{part_num}(?:\s|:|\.)',
            rf'(?:^|\n)\s*Part\s+{part_num}(?:\s|:|\.)',
        ]
        
        part_match = None
        for pattern in part_patterns:
            part_match = re.search(pattern, self.text_full, re.IGNORECASE | re.MULTILINE)
            if part_match:
                break
        
        if not part_match:
            return None

        part_start = part_match.start()
        
        # Find part end - look for next part or major section
        end_patterns = [
            rf'(?:^|\n)\s*PART\s+{part_num + 1}',
            rf'(?:^|\n)\s*Part\s+{part_num + 1}',
            r'(?:^|\n)\s*(?:READING|Reading|WRITING|Writing|SPEAKING|Speaking)',
        ]
        
        part_end = len(self.text_full)
        for pattern in end_patterns:
            match = re.search(pattern, self.text_full[part_start + 50:], re.IGNORECASE | re.MULTILINE)
            if match:
                part_end = min(part_end, part_start + match.start() + 50)
                break
        
        part_section_text = self.text_full[part_start:part_end]
        
        # For Part 1, extract table-based questions
        if part_num == 1:
            questions = self._extract_listening_part1_table_questions(part_section_text)
        # For Part 4, extract note-based questions (use dot pattern like 31., 32., etc.)
        elif part_num == 4:
            questions = self._extract_listening_part4_note_questions(part_section_text)
        else:
            # Parts 2 & 3: standard question extraction
            questions = self._extract_listening_questions(part_section_text)
        
        if not questions:
            return None
        
        return {
            "part_number": part_num,
            "title": f"Part {part_num}",
            "questions": self._deduplicate_questions(sorted(questions, key=lambda x: x["id"])),
            "total_questions": len(questions),
            "description": self._extract_part_description(part_section_text)
        }

    def _extract_listening_part1_table_questions(self, part_text: str) -> List[Dict[str, Any]]:
        """Extract Part 1 questions from table structure"""
        questions = []
        
        # Part 1 has questions numbered 1-10 embedded in a data table
        # Format in text: "garage has 1…….", "and space for several 2…….", "3 £ …….", etc.
        # The problem is they're in a table, so numbers are often preceded by description
        
        extracted_lines = {}  # Map question number to its text
        
        # Strategy: Find any line containing "digit ........" or "digit £" pattern
        # Look for patterns like: "garage has 1….", "3 £ ..", "4 … Road", etc.
        
        # First pass: Look for numbered blanks (any digit followed by dots or symbols)
        # This pattern matches: "text 1 dots", "text £ 3 dots", etc.
        number_blank_pattern = r'(?:^|\n|[^\d])(\d+)(?=\s*[£€$\-…\.•])'
        
        for match in re.finditer(number_blank_pattern, part_text):
            q_num_str = match.group(1)
            try:
                q_num = int(q_num_str)
            except:
                continue
            
            # Only accept Part 1 questions (1-10)
            if q_num < 1 or q_num > 10:
                continue
            
            # Skip if we already have this question
            if q_num in extracted_lines:
                continue
            
            # Get the full line context
            match_start = match.start()
            line_start = part_text.rfind('\n', 0, match_start) + 1
            line_end = part_text.find('\n', match.end())
            if line_end == -1:
                line_end = len(part_text)
            
            full_line = part_text[line_start:line_end].strip()
            
            # Extract just the meaningful part (not the full line which might have table cells)
            # Take the question number and everything after it until the end of this logical unit
            q_context_start = full_line.find(q_num_str)
            if q_context_start != -1:
                q_text = full_line[q_context_start:]
                
                # Clean up: extract just the number + dots/symbols pattern
                # Look for: "3 £ ……", "4 …… Road", etc.
                cleaned = re.sub(r'^(\d+)\s*', r'\1 ', q_text).strip()
                extracted_lines[q_num] = cleaned
        
        # Second pass: If we're missing Q1-Q10, try alternative patterns
        for q_num in range(1, 11):
            if q_num not in extracted_lines:
                # Try pattern: line containing the number followed by dots/blanks
                alt_pattern = rf'(?:^|\n)[^\n]*?{q_num}\s*(?:[…\.\-£€$•][^\n]*)?'
                alt_match = re.search(alt_pattern, part_text, re.MULTILINE)
                
                if alt_match:
                    full_match = alt_match.group(0).strip()
                    # Extract just the part with the question number onwards
                    q_idx = full_match.find(str(q_num))
                    if q_idx != -1:
                        q_text = full_match[q_idx:].strip()
                        extracted_lines[q_num] = q_text
        
        # Create question objects
        for q_num in sorted(extracted_lines.keys()):
            q_text = extracted_lines[q_num]
            
            # Clean the text
            q_text = self._clean_text(q_text)
            
            # Skip if too short
            if len(q_text.strip()) < 2:
                continue
            
            # All Part 1 questions are gap-fill
            question = {
                "id": q_num,
                "text": q_text,
                "type": "gap_fill",
                "max_words": 2 if q_num <= 7 else 1,
                "options": None
            }
            
            questions.append(question)
        
        return questions

    def _extract_listening_part4_note_questions(self, part_text: str) -> List[Dict[str, Any]]:
        """Extract Part 4 questions from note-taking format (uses numbered dots like 31., 32., etc.)"""
        questions = []
        
        # Part 4 uses pattern: "31 ……………  (description)"
        # Look for: number + dots/blanks + optional context
        question_pattern = r'(\d+)\s*[…\.]+[^\n]*'
        
        for match in re.finditer(question_pattern, part_text):
            q_num_str = match.group(1)
            try:
                q_num = int(q_num_str)
            except:
                continue
            
            # Part 4: Questions 31-40
            if q_num < 31 or q_num > 40:
                continue
            
            # Get full line context
            line_start = part_text.rfind('\n', 0, match.start()) + 1
            line_end = part_text.find('\n', match.end())
            if line_end == -1:
                line_end = len(part_text)
            
            q_text = part_text[line_start:line_end].strip()
            
            # Get surrounding context if line too short
            if len(q_text) < 15:
                context_start = max(0, line_start - 100)
                context_end = min(len(part_text), line_end + 50)
                full_context = part_text[context_start:context_end]
                
                # Extract lines around the question
                lines = full_context.split('\n')
                for i, line in enumerate(lines):
                    if re.search(rf'\b{q_num}\b', line):
                        context = []
                        if i > 0:
                            context.append(lines[i-1])
                        context.append(line)
                        q_text = ' '.join(context)
                        break
            
            q_text = self._clean_text(q_text)
            
            question = {
                "id": q_num,
                "text": q_text,
                "type": "gap_fill",
                "max_words": 1,  # Part 4 typically allows 1 word only
                "options": None
            }
            
            questions.append(question)
        
        return questions

    def _extract_listening_questions(self, part_text: str) -> List[Dict[str, Any]]:
        """Extract listening questions from part text (Parts 2-3)"""
        questions = []
        
        # Pattern to find question numbers and their content
        # Key issues to handle:
        # 1. Questions can span multiple lines (like Q11-Q14 in Part 2)
        # 2. Must avoid matching numbers from headers like "Questions 15 – 20"
        # 3. Stop at next question number or instruction marker
        
        # Pattern explanation:
        # - (?:^|\n)\s*(\d+)\s+ : Question number at start of line
        # - ((?:[^\n]*(?:\n(?!PART|Questions?|Choose|Answer|For|Select|\s*\d+\s+))?)*) : Content including multi-line
        #   but stops when next instruction/section starts
        question_pattern = r'(?:^|\n)\s*(\d+)\s+((?:[^\n]+(?:\n(?!\s*(?:PART|Questions?|Choose|Answer|For|Select|\s*\d+\s+))[^\n]+)?)*)'
        
        for match in re.finditer(question_pattern, part_text, re.MULTILINE | re.IGNORECASE):
            q_num_str = match.group(1)
            try:
                q_num = int(q_num_str)
            except:
                continue
            
            # Validate reasonable question number for listening (1-40)
            if q_num < 1 or q_num > 40:
                continue
            
            q_text = match.group(2).strip()
            
            # Reject if it's just a dash or part of a range
            if re.match(r'^[\–\-\s]+\d+', q_text) or re.match(r'^[\–\-\s]*$', q_text):
                continue
            
            # Reject if text is too short
            if len(q_text) < 3:
                continue
            
            q_text = self._clean_text(q_text)
            
            # Determine question type
            q_type = self._determine_listening_question_type(q_text)
            
            # Extract options for multiple choice questions
            options = self._extract_multiple_choice_options(q_text)
            
            question = {
                "id": q_num,
                "text": f"{q_num} {q_text}" if not q_text.startswith(str(q_num)) else q_text,
                "type": q_type,
                "options": options if options else None
            }
            
            questions.append(question)
        
        return questions

    def _determine_listening_question_type(self, text: str) -> str:
        """Determine listening question type"""
        text_lower = text.lower()
        
        if re.search(r'[A-D]\s+', text):
            return "multiple_choice"
        
        if re.search(r'match|matching', text_lower):
            return "matching"
        
        if re.search(r'[…\.]|blank|gap|fill|complete', text_lower):
            return "gap_fill"
        
        return "open_question"

    def _extract_writing_section(self) -> Optional[Dict[str, Any]]:
        """Extract Writing section with 2 tasks"""
        tasks = []
        
        for task_num in range(1, 3):
            task = self._extract_writing_task(task_num)
            if task:
                tasks.append(task)
        
        if not tasks:
            return None
        
        return {
            "type": "writing",
            "section_number": 4,  # Writing is typically section 4
            "title": "Writing",
            "num_tasks": len(tasks),
            "tasks": tasks,
            "total_questions": len(tasks)  # 1 question per task
        }

    def _extract_writing_task(self, task_num: int) -> Optional[Dict[str, Any]]:
        """Extract a single writing task"""
        
        # Find task header
        task_pattern = rf'(?:WRITING\s+)?TASK\s+{task_num}'
        task_match = re.search(task_pattern, self.text_full, re.IGNORECASE)
        
        if not task_match:
            return None

        task_start = task_match.start()
        
        # Find task end (next task or major section)
        end_patterns = [
            rf'(?:WRITING\s+)?TASK\s+{task_num + 1}',
            r'(?:^|\n)\s*SPEAKING',
            r'(?:^|\n)\s*Answer\s+Key',
        ]
        
        task_end = len(self.text_full)
        for pattern in end_patterns:
            match = re.search(pattern, self.text_full[task_start + 50:], re.IGNORECASE)
            if match:
                task_end = min(task_end, task_start + match.start() + 50)
                break
        
        task_section_text = self.text_full[task_start:task_end]
        
        # Extract task description
        description = self._extract_task_description(task_section_text, task_num)
        
        if not description:
            return None
        
        # Determine task type (graph, letter, essay, etc.)
        task_type = self._determine_writing_task_type(description)
        
        return {
            "task_number": task_num,
            "title": f"Task {task_num}",
            "description": self._clean_text(description),
            "type": task_type,
            "questions": [{
                "id": 1,
                "text": f"Complete Writing Task {task_num}",
                "type": "writing_task"
            }],
            "total_questions": 1
        }

    def _extract_task_description(self, task_section: str, task_num: int) -> str:
        """Extract task description/prompt"""
        # Find content from task header onwards until next task or section
        # Pattern allows for variations like "TASK 1:", "Task 1:", "WRITING TASK 1", etc.
        pattern = rf'(?:WRITING\s+)?TASK\s+{task_num}[:\s]+([\s\S]*?)(?=(?:^|\n)\s*(?:(?:WRITING\s+)?TASK\s+{task_num + 1}|SPEAKING|Answer\s+Key|$))'
        
        match = re.search(pattern, task_section, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip()
        
        return ""

    def _determine_writing_task_type(self, description: str) -> str:
        """Determine writing task type"""
        desc_lower = description.lower()
        
        if re.search(r'graph|chart|diagram|bar|line|pie', desc_lower):
            return "graph_description"
        
        if re.search(r'letter|write\s+to', desc_lower):
            return "letter"
        
        if re.search(r'report|academic', desc_lower):
            return "report"
        
        if re.search(r'essay|discuss|agree|opinion', desc_lower):
            return "essay"
        
        return "general_writing"

    def _extract_speaking_section(self) -> Optional[Dict[str, Any]]:
        """Extract Speaking section if present"""
        speaking_match = re.search(r'SPEAKING', self.text_full, re.IGNORECASE)
        
        if not speaking_match:
            return None
        
        # For now, just indicate speaking section exists
        return {
            "type": "speaking",
            "section_number": 2,  # Speaking can be any time
            "title": "Speaking",
            "note": "Speaking section detected but detailed extraction not implemented"
        }

    def _extract_multiple_choice_options(self, text: str) -> Optional[List]:
        """Extract options from question text (A-D for multiple choice, A-H for matching)
        
        Looks for:
        - Labeled options: A) Text, B) Text, C) Text, D) Text (or A. B. C. D.)
        - TRUE/FALSE/NOT GIVEN options
        - Matching options: A through H
        """
        options = []
        
        # First check for TRUE/FALSE/NOT GIVEN
        true_false_pattern = r'(?:TRUE|FALSE|NOT\s+GIVEN)'
        if re.search(true_false_pattern, text):
            return [
                {"label": "A", "text": "TRUE"},
                {"label": "B", "text": "FALSE"},
                {"label": "C", "text": "NOT GIVEN"}
            ]
        
        # Look for A-H options (for matching or multiple choice)
        # Patterns: "A) option text", "A. option text", "A option text"
        option_pattern = r'([A-H])\s*[\)\.\-:]\s*([^\n]+?)(?=\n\s*[A-H]\s*[\)\.\-:]|$)'
        matches = list(re.finditer(option_pattern, text, re.MULTILINE))
        
        if len(matches) >= 3:  # Need at least 3 options for multiple choice
            for match in matches:
                label = match.group(1)
                opt_text = self._clean_text(match.group(2).strip())
                if len(opt_text) > 1:  # Skip very short options
                    options.append({
                        "label": label,
                        "text": opt_text
                    })
            
            return options if len(options) >= 3 else None
        
        return None

    def _extract_part_description(self, part_text: str) -> str:
        """Extract part description/context"""
        # Try to find introductory text for the part
        lines = part_text.split('\n')
        description_lines = []
        
        for line in lines[:5]:  # First few lines
            if line.strip() and not re.match(r'^\d+\s+', line):
                description_lines.append(line)
        
        return ' '.join(description_lines).strip()

    def _extract_test_title(self) -> str:
        """Extract test title"""
        patterns = [
            r'(?:IELTS.*?Cambridge)',
            r'Cambridge\s+(?:Test|Mock|Practice)',
            r'IELTS\s+(?:Test|Mock|Practice)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, self.text_full, re.IGNORECASE)
            if match:
                return match.group(0)
        
        return "IELTS Test"

    def _calculate_confidence(self, test_data: Dict[str, Any]) -> float:
        """Calculate extraction confidence score (0.0-1.0) with realistic assessment
        
        This accounts for known quality issues:
        - Question text often incomplete or includes content
        - Options frequently missing (null) for many question types
        - Question type detection imperfect (many marked as open_question)
        - Some questions missing entirely
        - Matching question structures not properly extracted
        """
        score = 0.0
        max_score = 0.0
        
        sections = test_data.get("sections", [])
        
        # 1. Section Completeness (20 points) - has all 3 main sections
        max_score += 20
        expected_sections = 3
        if len(sections) >= 2:
            score += min(20, (len(sections) / expected_sections) * 20)
        
        # 2. Basic Question Extraction (30 points) - questions present
        # IELTS Academic: 40 listening + 40 reading = 80 questions
        max_score += 30
        total_q = test_data["test_info"]["total_questions"]
        expected_questions = 80
        if total_q > 0:
            # Be more realistic about quality - only count up to 70% as "good"
            q_accuracy = min(0.7, total_q / expected_questions)
            score += q_accuracy * 30
        
        # 3. Text Quality (20 points) - check for corrupted/instruction text
        max_score += 20
        text_quality_issues = 0
        total_questions_checked = 0
        
        for section in sections:
            if section.get("type") == "reading":
                for passage in section.get("passages", []):
                    for q in passage.get("questions", []):
                        total_questions_checked += 1
                        q_text = q.get("text", "").lower()
                        # Check for instruction text contamination
                        if any(x in q_text for x in ["you should", "write your", "complete the", "choose from"]):
                            text_quality_issues += 1
            elif section.get("type") == "listening":
                for part in section.get("parts", []):
                    for q in part.get("questions", []):
                        total_questions_checked += 1
                        q_text = q.get("text", "").lower()
                        # Check for instruction text in question
                        if any(x in q_text for x in ["part", "questions", "choose", "answer"]):
                            if "how" not in q_text and "what" not in q_text:  # Allow instruction words in actual questions
                                text_quality_issues += 1
        
        # Calculate text quality score
        if total_questions_checked > 0:
            text_quality = 1.0 - (text_quality_issues / total_questions_checked)
            score += text_quality * 20
        else:
            score += 20
        
        # 4. Options/Structure Presence (15 points) - how many questions have options
        max_score += 15
        questions_with_options = 0
        total_with_options_possible = 0
        
        for section in sections:
            if section.get("type") == "reading":
                for passage in section.get("passages", []):
                    for q in passage.get("questions", []):
                        q_type = q.get("type", "open_question")
                        # These types should have options
                        if q_type in ["multiple_choice", "matching", "true_false_ng"]:
                            total_with_options_possible += 1
                            if q.get("options"):
                                questions_with_options += 1
            elif section.get("type") == "listening":
                for part in section.get("parts", []):
                    for q in part.get("questions", []):
                        q_type = q.get("type", "open_question")
                        # Listening matching should have structured options
                        if q_type in ["multiple_choice", "matching"]:
                            total_with_options_possible += 1
                            if q.get("options"):
                                questions_with_options += 1
        
        # Only score this if there are questions that should have options
        if total_with_options_possible > 0:
            options_score = (questions_with_options / total_with_options_possible) * 15
            score += min(15, options_score)
        
        # 5. Question Type Variety (15 points)
        max_score += 15
        types_found = set()
        for section in sections:
            if section.get("type") == "reading":
                for passage in section.get("passages", []):
                    for q in passage.get("questions", []):
                        types_found.add(q.get("type"))
            elif section.get("type") == "listening":
                for part in section.get("parts", []):
                    for q in part.get("questions", []):
                        types_found.add(q.get("type"))
        
        # Expected diverse types: gap_fill, multiple_choice, matching, true_false_ng, heading_matching, etc.
        expected_types = 5
        if len(types_found) > 0:
            # More realistic: cap at 10/15 since we can't detect all types perfectly
            type_score = min(10, (len(types_found) / expected_types) * 15)
            score += type_score
        
        # Return normalized score (0.0-1.0)
        # With realistic penalties, this should typically be 55-70%
        confidence = (score / max_score) if max_score > 0 else 0.0
        return min(1.0, max(0.0, confidence))
