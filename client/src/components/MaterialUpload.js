import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_CONFIG from "../config/api";
import { apiClient } from "../services/api";
import { resolveImageAsset, resolveMediaUrl } from "../utils/mediaUrl";
import { parseImageSlotsFromJsonText } from "../utils/materialImageSlots";
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

const htmlSample = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>IELTS Listening Content</title>
  <style>
    .section { display: none; }
    .section.active { display: block; }
  </style>
</head>
<body>
  <section id="part1" class="section active">
    <p>Question <input data-q="1" /></p>
  </section>
</body>
</html>`;

const mergeSlots = (...slotGroups) => {
  const slotsByKey = new Map();

  slotGroups.flat().forEach((slot) => {
    if (!slot?.placeholder_key) return;

    slotsByKey.set(slot.placeholder_key, {
      ...slotsByKey.get(slot.placeholder_key),
      ...slot,
    });
  });

  return Array.from(slotsByKey.values());
};

const MaterialUpload = ({ initialTestId }) => {
  const [activeTab, setActiveTab] = useState("content");
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(initialTestId || "");
  const [materialSets, setMaterialSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [setName, setSetName] = useState("");
  const [contentJson, setContentJson] = useState("");
  const [contentHtmlListening, setContentHtmlListening] = useState("");
  const [contentHtmlReading, setContentHtmlReading] = useState("");
  const [contentHtmlType, setContentHtmlType] = useState("listening");
  const [answerJson, setAnswerJson] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioMeta, setAudioMeta] = useState(null);
  const [savedImageSlots, setSavedImageSlots] = useState([]);
  const [imageAssets, setImageAssets] = useState([]);
  const [imageFiles, setImageFiles] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [uploadingImageKey, setUploadingImageKey] = useState("");
  const [isDeletingSet, setIsDeletingSet] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const detectedImageSlots = useMemo(
    () => parseImageSlotsFromJsonText(contentJson),
    [contentJson]
  );
  const imageSlots = useMemo(
    () => mergeSlots(savedImageSlots, detectedImageSlots),
    [savedImageSlots, detectedImageSlots]
  );
  const imageAssetsByKey = useMemo(
    () =>
      Object.fromEntries(
        (imageAssets || []).map((asset) => [asset.placeholder_key, asset])
      ),
    [imageAssets]
  );
  const contentHtml =
    contentHtmlType === "reading" ? contentHtmlReading : contentHtmlListening;
  const setActiveContentHtml = (value) => {
    if (contentHtmlType === "reading") {
      setContentHtmlReading(value);
    } else {
      setContentHtmlListening(value);
    }
  };

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
      setContentHtmlListening("");
      setContentHtmlReading("");
      setContentHtmlType("listening");
      setAnswerJson("");
      setAudioMeta(null);
      setAudioFile(null);
      setSavedImageSlots([]);
      setImageAssets([]);
      setImageFiles({});
      setUploadingImageKey("");
      return;
    }

    refreshSets(selectedTest);
  }, [selectedTest]);

  useEffect(() => {
    const fetchSetDetails = async () => {
    if (!selectedSetId) {
      setSetName("");
      setContentJson("");
      setContentHtmlListening("");
      setContentHtmlReading("");
      setContentHtmlType("listening");
      setAnswerJson("");
      setAudioMeta(null);
      setAudioFile(null);
      setSavedImageSlots([]);
      setImageAssets([]);
      setImageFiles({});
      setUploadingImageKey("");
      return;
    }

      try {
        const response = await apiClient.get(
          `/api/materials/sets/${selectedSetId}`
        );

        setSetName(response.name || "");
        setSavedImageSlots(response.image_slots || []);
        setImageAssets((response.image_assets || []).map(resolveImageAsset));
        setImageFiles({});

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

        setContentHtmlListening(
          response.content_html_listening ||
            (response.content_html_type === "listening"
              ? response.content_html || ""
              : "")
        );
        setContentHtmlReading(
          response.content_html_reading ||
            (response.content_html_type === "reading"
              ? response.content_html || ""
              : "")
        );
        setContentHtmlType(response.content_html_type || "listening");

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
            url: resolveMediaUrl(response.audio_file_url),
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

  const handleHtmlFile = (file) => {
    if (!file) return;
    clearMessages();

    const isHtmlFile =
      file.type === "text/html" || file.name.toLowerCase().endsWith(".html");

    if (!isHtmlFile) {
      setError("Only HTML files are supported.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setActiveContentHtml(String(reader.result || ""));
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

  const validateHtmlContent = (htmlText) => {
    const trimmed = htmlText.trim();
    if (!trimmed) {
      throw new Error("Content HTML is required.");
    }

    if (!contentHtmlType) {
      throw new Error("Choose whether this HTML is for Listening or Reading.");
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, "text/html");
    if (doc.querySelector("parsererror")) {
      throw new Error("Invalid HTML file.");
    }

    return trimmed;
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
      if (Array.isArray(response.image_slots)) {
        setSavedImageSlots(response.image_slots);
      }
      await refreshSets(selectedTest);
      return response.id;
    }

    const response = await apiClient.put(`/api/materials/sets/${selectedSetId}`, {
      name: setName.trim(),
      ...payload,
    });
    if (Array.isArray(response.image_slots)) {
      setSavedImageSlots(response.image_slots);
    }
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

  const handleSaveHtmlContent = async () => {
    clearMessages();
    if (!contentHtml.trim()) {
      setError("Content HTML is required.");
      return;
    }

    setIsSaving(true);
    try {
      const validatedHtml = validateHtmlContent(contentHtml);
      await upsertSet({
        content_html: validatedHtml,
        content_html_type: contentHtmlType,
      });
      setSuccess("HTML content saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save HTML content.");
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
        url: resolveMediaUrl(response.data.audio_file_url),
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

  const handleImageFileChange = (placeholderKey, file) => {
    setImageFiles((prev) => ({
      ...prev,
      [placeholderKey]: file || null,
    }));
  };

  const handleImageUpload = async (slot) => {
    clearMessages();

    const selectedFile = imageFiles[slot.placeholder_key];
    if (!selectedFile) {
      setError("Select an image file to upload.");
      return;
    }

    setUploadingImageKey(slot.placeholder_key);

    try {
      let targetSetId = selectedSetId;
      const slotExistsOnServer = savedImageSlots.some(
        (savedSlot) => savedSlot.placeholder_key === slot.placeholder_key
      );

      if (!targetSetId || !slotExistsOnServer) {
        if (!contentJson.trim()) {
          throw new Error(
            "Paste and save the content JSON first so image placeholders can be registered."
          );
        }

        validateContent(contentJson);
        targetSetId = String(await upsertSet({ content_json: contentJson }));
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("placeholder_key", slot.placeholder_key);
      formData.append("label", slot.label || slot.placeholder_key);
      formData.append("context_type", slot.context_type || "image");
      formData.append("context_label", slot.context_label || "Test Asset");

      const token = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${API_CONFIG.BASE_URL}/api/materials/sets/${targetSetId}/images`,
        formData,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      setImageAssets((response.data.image_assets || []).map(resolveImageAsset));
      setSavedImageSlots((prev) => mergeSlots(prev, [slot]));
      setImageFiles((prev) => ({
        ...prev,
        [slot.placeholder_key]: null,
      }));
      setSuccess(`${slot.label || slot.placeholder_key} image uploaded successfully.`);
      await refreshSets(selectedTest);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.error ||
          err?.message ||
          "Failed to upload image."
      );
    } finally {
      setUploadingImageKey("");
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
      setContentHtmlListening("");
      setContentHtmlReading("");
      setContentHtmlType("listening");
      setAnswerJson("");
      setAudioMeta(null);
      setAudioFile(null);
      setSavedImageSlots([]);
      setImageAssets([]);
      setImageFiles({});
      setUploadingImageKey("");
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
                      {set.has_listening_html && set.has_reading_html
                        ? " (listening + reading HTML)"
                        : set.has_listening_html
                        ? " (listening HTML)"
                        : set.has_reading_html
                        ? " (reading HTML)"
                        : set.has_html
                        ? ` (${set.content_html_type || "html"} HTML)`
                        : ""}
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
            className={activeTab === "html" ? "active" : ""}
            onClick={() => setActiveTab("html")}
          >
            Content HTML
          </button>
          <button
            type="button"
            className={activeTab === "audio" ? "active" : ""}
            onClick={() => setActiveTab("audio")}
          >
            Audio
          </button>
          <button
            type="button"
            className={activeTab === "images" ? "active" : ""}
            onClick={() => setActiveTab("images")}
          >
            Images
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
                    `client/src/pages`. Dynamic map or task images can be
                    declared with image placeholder keys, then uploaded in the
                    Images tab.
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

          {activeTab === "html" && (
            <div className="material-panel__section">
              <div className="material-panel__row">
                <div>
                  <h3>Content HTML</h3>
                  <p>
                    Upload a ready-made IELTS content page. The test dashboard
                    keeps its timer, navigation, submit flow, and answer
                    checking.
                  </p>
                </div>
                <label className="material-file">
                  Load HTML file
                  <input
                    type="file"
                    accept=".html,text/html"
                    onChange={(e) => handleHtmlFile(e.target.files[0])}
                  />
                </label>
              </div>

              <div className="material-field material-html-type">
                <label htmlFor="html-type">HTML Section</label>
                <select
                  id="html-type"
                  value={contentHtmlType}
                  onChange={(e) => setContentHtmlType(e.target.value)}
                  disabled={!selectedTest}
                >
                  <option value="listening">Listening</option>
                  <option value="reading">Reading</option>
                </select>
              </div>

              <textarea
                value={contentHtml}
                onChange={(e) => setActiveContentHtml(e.target.value)}
                placeholder={htmlSample}
                rows={14}
                disabled={!selectedTest}
              />

              <button
                type="button"
                onClick={handleSaveHtmlContent}
                disabled={!canSave || isSaving}
              >
                {isSaving ? "Saving..." : "Save HTML Content"}
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
                  disabled={!audioFile || isUploadingAudio || !canSave}
                >
                  {isUploadingAudio ? "Uploading..." : "Upload Audio"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "images" && (
            <div className="material-panel__section">
              <div className="material-panel__row">
                <div>
                  <h3>Dynamic Images</h3>
                  <p>
                    Placeholder slots are detected from the current content
                    JSON. Upload map or task images once, and they will be
                    injected into that material set automatically.
                  </p>
                </div>
                <div className="material-image-summary">
                  {imageSlots.length} placeholder{imageSlots.length === 1 ? "" : "s"}
                </div>
              </div>

              {imageSlots.length === 0 ? (
                <div className="material-placeholder">
                  No image placeholders detected yet. Paste content JSON with
                  fields like `image_placeholder_key` or `image_placeholder_keys`
                  to enable image uploads.
                </div>
              ) : (
                <div className="material-image-slots">
                  {imageSlots.map((slot) => {
                    const asset = imageAssetsByKey[slot.placeholder_key];
                    const pendingFile = imageFiles[slot.placeholder_key];
                    const isUploading = uploadingImageKey === slot.placeholder_key;

                    return (
                      <div
                        key={slot.placeholder_key}
                        className="material-image-slot"
                      >
                        <div className="material-image-slot__header">
                          <div>
                            <h4>{slot.label || slot.placeholder_key}</h4>
                            <p>{slot.context_label || "Test Asset"}</p>
                          </div>
                          <span className="material-image-slot__type">
                            {slot.context_type || "image"}
                          </span>
                        </div>

                        <div className="material-image-slot__meta">
                          <span>
                            <strong>Placeholder:</strong> {slot.placeholder_key}
                          </span>
                          <span>
                            <strong>Status:</strong>{" "}
                            {asset ? "Image uploaded" : "Awaiting upload"}
                          </span>
                          {asset?.file_name && (
                            <span>
                              <strong>Current file:</strong> {asset.file_name}
                            </span>
                          )}
                        </div>

                        {asset?.file_url && (
                          <a
                            className="material-image-slot__link"
                            href={asset.file_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open current image
                          </a>
                        )}

                        <div className="material-image-slot__actions">
                          <input
                            type="file"
                            accept="image/*"
                            onClick={(event) => {
                              event.target.value = null;
                            }}
                            onChange={(event) =>
                              handleImageFileChange(
                                slot.placeholder_key,
                                event.target.files?.[0]
                              )
                            }
                            disabled={!selectedTest}
                          />
                          <button
                            type="button"
                            onClick={() => handleImageUpload(slot)}
                            disabled={!pendingFile || isUploading || !canSave}
                          >
                            {isUploading
                              ? "Uploading..."
                              : asset
                              ? "Replace Image"
                              : "Upload Image"}
                          </button>
                        </div>

                        {pendingFile && (
                          <div className="material-image-slot__pending">
                            Ready: {pendingFile.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
