# PDF to JSON Conversion System - Implementation Guide

## Quick Start

### 1. Setup Python Environment

```bash
cd server/pdf_converter
pip install -r requirements.txt
```

### 2. Install Node Dependencies

```bash
cd server
npm install multer python-shell uuid
```

### 3. Run Setup Script

```bash
cd server/pdf_converter
node setup.js
```

The setup script will:

- ✓ Verify Python 3.8+ installation
- ✓ Install all Python dependencies
- ✓ Create upload directories
- ✓ Create logs directories
- ✓ Verify all modules are available
- ✓ Test conversion script syntax
- ✓ Create environment configuration

### 4. Start Server

```bash
cd server
npm run dev
```

The server should start on `http://localhost:4000`

## Integration Points

### Frontend Integration

1. **Import PDF Upload Component**

```javascript
import PDFUpload from "./components/PDFUpload";

function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <PDFUpload />
    </div>
  );
}
```

2. **Add to Admin Route**

In your admin pages, add the PDFUpload component to test management section.

### Backend Integration

The server already includes:

- `POST /api/pdf-upload/upload` - Upload and convert PDF
- `POST /api/pdf-upload/confirm` - Insert to database
- Proper authentication middleware
- File upload handling
- Database insertion logic

## Complete Workflow

### Step 1: PDF Upload

```
User uploads PDF → Client sends to /api/pdf-upload/upload
```

### Step 2: Conversion

```
Python converter processes PDF using hybrid pipeline:
1. PyMuPDF extracts text with positional metadata
2. PDFPlumber validates extraction
3. Camelot extracts tables
4. IELTS-specific parsing identifies sections and questions
5. Cross-validation ensures accuracy
6. Returns JSON preview
```

### Step 3: Confirmation

```
Admin reviews preview → Confirms insertion
→ Database records created
→ File cleanup
→ Success response
```

## API Usage Examples

### Upload PDF

```bash
curl -X POST http://localhost:4000/api/pdf-upload/upload \
  -H "Authorization: Bearer <token>" \
  -F "pdf=@test.pdf"
```

**Response:**

```json
{
  "success": true,
  "preview": {
    "testName": "IELTS Reading Test 1",
    "testType": "reading",
    "sections": 3,
    "questions": 40
  },
  "conversionData": {...}
}
```

### Confirm and Insert

```bash
curl -X POST http://localhost:4000/api/pdf-upload/confirm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"conversionData": {...}}'
```

**Response:**

```json
{
  "success": true,
  "testId": 42,
  "summary": {
    "sections": 3,
    "questions": 40,
    "answers": 160
  }
}
```

## Python Module Reference

### IELTSPDFConverter

Main converter class for PDF to JSON conversion.

```python
from pdf_converter import IELTSPDFConverter, convert_pdf_to_json

# Direct usage
converter = IELTSPDFConverter("path/to/test.pdf")
result = converter.convert()

# Or using convenience function
result = convert_pdf_to_json("path/to/test.pdf", output_path="output.json")
```

**Methods:**

- `convert()` - Execute full conversion pipeline
- `extract_with_pymupdf()` - Extract with PyMuPDF
- `extract_with_pdfplumber()` - Extract with PDFPlumber
- `extract_with_camelot()` - Extract tables
- `parse_ielts_structure()` - Parse IELTS format
- `validate_extraction()` - Cross-validate results

### IELTSJSONValidator

Validates JSON structure and integrity.

```python
from pdf_converter import validate_and_normalize_json

json_data = {...}
is_valid, normalized, errors, warnings = validate_and_normalize_json(json_data)

if is_valid:
    print("JSON is valid and ready for database insertion")
else:
    print(f"Errors: {errors}")
    print(f"Warnings: {warnings}")
```

## Database Schema

The conversion system works with the existing schema:

```
Tests → Sections → Questions → Answers
         ↓         ↓          ↓
       TYPE    QUESTION_TEXT  ANSWER_TEXT
       ORDER   QUESTION_TYPE  IS_CORRECT
```

## Error Handling

### Common Issues

**1. Python Not Found**

