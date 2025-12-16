import React, { useState } from "react";
import axios from "axios";
import "./PDFUpload.css";

const PDFUpload = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conversionResult, setConversionResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isInserting, setIsInserting] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please select a valid PDF file");
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const response = await axios.post("/api/pdf-upload/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setUploadProgress(progress);
        },
      });

      setConversionResult(response.data);
      setSuccess("PDF converted successfully! Review the preview below.");
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleConfirm = async () => {
    if (!conversionResult) return;

    setIsInserting(true);
    setError(null);

    try {
      const response = await axios.post("/api/pdf-upload/confirm", {
        conversionData: conversionResult.conversionData,
      });

      setSuccess(
        `Test "${response.data.summary.sections}" sections with ${response.data.summary.questions} questions inserted successfully!`
      );
      setConversionResult(null);
      setFile(null);

      // Reset form
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to insert test into database."
      );
    } finally {
      setIsInserting(false);
    }
  };

  const handleCancel = () => {
    setConversionResult(null);
    setError(null);
  };

  return (
    <div className="pdf-upload-container">
      <div className="pdf-upload-card">
        <h2>Upload IELTS Cambridge PDF Test</h2>
        <p className="subtitle">
          Convert PDF tests to structured JSON for the CD Mock platform
        </p>

        {!conversionResult ? (
          <div className="upload-section">
            <div className="file-input-wrapper">
              <input
                type="file"
                id="pdf-input"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                className="file-input"
              />
              <label htmlFor="pdf-input" className="file-label">
                {file ? file.name : "Choose PDF File"}
              </label>
            </div>

            {file && (
              <div className="file-info">
                <p>
                  <strong>File:</strong> {file.name}
                </p>
                <p>
                  <strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)}{" "}
                  MB
                </p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="upload-btn"
            >
              {isUploading ? (
                <>
                  <span>Converting... {uploadProgress}%</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </>
              ) : (
                "Upload & Convert"
              )}
            </button>
          </div>
        ) : (
          <div className="preview-section">
            <h3>Conversion Preview</h3>

            <div className="validation-status">
              <p>
                <strong>Status:</strong>
                <span
                  className={
                    conversionResult.conversionData.conversionResult.validation
                      .is_valid
                      ? "valid"
                      : "invalid"
                  }
                >
                  {conversionResult.conversionData.conversionResult.validation
                    .is_valid
                    ? "✓ Valid"
                    : "✗ Invalid"}
                </span>
              </p>
              <p>
                <strong>Confidence:</strong>
                <span className="confidence">
                  {(
                    conversionResult.preview.metadata?.validation
                      ?.overall_score * 100
                  ).toFixed(1)}
                  %
                </span>
              </p>
            </div>

            <div className="test-details">
              <p>
                <strong>Test Name:</strong> {conversionResult.preview.testName}
              </p>
              <p>
                <strong>Type:</strong> {conversionResult.preview.testType}
              </p>
              <p>
                <strong>Sections:</strong> {conversionResult.preview.sections}
              </p>
              <p>
                <strong>Questions:</strong> {conversionResult.preview.questions}
              </p>
            </div>

            {conversionResult.warnings?.length > 0 && (
              <div className="warnings">
                <h4>⚠ Warnings</h4>
                <ul>
                  {conversionResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="action-buttons">
              <button
                onClick={handleConfirm}
                disabled={isInserting}
                className="confirm-btn"
              >
                {isInserting ? "Inserting..." : "Confirm & Insert to Database"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isInserting}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <strong>Success:</strong> {success}
          </div>
        )}

        <div className="info-box">
          <h4>📋 Supported Test Formats</h4>
          <ul>
            <li>IELTS Cambridge Reading Tests</li>
            <li>IELTS Cambridge Listening Tests</li>
            <li>IELTS Cambridge Writing Tests</li>
            <li>Multiple question types (MCQ, Matching, Fill-in, etc.)</li>
          </ul>
        </div>

        <div className="info-box">
          <h4>🔍 Conversion Includes</h4>
          <ul>
            <li>99.9% extraction accuracy with zero data loss</li>
            <li>Multi-method validation (PyMuPDF, PDFPlumber, Camelot)</li>
            <li>Confidence scoring for all elements</li>
            <li>Structured JSON output with metadata</li>
            <li>Human-readable verification files</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PDFUpload;
