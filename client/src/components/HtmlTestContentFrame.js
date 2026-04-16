import React, { useCallback, useEffect, useRef } from "react";
import "./HtmlTestContentFrame.css";

const PART_SELECTOR = "section[id^='part'], .section, [data-part], [data-part-number]";
const ANSWER_SELECTOR = "input, textarea, select";

const parseQuestionRange = (value) => {
  const match = String(value || "").match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (!match) return null;

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const low = Math.min(start, end);
  const high = Math.max(start, end);
  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
};

const extractQuestionId = (element) => {
  const directValue =
    element.dataset?.q ||
    element.dataset?.answer ||
    element.dataset?.question ||
    element.dataset?.questionId ||
    element.getAttribute("aria-label") ||
    element.name ||
    element.id;

  const range = parseQuestionRange(directValue);
  if (range) return null;

  const match = String(directValue || "").match(/(?:^|[^\d])(\d{1,2})(?:$|[^\d])/);
  if (!match) return null;

  const questionId = Number.parseInt(match[1], 10);
  return Number.isFinite(questionId) ? questionId : null;
};

const getRangeValue = (element) =>
  element.dataset?.q ||
  element.dataset?.answer ||
  element.dataset?.questionRange ||
  element.getAttribute("data-question-range");

const getElementValue = (element) => {
  if (element.type === "radio") {
    return element.checked ? element.value : "";
  }

  if (element.type === "checkbox") {
    return element.checked ? element.value || "checked" : "";
  }

  return element.value || "";
};

const getNodePartLabel = (node, index, sectionType) =>
  node.dataset?.partLabel ||
  node.getAttribute("aria-label") ||
  node.querySelector("h1,h2,h3")?.textContent?.trim() ||
  `${sectionType === "reading" ? "Passage" : "Part"} ${index + 1}`;

const buildPartGroups = (doc, sectionType) => {
  const passageElements = Array.from(doc.querySelectorAll("[data-passage]"));
  const passageValues = [
    ...new Set(
      passageElements
        .map((element) => element.dataset?.passage)
        .filter(Boolean)
    ),
  ].sort((a, b) => Number(a) - Number(b));

  if (passageValues.length > 0) {
    return passageValues.map((value, index) => {
      const nodes = passageElements.filter(
        (element) => element.dataset?.passage === value
      );
      const labelNode =
        nodes.find((node) => node.matches("article,.passage,[data-passage-title]")) ||
        nodes[0];
      const partNumber = Number.parseInt(value, 10);

      return {
        nodes,
        part_number: Number.isFinite(partNumber) ? partNumber : index + 1,
        label:
          getNodePartLabel(labelNode, index, sectionType) ||
          `${sectionType === "reading" ? "Passage" : "Part"} ${index + 1}`,
      };
    });
  }

  const detectedParts = Array.from(doc.querySelectorAll(PART_SELECTOR));
  if (detectedParts.length > 0) {
    return detectedParts.map((node, index) => ({
      nodes: [node],
      part_number:
        Number.parseInt(
          node.dataset?.part || node.dataset?.partNumber || "",
          10
        ) || index + 1,
      label: getNodePartLabel(node, index, sectionType),
    }));
  }

  return [
    {
      nodes: [doc.body],
      part_number: 1,
      label: `${sectionType === "reading" ? "Passage" : "Part"} 1`,
    },
  ];
};