```
Error: Python not found
Solution: Install Python 3.8+ and add to PATH
```

**2. Missing Dependencies**

```
Error: ModuleNotFoundError: No module named 'fitz'
Solution: Run: pip install -r requirements.txt
```

**3. PDF Conversion Failed**

```
Error: PDF conversion validation failed
Solution: Check validation.errors in response
```

**4. Database Insertion Failed**

```
Error: Failed to insert test into database
Solution: Verify database connection and schema
```

## Configuration

### Environment Variables (`.env`)

```env
# File Upload
PDF_UPLOAD_DIR=./uploads/pdfs
PDF_MAX_SIZE=52428800  # 50MB

# Python
PYTHON_PATH=python3

# Conversion
CONVERSION_TIMEOUT=300

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cd_mock

# Server
PORT=4000
NODE_ENV=development
```

## Testing

### Test PDF Structure

For testing, ensure your PDF has:

- Clear section headers (Reading Passage 1, Section 1, etc.)
- Numbered questions (Question 1, 2, 3, etc.)
- Question options (A, B, C, D for multiple choice)
- Proper formatting and layout

### Manual Testing

1. **Test Conversion Directly**

```python
python -m pdf_converter.ielts_pdf_converter test.pdf output.json
```

2. **Test Validation**

```python
from pdf_converter import validate_and_normalize_json
result = validate_and_normalize_json(json_data)
```

3. **Test Upload via API**

```bash
curl -X POST http://localhost:4000/api/pdf-upload/upload \
  -H "Authorization: Bearer <token>" \
  -F "pdf=@cambridge_test.pdf"
```

## Performance Optimization

### For Large PDFs (20+ pages)

1. Increase timeout in `.env`:

```env
CONVERSION_TIMEOUT=600  # 10 minutes
```

2. Monitor memory usage:

```bash
# Linux/Mac
ps aux | grep python

# Windows
tasklist | findstr python
```

### Caching Extraction Results

Results are cached in `/uploads/pdfs` until confirmed:

```
/uploads/pdfs/
├── 1702614600000_uuid_test1.pdf
├── 1702614601000_uuid_test2.pdf
└── ...
```

Files are automatically deleted after confirmation or 24 hours.

## Troubleshooting

### Check System Requirements

```bash
# Python version
python --version  # Should be 3.8+

# Required packages
pip list | grep -E "PyMuPDF|pdfplumber|camelot|pandas"

# Node modules
npm list multer python-shell uuid
```

### Enable Debug Logging

In Python converter:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Test Conversion Directly

```bash
cd server/pdf_converter
python node_interface.py /path/to/test.pdf
```

This should output JSON conversion result.

## Security Considerations

1. **File Upload Validation**

   - Only PDF files accepted
   - File size limit: 50MB
   - Stored in protected directory

2. **Authentication**

   - Only admins can upload tests
   - All endpoints require auth middleware
   - Token validation on every request

3. **Data Protection**
   - Temporary files cleaned up after use
   - Database transactions for atomicity
   - Input validation before insertion

## Next Steps

1. ✓ Test PDF conversion with sample IELTS test
2. ✓ Verify database integration
3. ✓ Add PDF upload to admin dashboard
4. ✓ Test with multiple PDF formats
5. ✓ Set up automated backups
6. ✓ Monitor conversion accuracy metrics

## Support & Maintenance

### Logs Location

```
server/pdf_converter/logs/conversion.log
```

### Common Log Messages

```
[INFO] Extracting with PyMuPDF...
[INFO] Validating with PDFPlumber...
[INFO] Extracting tables with Camelot...
[INFO] Parsing IELTS structure...
[INFO] Performing cross-validation...
[INFO] Conversion completed successfully
```

### Updating Dependencies

```bash
cd server/pdf_converter
pip install --upgrade -r requirements.txt
```

## Questions?

Refer to:

- [PDF Converter README](./README.md) - Complete documentation
- [Python Modules](./ielts_pdf_converter.py) - Source code
- [API Routes](../routes/pdf-upload.js) - Endpoint implementation
