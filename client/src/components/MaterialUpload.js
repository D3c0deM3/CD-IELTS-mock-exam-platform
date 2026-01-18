import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_CONFIG from "../config/api";
import { apiClient } from "../services/api";
import "./MaterialUpload.css";

const contentSample = `{
  "metadata": {
    "source": "mock_2.pdf",
    "test_type": "IELTS Academic"
  },
  "test_info": {
    "title": "IELTS Academic Practice Test",
    "total_questions": 82
  },
  "sections": [
    {
      "type": "listening",
      "section_number": 1,
      "parts": []
    },
    {
      "type": "reading",
      "section_number": 1,
      "passages": []
    },
    {
      "title": "Writing",
      "tasks": []
    }
  ]
}`;

const answersSample = `{
  "test": "Authentic test 1",
  "answers": {
    "listening": [
      { "question": 1, "answer": "Freezer" }
    ],
    "reading": [
      { "question": 1, "answer": "NG" }
    ]
  }
}`;

const MaterialUpload = () => {
  const [activeTab, setActiveTab] = useState("content");
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState("");
  const [materialSets, setMaterialSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [setName, setSetName] = useState("");
  const [contentJson, setContentJson] = useState("");
  const [answerJson, setAnswerJson] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioMeta, setAudioMeta] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isDeletingSet, setIsDeletingSet] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshSets = async (testId) => {
    if (!testId) return;
    setSetsLoading(true);
    try {
      const response = await apiClient.get(
        `/api/materials/sets?test_id=${testId}`
      );
      setMaterialSets(response);
    } catch (err) {
      setMaterialSets([]);
    } finally {
      setSetsLoading(false);
    }
  };

  useEffect(() => {
    const fetchTests = async () => {
      setTestsLoading(true);
      try {
        const response = await apiClient.get("/api/tests");
        setTests(response);
      } catch (err) {
        setError("Failed to load tests.");
        setTests([]);
      } finally {
        setTestsLoading(false);
      }
    };

    fetchTests();
  }, []);

  useEffect(() => {
    if (!selectedTest) {
      setMaterialSets([]);
      setSelectedSetId("");
      setSetName("");
      setContentJson("");
      setAnswerJson("");
      setAudioMeta(null);
      setAudioFile(null);
      return;
    }

    refreshSets(selectedTest);
  }, [selectedTest]);

  useEffect(() => {
    const fetchSetDetails = async () => {
    if (!selectedSetId) {
      setSetName("");
      setContentJson("");
      setAnswerJson("");
      setAudioMeta(null);
      setAudioFile(null);
      return;
    }

      try {
        const response = await apiClient.get(
          `/api/materials/sets/${selectedSetId}`
        );

        setSetName(response.name || "");

        if (response.content_json) {
          try {
            const parsed = JSON.parse(response.content_json);
            setContentJson(JSON.stringify(parsed, null, 2));
          } catch {
            setContentJson(response.content_json);
          }
        } else {
          setContentJson("");
        }

        if (response.answer_key_json) {
          try {
            const parsed = JSON.parse(response.answer_key_json);
            setAnswerJson(JSON.stringify(parsed, null, 2));
          } catch {
            setAnswerJson(response.answer_key_json);
          }
        } else {
          setAnswerJson("");
        }

        if (response.audio_file_url) {
          setAudioMeta({
            name: response.audio_file_name,
            url: response.audio_file_url,
            size: response.audio_file_size,
          });
        } else {
          setAudioMeta(null);
        }
      } catch (err) {
        setError("Failed to load material set details.");
      }
    };

    fetchSetDetails();
  }, [selectedSetId]);

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleJsonFile = (file, setter) => {
    if (!file) return;
    clearMessages();

    if (file.type !== "application/json") {
      setError("Only JSON files are supported.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setter(JSON.stringify(parsed, null, 2));
      } catch (err) {
        setError("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const validateContent = (jsonText) => {
    const parsed = JSON.parse(jsonText);
    const hasSections = Array.isArray(parsed.sections);
    const hasTestInfo = parsed.test_info && parsed.test_info.title;
    if (!hasSections || !hasTestInfo) {
      throw new Error(
        "Content JSON must include test_info and sections arrays."
      );
    }
    return parsed;
  };

  const validateAnswers = (jsonText) => {
    const parsed = JSON.parse(jsonText);
    const hasListening = Array.isArray(parsed?.answers?.listening);
    const hasReading = Array.isArray(parsed?.answers?.reading);
    if (!hasListening || !hasReading) {
      throw new Error("Answer JSON must include answers.listening/reading.");
    }
    return parsed;
  };

  const upsertSet = async (payload) => {
    if (!selectedTest) {
      throw new Error("Select a test before saving materials.");
    }

    if (!setName.trim()) {
      throw new Error("Set name is required.");
    }

    if (!selectedSetId) {
      const response = await apiClient.post("/api/materials/sets", {
        test_id: selectedTest,
        name: setName.trim(),
        ...payload,
      });
      setSelectedSetId(String(response.id));
      await refreshSets(selectedTest);
      return response.id;
    }

    await apiClient.put(`/api/materials/sets/${selectedSetId}`, {
      name: setName.trim(),
      ...payload,
    });
    await refreshSets(selectedTest);
    return selectedSetId;
  };

  const handleSaveContent = async () => {
    clearMessages();
    if (!contentJson.trim()) {
      setError("Content JSON is required.");
      return;
    }

    setIsSaving(true);
    try {
      validateContent(contentJson);
      await upsertSet({ content_json: contentJson });
      setSuccess("Content saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save content.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnswers = async () => {
    clearMessages();
    if (!answerJson.trim()) {
      setError("Answer key JSON is required.");
      return;
    }

    setIsSaving(true);
    try {
      validateAnswers(answerJson);
      await upsertSet({ answer_key_json: answerJson });
      setSuccess("Answer keys saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save answer keys.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAudioUpload = async () => {
    clearMessages();
    if (!audioFile) {
      setError("Select an audio file to upload.");
      return;
    }

    setIsUploadingAudio(true);
    try {
      let targetSetId = selectedSetId;

      if (!targetSetId) {
        if (!canSave) {
          setError("Select a test and provide a set name before uploading.");
          setIsUploadingAudio(false);
          return;
        }
        targetSetId = String(await upsertSet({}));
      }

      const formData = new FormData();
      formData.append("file", audioFile);
      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/materials/sets/${targetSetId}/audio`,
        formData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      setAudioMeta({
        name: response.data.audio_file_name,
        url: response.data.audio_file_url,
        size: response.data.audio_file_size,
      });
      setAudioFile(null);
      setSuccess("Audio uploaded successfully.");
      await refreshSets(selectedTest);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.error ||
          err?.message ||
          "Failed to upload audio."
      );
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!selectedSetId) return;
    if (
      !window.confirm(
        "Delete this material set and all tied material files (including audio)?"
      )
    )
      return;

    clearMessages();
    setIsDeletingSet(true);
    try {
      await apiClient.delete(`/api/materials/sets/${selectedSetId}`);
      setSuccess("Material set and files deleted.");
      setSelectedSetId("");
      setSetName("");
      setContentJson("");
      setAnswerJson("");
      setAudioMeta(null);
      setAudioFile(null);
      await refreshSets(selectedTest);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.error ||
          err?.message ||
          "Failed to delete material set."
      );
    } finally {
      setIsDeletingSet(false);
    }
  };

  const canSave = useMemo(
    () => selectedTest && setName.trim().length > 0,
    [selectedTest, setName]
  );

  return (
    <div className="material-upload">
      <div className="material-upload__card">
        <div className="material-upload__header">
          <div>
            <h2>Material Upload</h2>
            <p>
              Store test content and answer keys in the database. Audio files are
              saved on disk.
            </p>
          </div>
        </div>

        <div className="material-upload__setup">
          <div className="material-field">
            <label htmlFor="test-select">Test</label>
            {testsLoading ? (
              <div className="material-placeholder">Loading tests...</div>
            ) : (
              <select
                id="test-select"
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
              >
                <option value="">Select a test</option>
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="material-field">
            <label htmlFor="set-select">Material Set</label>
            <div className="material-set-row">
              {setsLoading ? (
                <div className="material-placeholder">Loading sets...</div>
              ) : (
                <select
                  id="set-select"
                  value={selectedSetId}
                  onChange={(e) => setSelectedSetId(e.target.value)}
                  disabled={!selectedTest}
                >
                  <option value="">Create new set</option>
                  {materialSets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="material-delete"
                onClick={handleDeleteSet}
                disabled={!selectedSetId || isDeletingSet}
              >
                {isDeletingSet ? "Deleting..." : "Delete Set & Files"}
              </button>
            </div>
          </div>

          <div className="material-field">
            <label htmlFor="set-name">Set Name</label>
            <input
              id="set-name"
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="e.g., Mock 4 - IELTS Academic"
              disabled={!selectedTest}
            />
          </div>
        </div>

        <div className="material-tabs">
          <button
            type="button"
            className={activeTab === "content" ? "active" : ""}
            onClick={() => setActiveTab("content")}
          >
            Content JSON
          </button>
          <button
            type="button"
            className={activeTab === "answers" ? "active" : ""}
            onClick={() => setActiveTab("answers")}
          >
            Answer Keys JSON
          </button>
          <button
            type="button"
            className={activeTab === "audio" ? "active" : ""}
            onClick={() => setActiveTab("audio")}
          >
            Audio
          </button>
        </div>

        <div className="material-panel">
          {activeTab === "content" && (
            <div className="material-panel__section">
              <div className="material-panel__row">
                <div>
                  <h3>Content JSON</h3>
                  <p>
                    Use the same structure as the existing mock JSON files in
                    `client/src/pages`.
                  </p>
                </div>
                <label className="material-file">
                  Load JSON file
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) =>
                      handleJsonFile(e.target.files[0], setContentJson)
                    }
                  />
                </label>
              </div>

              <textarea
                value={contentJson}
                onChange={(e) => setContentJson(e.target.value)}
                placeholder={contentSample}
                rows={14}
                disabled={!selectedTest}
              />

              <button
                type="button"
                onClick={handleSaveContent}
                disabled={!canSave || isSaving}
              >
                {isSaving ? "Saving..." : "Save Content"}
              </button>
            </div>
          )}

          {activeTab === "answers" && (
            <div className="material-panel__section">
              <div className="material-panel__row">
                <div>
                  <h3>Answer Keys JSON</h3>
                  <p>
                    Matches the current `answers.json` format used for scoring.
                  </p>
                </div>
                <label className="material-file">
                  Load JSON file
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) =>
                      handleJsonFile(e.target.files[0], setAnswerJson)
                    }
                  />
                </label>
              </div>

              <textarea
                value={answerJson}
                onChange={(e) => setAnswerJson(e.target.value)}
                placeholder={answersSample}
                rows={12}
                disabled={!selectedTest}
              />

              <button
                type="button"
                onClick={handleSaveAnswers}
                disabled={!canSave || isSaving}
              >
                {isSaving ? "Saving..." : "Save Answer Keys"}
              </button>
            </div>
          )}

          {activeTab === "audio" && (
            <div className="material-panel__section">
              <div>
                <h3>Listening Audio</h3>
                <p>Upload MP3, WAV, OGG, or M4A files.</p>
              </div>

              {audioMeta && (
                <div className="material-audio-meta">
                  <span>{audioMeta.name}</span>
                  <span>
                    {audioMeta.size
                      ? `${Math.round(audioMeta.size / 1024)} KB`
                      : ""}
                  </span>
                  {audioMeta.url && (
                    <a href={audioMeta.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                </div>
              )}

              <div className="material-audio-input">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files[0])}
                  disabled={!selectedTest}
                />
                <button
                  type="button"
                  onClick={handleAudioUpload}
                  disabled={!audioFile || isUploadingAudio || !selectedSetId}
                >
                  {isUploadingAudio ? "Uploading..." : "Upload Audio"}
                </button>
              </div>
            </div>
          )}
        </div>

        {(error || success) && (
          <div className={`material-message ${error ? "error" : "success"}`}>
            {error || success}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialUpload;