const HtmlTestContentFrame = ({
  html,
  sectionType,
  currentPartIndex,
  answers,
  onAnswersChange,
  onPartsChange,
}) => {
  const iframeRef = useRef(null);
  const docRef = useRef(null);
  const partsRef = useRef([]);
  const questionIdsRef = useRef([]);

  const collectQuestionIds = useCallback((doc) => {
    const ids = new Set();

    doc.querySelectorAll(ANSWER_SELECTOR).forEach((element) => {
      const range = parseQuestionRange(getRangeValue(element));
      if (range) {
        range.forEach((id) => ids.add(id));
        return;
      }

      const questionId = extractQuestionId(element);
      if (questionId) ids.add(questionId);
    });

    questionIdsRef.current = Array.from(ids).sort((a, b) => a - b);
    return questionIdsRef.current;
  }, []);

  const collectAnswers = useCallback((doc) => {
    const nextAnswers = {};
    const rangeGroups = new Map();
    const checkboxGroups = new Map();

    doc.querySelectorAll(ANSWER_SELECTOR).forEach((element) => {
      if (["button", "submit", "reset", "hidden"].includes(element.type)) {
        return;
      }

      const range = parseQuestionRange(getRangeValue(element));
      if (range && element.type === "checkbox") {
        const key = range.join("-");
        if (!rangeGroups.has(key)) {
          rangeGroups.set(key, { range, elements: [] });
        }
        rangeGroups.get(key).elements.push(element);
        return;
      }

      const questionId = extractQuestionId(element);
      if (!questionId) return;

      if (element.type === "radio") {
        if (element.checked) nextAnswers[questionId] = element.value || "";
        return;
      }

      if (element.type === "checkbox") {
        if (!checkboxGroups.has(questionId)) {
          checkboxGroups.set(questionId, []);
        }
        checkboxGroups.get(questionId).push(element);
        return;
      }

      nextAnswers[questionId] = getElementValue(element);
    });

    rangeGroups.forEach(({ range, elements }) => {
      const checkedValues = elements
        .filter((element) => element.checked)
        .map((element) => element.value || "");

      range.forEach((questionId, index) => {
        nextAnswers[questionId] = checkedValues[index] || "";
      });

      elements.forEach((element) => {
        element.disabled =
          !element.checked && checkedValues.length >= range.length;
      });
    });

    checkboxGroups.forEach((elements, questionId) => {
      const checkedValues = elements
        .filter((element) => element.checked)
        .map((element) => element.value || "checked");
      nextAnswers[questionId] = checkedValues.join(",");
    });

    onAnswersChange(nextAnswers, questionIdsRef.current);
  }, [onAnswersChange]);

  const applyAnswersToDocument = useCallback((doc, currentAnswers) => {
    doc.querySelectorAll(ANSWER_SELECTOR).forEach((element) => {
      if (["button", "submit", "reset", "hidden"].includes(element.type)) {
        return;
      }

      const range = parseQuestionRange(getRangeValue(element));
      if (range && element.type === "checkbox") {
        const selectedValues = range
          .map((questionId) => currentAnswers[questionId])
          .filter(Boolean);
        element.checked = selectedValues.includes(element.value);
        element.disabled =
          !element.checked && selectedValues.length >= range.length;
        return;
      }

      const questionId = extractQuestionId(element);
      if (!questionId) return;

      const value = currentAnswers[questionId] || "";

      if (element.type === "radio" || element.type === "checkbox") {
        element.checked = value
          .split(",")
          .map((item) => item.trim())
          .includes(element.value);
        return;
      }

      if (element.value !== value) {
        element.value = value;
      }
    });
  }, []);

  const syncCurrentPart = useCallback(() => {
    const parts = partsRef.current;
    if (
      !parts.length ||
      (parts.length === 1 && parts[0]?.nodes?.[0]?.tagName === "BODY")
    ) {
      return;
    }

    parts.forEach((part, index) => {
      const isActive = index === currentPartIndex;
      part.nodes.forEach((node) => {
        node.classList.toggle("active", isActive);
        node.classList.toggle("hidden", !isActive);
        node.style.display = isActive ? "" : "none";
        node.setAttribute("aria-hidden", isActive ? "false" : "true");
      });
    });
  }, [currentPartIndex]);

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    docRef.current = doc;

    const controlStyle = doc.createElement("style");
    controlStyle.textContent = `
      .footer-nav,
      [data-platform-control],
      #prevBtn,
      #nextBtn {
        display: none !important;
      }
    `;
    doc.head.appendChild(controlStyle);

    partsRef.current = buildPartGroups(doc, sectionType);

    onPartsChange(
      partsRef.current.map((part) => ({
        part_number: part.part_number,
        label: part.label,
      })),
      collectQuestionIds(doc)
    );

    applyAnswersToDocument(doc, answers);
    syncCurrentPart();

    const handleInput = () => collectAnswers(doc);
    doc.addEventListener("input", handleInput);
    doc.addEventListener("change", handleInput);
    collectAnswers(doc);

    iframe._cleanupHtmlTestListeners = () => {
      doc.removeEventListener("input", handleInput);
      doc.removeEventListener("change", handleInput);
    };
  }, [
    answers,
    applyAnswersToDocument,
    collectAnswers,
    collectQuestionIds,
    onPartsChange,
    sectionType,
    syncCurrentPart,
  ]);

  useEffect(() => {
    return () => {
      iframeRef.current?._cleanupHtmlTestListeners?.();
    };
  }, [html]);

  useEffect(() => {
    if (docRef.current) {
      syncCurrentPart();
      docRef.current.defaultView?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentPartIndex, syncCurrentPart]);

  useEffect(() => {
    if (docRef.current) {
      applyAnswersToDocument(docRef.current, answers);
    }
  }, [answers, applyAnswersToDocument]);

  return (
    <iframe
      ref={iframeRef}
      className="html-test-content-frame"
      title={`${sectionType} test content`}
      sandbox="allow-same-origin"
      srcDoc={html}
      onLoad={handleLoad}
    />
  );
};

export default HtmlTestContentFrame;
