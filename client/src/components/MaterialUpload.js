import React, { useState, useCallback } from "react";
import axios from "axios";
import { apiClient } from "../services/api";
import "./MaterialUpload.css";

const MaterialUpload = () => {
  const [activeTab, setActiveTab] = useState("passages"); // passages, answers, audio
  const [selectedTest, setSelectedTest] = useState("");
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [materialName, setMaterialName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadedMaterials, setUploadedMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch tests on component mount
  React.useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    setTestsLoading(true);
    try {
      const response = await apiClient.get("/api/tests");
      console.log("Tests fetched:", response);
      setTests(response);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch tests:", err);
      setError("Failed to load tests. Please refresh the page.");
      setTests([]);
    } finally {
      setTestsLoading(false);
    }
  };

  const fetchMaterials = useCallback(
    async (testId) => {
      setLoading(true);
      try {
        const response = await apiClient.get(
          `/api/materials/test/${testId}?type=${activeTab}`
        );
        setUploadedMaterials(response);
      } catch (err) {
        console.error("Failed to fetch materials:", err);
        setUploadedMaterials([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab]
  );

  // Fetch materials when selected test changes
  React.useEffect(() => {
    if (selectedTest) {
      fetchMaterials(selectedTest);
    }
  }, [selectedTest, activeTab, fetchMaterials]);

  const getAcceptedFileTypes = () => {
    switch (activeTab) {
      case "passages":
        return ".pdf";
      case "answers":
        return ".pdf";
      case "audio":
        return "audio/*";
      default:
        return "";
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Validate file type
      const isValidType = validateFileType(selectedFile);
      if (!isValidType) {
        setError(
          `Invalid file type. Expected ${getAcceptedFileTypes().toUpperCase()}`
        );
        setFile(null);
        return;
      }

      // Validate file size (100MB max)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError("File size exceeds 100MB limit");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const validateFileType = (file) => {
    if (activeTab === "passages" || activeTab === "answers") {
      return file.type === "application/pdf";
    } else if (activeTab === "audio") {
      return file.type.startsWith("audio/");
    }
    return false;
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    if (!selectedTest) {
      setError("Please select a test");
      return;
    }

    if (!materialName.trim()) {
      setError("Please enter a material name");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("test_id", selectedTest);
    formData.append("name", materialName);
    formData.append("type", activeTab);

    try {
      const response = await apiClient.post("/api/materials/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000, // 2 minutes for PDF conversion
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setUploadProgress(progress);
        },
      });

      let successMessage = `Material uploaded successfully!`;

      // Show conversion info if PDF was converted
      if (response.conversion && response.conversion.success) {
        successMessage += ` PDF converted with ${(
          response.conversion.confidence * 100
        ).toFixed(0)}% confidence.`;
      }

      setSuccess(successMessage);
      setFile(null);
      setMaterialName("");
      setUploadProgress(0);

      // Refresh materials list
      fetchMaterials(selectedTest);

      // Clear success message after 5 seconds (longer for conversion info)
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error("Upload error details:", err);
      const errorMsg =
        err?.error || err?.message || "Upload failed. Please try again.";
      setError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      try {
        await apiClient.delete(`/api/materials/${materialId}`);
        setSuccess("Material deleted successfully");
        fetchMaterials(selectedTest);
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.response?.data?.error || "Delete failed");
      }
    }
  };

  const getTabIcon = (tab) => {
    switch (tab) {
      case "passages":
        return "📄";
      case "answers":
        return "✅";
      case "audio":
        return "🎵";
      default:
        return "📦";
    }
  };

  const getTabTitle = (tab) => {
    switch (tab) {
      case "passages":
        return "Reading/Listening Passages";
      case "answers":
        return "Answer Keys";
      case "audio":
        return "Audio Files";
      default:
        return "Materials";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="material-upload-container">
      <div className="material-upload-card">
        <h2>📦 Test Material Upload</h2>
        <p className="subtitle">
          Upload passages, answer keys, and audio files for tests
        </p>

        {/* Tab Navigation */}
        <div className="material-tabs">
          {["passages", "answers", "audio"].map((tab) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {getTabIcon(tab)} {getTabTitle(tab)}
            </button>
          ))}
        </div>

        <div className="material-content">
          {/* Test Selection */}
          <div className="form-group">
            <label htmlFor="test-select">
              Select Test <span className="required">*</span>
            </label>
            {testsLoading ? (
              <div className="loading-spinner">Loading tests...</div>
            ) : tests.length === 0 ? (
              <div className="empty-state">
                <p>No tests available. Create a test first.</p>
              </div>
            ) : (
              <select
                id="test-select"
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                disabled={isUploading}
                className="form-select"
              >
                <option value="">-- Choose a test --</option>
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedTest && (
            <>
              {/* Material Name */}
              <div className="form-group">
                <label>Material Name *</label>
                <input
                  type="text"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder={`e.g., ${
                    activeTab === "passages"
                      ? "Passage 1 - The Future of AI"
                      : activeTab === "answers"
                      ? "Reading Answers"
                      : "Section 1 Audio"
                  }`}
                  disabled={isUploading}
                  className="form-input"
                />
              </div>

              {/* File Upload */}
              <div className="file-upload-section">
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id="material-input"
                    accept={getAcceptedFileTypes()}
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="file-input"
                  />
                  <label htmlFor="material-input" className="file-label">
                    {file
                      ? file.name
                      : `Choose ${
                          activeTab === "audio" ? "Audio" : "PDF"
                        } File`}
                  </label>
                </div>

                {file && (
                  <div className="file-info">
                    <p>
                      <strong>File:</strong> {file.name}
                    </p>
                    <p>
                      <strong>Size:</strong> {formatFileSize(file.size)}
                    </p>
                    <p>
                      <strong>Type:</strong> {file.type}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={
                    !file || !selectedTest || !materialName || isUploading
                  }
                  className="upload-btn"
                >
                  {isUploading ? (
                    <>
                      <span>Uploading... {uploadProgress}%</span>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </>
                  ) : (
                    `Upload ${activeTab === "audio" ? "Audio" : "PDF"} File`
                  )}
                </button>
              </div>

              {/* Messages */}
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              {/* Materials List */}
              <div className="materials-list-section">
                <h3>Uploaded {getTabTitle(activeTab)}</h3>

                {loading ? (
                  <p className="loading-message">Loading materials...</p>
                ) : uploadedMaterials.length > 0 ? (
                  <div className="materials-list">
                    {uploadedMaterials.map((material) => (
                      <div key={material.id} className="material-item">
                        <div className="material-info">
                          <p className="material-name">
                            {getTabIcon(activeTab)} {material.name}
                          </p>
                          <p className="material-meta">
                            Uploaded:{" "}
                            {new Date(
                              material.uploaded_at
                            ).toLocaleDateString()}
                            {material.file_size &&
                              ` • Size: ${formatFileSize(material.file_size)}`}
                          </p>
                        </div>
                        <div className="material-actions">
                          {material.file_url && (
                            <a
                              href={material.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-view"
                              title="Download/View file"
                            >
                              📥 Download
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="btn-delete"
                            title="Delete this material"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-materials">
                    No {getTabTitle(activeTab).toLowerCase()} uploaded yet
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Info Boxes */}
        <div className="info-section">
          <div className="info-box">
            <h4>📋 File Requirements</h4>
            <ul>
              <li>
                <strong>Passages & Answers:</strong> PDF format only
              </li>
              <li>
                <strong>Audio Files:</strong> MP3, WAV, OGG, or M4A format
              </li>
              <li>
                <strong>Max Size:</strong> 100MB per file
              </li>
              <li>
                <strong>Naming:</strong> Clear, descriptive names recommended
              </li>
            </ul>
          </div>

          <div className="info-box">
            <h4>🤖 Automatic PDF Conversion</h4>
            <ul>
              <li>
                <strong>Passages:</strong> Automatically converted to test
                format
              </li>
              <li>
                <strong>Answers:</strong> Stored for reference and grading
              </li>
              <li>
                <strong>Confidence Score:</strong> Shows accuracy of conversion
              </li>
              <li>
                <strong>Background Processing:</strong> No manual work needed
              </li>
            </ul>
          </div>

          <div className="info-box">
            <h4>💡 Best Practices</h4>
            <ul>
              <li>Upload all materials for a test before publishing</li>
              <li>Use consistent naming conventions</li>
              <li>Test audio files for quality before uploading</li>
              <li>Keep PDFs under 50MB for faster loading and conversion</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialUpload;
