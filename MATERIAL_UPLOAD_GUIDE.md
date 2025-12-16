# Test Material Upload Feature

## Overview

The Material Upload feature allows admins to upload and manage test materials including:
- **Passages** - PDF documents containing reading/listening passages
- **Answer Keys** - PDF documents with answer keys and explanations
- **Audio Files** - MP3, WAV, OGG, or M4A audio files for listening sections

## Features

### File Management
✅ Upload materials for specific tests  
✅ Support for multiple file formats  
✅ File size validation (100MB max)  
✅ Download/view uploaded materials  
✅ Delete materials with confirmation  

### User Interface
✅ Three-tab interface (Passages, Answers, Audio)  
✅ Test selection dropdown  
✅ Material naming system  
✅ Upload progress tracking  
✅ Materials list with metadata  
✅ Responsive design  

### Security
✅ Admin-only access  
✅ Authentication required  
✅ File type validation  
✅ File size limits  

## How to Use

### Step 1: Navigate to Materials Upload
1. Go to Admin Dashboard
2. Click "📦 Upload Materials" tab

### Step 2: Select a Test
1. Choose a test from the dropdown
2. Available tests will load automatically

### Step 3: Choose Material Type
Select one of the three tabs:
- **📄 Reading/Listening Passages** - PDF passages
- **✅ Answer Keys** - PDF answer sheets
- **🎵 Audio Files** - Audio recordings

### Step 4: Upload Material
1. Enter a descriptive material name
2. Click "Choose PDF/Audio File"
3. Select file from your computer
4. Click "Upload PDF/Audio File"

### Step 5: View/Delete Materials
- **Download** - Click the download button to view/save
- **Delete** - Click delete to remove material (with confirmation)

## API Endpoints

### Upload Material
```
POST /api/materials/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: <file>
- test_id: <number>
- name: <string>
- type: "passages" | "answers" | "audio"
```

### Get Materials for Test
```
GET /api/materials/test/:testId?type=passages
Authorization: Bearer <token>

Response:
[
  {
    id: 1,
    test_id: 1,
    material_type: "passages",
    file_name: "Passage 1",
    file_url: "/uploads/materials/...",
    file_size: 1024000,
    uploaded_at: "2025-12-14T..."
  }
]
```

### Delete Material
```
DELETE /api/materials/:materialId
Authorization: Bearer <token>
```

### Get Material Statistics
```
GET /api/materials/stats/test/:testId
Authorization: Bearer <token>

Response:
[
  {
    material_type: "passages",
    count: 3,
    total_size: 5242880
  }
]
```

## Database Schema

### test_materials Table
```sql
CREATE TABLE test_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  test_id INT NOT NULL,
  material_type ENUM('passages', 'answers', 'audio'),
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_url VARCHAR(500),
  file_size BIGINT,
  uploaded_by INT NOT NULL,
  uploaded_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (test_id) REFERENCES tests(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  KEY idx_test_type (test_id, material_type)
)
```

## File Storage

Materials are stored in:
```
server/uploads/materials/
├── <timestamp>_<uuid>_<originalname>
├── <timestamp>_<uuid>_<originalname>
└── ...
```

Files are served at:
```
/uploads/materials/<filename>
```

## Validation

### PDF Files (Passages & Answers)
- ✅ MIME type: `application/pdf`
- ✅ Max size: 100MB
- ✅ Required naming

### Audio Files
- ✅ Types: MP3, WAV, OGG, M4A
- ✅ Max size: 100MB
- ✅ Required naming

## Best Practices

1. **Naming Conventions**
   - Use descriptive names: "Passage 1 - The Future of AI"
   - Include section number: "Section 1 Audio"
   - Keep names under 100 characters

2. **File Organization**
   - Upload all materials before publishing test
   - Group by test type (Reading, Listening, Writing)
   - Verify audio quality before uploading

3. **File Sizes**
   - Keep PDFs under 50MB for faster loading
   - Compress audio if over 20MB
   - Test loading speeds before publication

4. **Quality Assurance**
   - Check PDF readability
   - Test audio playback
   - Verify all pages/sections present

## Troubleshooting

### Upload Fails
**Error: "Invalid file type"**
- Ensure file is correct format (PDF or audio)
- Check file extension matches content

**Error: "File size exceeds limit"**
- Compress PDF or audio file
- Maximum allowed: 100MB

### File Not Accessible
**Issue: Cannot download material**
- Check server is running
- Verify file exists in uploads/materials/
- Check file permissions

### Missing Materials
**Issue: Materials not showing in list**
- Ensure test is selected
- Try refreshing page
- Check browser console for errors

## Integration with Tests

Materials are linked to tests via `test_id`. To use materials in a test:

1. Create test in Tests tab
2. Upload corresponding materials
3. Materials automatically available for test users
4. Audio/PDFs load during test

## Admin Permissions

Only users with `admin` role can:
- ✅ Upload materials
- ✅ Delete materials
- ✅ View all materials
- ✅ Download materials

## File Limits

- **Maximum file size**: 100MB per file
- **Supported formats**:
  - PDF: All PDF versions
  - Audio: MP3, WAV, OGG, M4A
- **Storage**: Unlimited (based on server disk)

## Performance

- Average upload time: 2-10 seconds (20MB file)
- Concurrent uploads: Limited by server resources
- Download speed: Depends on file size and connection

## Support

For issues with material uploads:
1. Check file format and size
2. Verify admin permissions
3. Check server logs
4. Try refreshing page

---

**Last Updated:** December 14, 2025  
**Version:** 1.0.0  
**Status:** Production Ready
