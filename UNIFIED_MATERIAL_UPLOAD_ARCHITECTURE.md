# Unified Material Upload with Automatic PDF Conversion

## Architecture Update

The system has been refactored to consolidate PDF-to-JSON conversion with material uploads into a single, seamless workflow.

### Previous Architecture (Two Separate Sections)

❌ **PDF Upload Tab** - Convert PDF to JSON manually  
❌ **Materials Upload Tab** - Upload test materials separately  
❌ Requires users to manage two different workflows  
❌ Conversion results not integrated with test materials

### New Architecture (Unified Workflow)

✅ **Single Materials Upload Section** - All materials in one place  
✅ **Automatic PDF Conversion** - Runs silently in background when PDFs uploaded  
✅ **Zero Manual Steps** - Admin uploads file, system handles conversion  
✅ **Full Integration** - Converted test data automatically saved to database

## Workflow

```
Admin uploads PDF passage
    ↓
Multer saves file to disk
    ↓
Python conversion triggered via python-shell
    ↓
IELTSPDFConverter extracts test data
    ↓
Confidence score calculated
    ↓
Test data inserted to database (if passages)
    ↓
Material record created
    ↓
Response shows conversion confidence
    ↓
Passage ready to use in tests
```

## Component Changes

### Frontend Changes

**AdminDashboard.js**

- ❌ Removed: PDFUpload component import
- ❌ Removed: "pdf-upload" tab button
- ❌ Removed: "Convert PDF to Test" UI section
- ✅ Kept: Single "Upload Materials" tab with all functionality

**MaterialUpload.js (Enhanced)**

- ✅ Fixed: All ESLint warnings (unused variables, dependencies)
- ✅ Added: Conversion confidence display in success message
- ✅ Added: "Automatic PDF Conversion" info box
- ✅ Updated: Handles response.data.conversion object from API
- ✅ Extended: Success message timeout to 5 seconds for conversion info

### Backend Changes

**materials.js (Updated Route)**

```javascript
POST /api/materials/upload
├── Multer file validation
├── Check admin permissions
├── IF (type === "passages" OR "answers")
│   └── Call Python conversion via PythonShell
│       ├── Invoke node_interface.py
│       └── Wait for JSON + confidence result
├── IF (conversion successful AND type === "passages")
│   └── Insert converted test data to database
├── Insert material record
└── Return response with:
    ├── Material info
    ├── Conversion status
    └── Confidence score
```

**server/index.js (Added)**

```javascript
// Serve uploaded materials as static files
app.use("/uploads", express.static("uploads"));
```

**Python Modules (Updated)**

`node_interface.py`

- Improved convert_pdf() function
- Returns confidence score (0-1.0)
- Includes conversion success status
- Proper error handling and messaging

`ielts_pdf_converter.py` (Restored)

- Multi-method extraction (PyMuPDF, PDFPlumber, Camelot)
- IELTS-specific parsing with 10+ question types
- Confidence scoring with 4 weighted factors:
  - Pattern matching (25%)
  - Position consistency (30%)
  - Cross-validation (25%)
  - Formatting quality (20%)

## Database Flow

### When Passage (PDF) Uploaded:

1. File saved to `server/uploads/materials/`
2. PDF converted to structured JSON
3. Test data inserted into `tests` table
4. Sections, questions, answers inserted
5. Material record created in `test_materials`
6. File URL stored for future downloads

### When Answer Key (PDF) Uploaded:

1. File saved to `server/uploads/materials/`
2. PDF converted (but test insertion skipped)
3. Material record created for reference
4. Stored for answer verification and grading

### When Audio Uploaded:

1. File saved to `server/uploads/materials/`
2. No conversion (audio stays as-is)
3. Material record created
4. Ready for playback in listening tests

## API Response Example

```json
{
  "success": true,
  "message": "Material uploaded successfully and PDF converted to test format",
  "material": {
    "id": 42,
    "test_id": 5,
    "name": "Cambridge IELTS 14 Passage 1",
    "type": "passages",
    "file_url": "/uploads/materials/1702580123456_abc-def-123_passage.pdf",
    "file_size": 1245780,
    "uploaded_at": "2025-12-14T..."
  },
  "conversion": {
    "success": true,
    "confidence": 0.947,
    "message": "PDF converted successfully (confidence: 94.7%)"
  }
}
```

## Benefits

| Aspect                 | Before                          | After                 |
| ---------------------- | ------------------------------- | --------------------- |
| **UI Tabs**            | 2 separate sections             | 1 unified section     |
| **Conversion**         | Manual, separate step           | Automatic, background |
| **Integration**        | Manual database entry           | Automatic insertion   |
| **Admin Workflow**     | Upload → Convert → Upload again | Upload once           |
| **Data Ready**         | After manual processing         | Immediately           |
| **Confidence Visible** | No feedback                     | Shows in UI           |
| **File Organization**  | Scattered approach              | Centralized materials |

## Implementation Details

### Removed Files

- PDFUpload component (functionality moved to materials route)
- pdf-upload tab from AdminDashboard

### Modified Files

- `client/src/pages/AdminDashboard.js` - Removed pdf-upload tab and PDFUpload import
- `client/src/components/MaterialUpload.js` - Enhanced with conversion display
- `server/routes/materials.js` - Added automatic PDF conversion
- `server/index.js` - Added static file serving
- `server/pdf_converter/node_interface.py` - Enhanced conversion handler

### Restored Files

- `server/pdf_converter/ielts_pdf_converter.py` - Multi-method PDF converter

## Testing Checklist

- [ ] Admin can access Material Upload tab (only one tab exists)
- [ ] Can select test from dropdown
- [ ] Can upload PDF passage file
- [ ] Backend converts PDF automatically
- [ ] Conversion confidence displayed in success message
- [ ] Material appears in materials list
- [ ] Can download/view uploaded material
- [ ] Can upload audio file separately
- [ ] Can upload answer key PDF
- [ ] Database shows material records
- [ ] Test data inserted for passage files
- [ ] No errors in browser console
- [ ] No errors in server console

## Configuration

### File Storage

```
server/
└── uploads/
    └── materials/
        ├── <timestamp>_<uuid>_<filename>.pdf
        ├── <timestamp>_<uuid>_<filename>.mp3
        └── ...
```

### File Serving

```
Frontend Request:  /uploads/materials/file.pdf
→ Express static server
→ Returns file from disk
```

### Environment Requirements

- Python 3.8+ with PyMuPDF, PDFPlumber, Camelot
- Node.js with python-shell module
- MySQL database with test_materials table
- Disk space for material uploads

## Future Enhancements

1. **Progress Tracking** - Real-time conversion status for large PDFs
2. **Batch Upload** - Upload multiple materials at once
3. **Preview** - Show extracted test structure before saving
4. **Retry Logic** - Automatic retry for failed conversions
5. **Compression** - Auto-compress PDFs before processing
6. **Validation UI** - Show conversion confidence and issues
7. **Streaming** - Stream large audio files during playback

---

**Status:** ✅ Complete  
**Date:** December 14, 2025  
**Version:** 1.0.0
