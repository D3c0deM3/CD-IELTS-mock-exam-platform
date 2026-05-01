import React, { useCallback, useEffect, useRef } from "react";
import "./HtmlTestContentFrame.css";

const PART_SELECTOR =
  "section[id^='part'], .section, [data-part], [data-part-number], [data-task], [data-task-number]";
const ANSWER_SELECTOR = "input, textarea, select";
const QUESTION_ID_ATTR = "data-platform-question-id";
const HIGHLIGHT_SELECTOR = ".platform-text-highlight";
const HIGHLIGHT_MENU_ID = "platform-highlight-menu";
const ANSWER_CONTROL_TYPES_TO_SKIP = ["button", "submit", "reset", "hidden"];
const READING_QUESTION_BLOCK_SELECTOR =
  ".qcard, .question-card, .question-item, .question-row, [data-question], [data-question-number], [data-q]";
const READING_NON_CONTENT_SELECTOR =
  "script, style, link, meta, noscript, template, audio, video, canvas";

const isAnswerControl = (element) =>
  element && !ANSWER_CONTROL_TYPES_TO_SKIP.includes(element.type);

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
    element.getAttribute(QUESTION_ID_ATTR) ||
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

const extractQuestionIdFromText = (value) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return null;

  const patterns = [
    /\bquestion\s*(?:number\s*)?([1-9]|[1-3]\d|40)\b/i,
    /(?:^|[^\d])([1-9]|[1-3]\d|40)\s*[\).:]/,
    /(?:^|[^\d])([1-9]|[1-3]\d|40)(?:\s*[-–—]\s*(?:[1-9]|[1-3]\d|40))?\s+(?:choose|complete|write|which|what|where|when|who|why|how|do|does|is|are|was|were)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const questionId = Number.parseInt(match[1], 10);
      if (Number.isFinite(questionId)) return questionId;
    }
  }

  return null;
};

const findNearbyQuestionId = (element) => {
  const labelId = element.getAttribute("aria-labelledby");
  if (labelId) {
    const labelText = labelId
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent || "")
      .join(" ");
    const labelQuestionId = extractQuestionIdFromText(labelText);
    if (labelQuestionId) return labelQuestionId;
  }

  if (element.id) {
    const label = element.ownerDocument.querySelector(`label[for="${element.id}"]`);
    const labelQuestionId = extractQuestionIdFromText(label?.textContent);
    if (labelQuestionId) return labelQuestionId;
  }

  const closestQuestionNode = element.closest(
    "[data-question-number], [data-question-id], [data-q], .question, .question-row, .question-item, li, tr, p"
  );
  const closestQuestionId =
    Number.parseInt(
      closestQuestionNode?.dataset?.questionNumber ||
        closestQuestionNode?.dataset?.questionId ||
        closestQuestionNode?.dataset?.q ||
        "",
      10
    ) || extractQuestionIdFromText(closestQuestionNode?.textContent);

  if (closestQuestionId) return closestQuestionId;

  let previous = element.previousSibling;
  let hops = 0;
  while (previous && hops < 6) {
    const text =
      previous.nodeType === Node.TEXT_NODE
        ? previous.textContent
        : previous.textContent;
    const questionId = extractQuestionIdFromText(text);
    if (questionId) return questionId;
    previous = previous.previousSibling;
    hops += 1;
  }

  return null;
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

const isIgnorableNode = (node) =>
  !node ||
  (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) ||
  (node.nodeType === Node.ELEMENT_NODE &&
    node.matches(READING_NON_CONTENT_SELECTOR));

const getDetectedPartNodes = (doc) => {
  const detectedParts = Array.from(doc.querySelectorAll(PART_SELECTOR));
  return detectedParts.filter(
    (node) => !detectedParts.some((part) => part !== node && part.contains(node))
  );
};

const collectPartNodesUntilNextPart = (node, detectedPartSet) => {
  const nodes = [node];
  let sibling = node.nextSibling;

  while (sibling) {
    if (sibling.nodeType === Node.ELEMENT_NODE && detectedPartSet.has(sibling)) {
      break;
    }

    if (!isIgnorableNode(sibling) && sibling.nodeType === Node.ELEMENT_NODE) {
      nodes.push(sibling);
    }

    sibling = sibling.nextSibling;
  }

  return nodes;
};

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

  const detectedParts = getDetectedPartNodes(doc);
  if (detectedParts.length > 0) {
    const detectedPartSet = new Set(detectedParts);

    return detectedParts.map((node, index) => ({
      nodes: collectPartNodesUntilNextPart(node, detectedPartSet),
      part_number:
        Number.parseInt(
          node.dataset?.part ||
            node.dataset?.partNumber ||
            node.dataset?.task ||
            node.dataset?.taskNumber ||
            "",
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

const hasAnswerControls = (node) =>
  Boolean(
    node?.querySelector?.(ANSWER_SELECTOR) &&
      Array.from(node.querySelectorAll(ANSWER_SELECTOR)).some(isAnswerControl)
  );

const isReadingQuestionBoundary = (node) => {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  if (node.matches(READING_QUESTION_BLOCK_SELECTOR)) return true;

  const text = (node.textContent || "").replace(/\s+/g, " ").trim();
  if (!text) return false;

  if (
    /\bquestions?\s+\d+\s*[-–—]\s*\d+/i.test(text) ||
    /\bquestions?\s+\d+\b/i.test(text)
  ) {
    return true;
  }

  if (!hasAnswerControls(node)) return false;

  return /\b(choose|complete|write|true|false|not given|yes|no|answer)\b/i.test(
    text
  );
};

const findQuestionRunContainer = (root) => {
  if (!root?.querySelectorAll) return null;

  const candidates = [
    root,
    ...Array.from(
      root.querySelectorAll(
        ".body, .content, .passage-content, .scroll, article, section, main, div"
      )
    ),
  ];

  return (
    candidates
      .map((candidate) => {
        const children = Array.from(candidate.children || []).filter(
          (child) => !child.matches(READING_NON_CONTENT_SELECTOR)
        );
        const boundaryIndex = children.findIndex(isReadingQuestionBoundary);
        return { candidate, children, boundaryIndex };
      })
      .filter(({ boundaryIndex, children }) => boundaryIndex > 0 && children.length > 1)
      .sort((left, right) => {
        const leftControls = hasAnswerControls(left.candidate) ? 1 : 0;
        const rightControls = hasAnswerControls(right.candidate) ? 1 : 0;
        if (leftControls !== rightControls) return rightControls - leftControls;
        return left.children.length - right.children.length;
      })[0] || null
  );
};

const getQuestionTarget = (target) =>
  target?.querySelector?.(".body, .content, .questions-body, .questions-content") ||
  target;

const getClassText = (node) =>
  `${node?.className || ""} ${node?.id || ""}`.toLowerCase();

const scoreQuestionPaneCandidate = (node, index, sourceIndex) => {
  const classText = getClassText(node);
  let score = 0;

  if (/(question|answer|right)/.test(classText)) score += 8;
  if (/(panel|pane|column|col|side|card)/.test(classText)) score += 3;
  if ((node.textContent || "").trim().length === 0) score += 2;
  if (index > sourceIndex) score += 2;

  return score;
};

const scoreSourcePaneCandidate = (node) => {
  const classText = getClassText(node);
  let score = 0;

  if (hasAnswerControls(node)) score += 6;
  if (/(passage|left|content|body)/.test(classText)) score += 4;
  if (/(panel|pane|column|col|side|card)/.test(classText)) score += 2;

  return score;
};

const moveQuestionRun = (sourceInfo, target) => {
  if (!sourceInfo || !target) return false;

  const targetNode = getQuestionTarget(target);
  if (!targetNode) return false;

  sourceInfo.children.slice(sourceInfo.boundaryIndex).forEach((child) => {
    targetNode.appendChild(child);
  });

  return true;
};

const findExistingTwoPaneLayout = (root) => {
  if (!root?.querySelectorAll) return null;

  const parents = [
    root,
    ...Array.from(
      root.querySelectorAll(
        ".wrap, .container, .reading-layout, .split, [class*='layout'], [class*='split']"
      )
    ),
  ];

  for (const parent of parents) {
    const children = Array.from(parent.children || []).filter(
      (child) =>
        !child.matches(READING_NON_CONTENT_SELECTOR) &&
        !child.matches(READING_QUESTION_BLOCK_SELECTOR)
    );

    if (children.length < 2) continue;

    const sourceCandidates = children
      .map((child, index) => ({ child, index, score: scoreSourcePaneCandidate(child) }))
      .filter(({ child }) => hasAnswerControls(child))
      .sort((left, right) => right.score - left.score);

    for (const source of sourceCandidates) {
      const target = children
        .map((child, index) => ({
          child,
          index,
          score: scoreQuestionPaneCandidate(child, index, source.index),
        }))
        .filter(
          ({ child, index }) =>
            index !== source.index &&
            !hasAnswerControls(child) &&
            !child.contains(source.child)
        )
        .sort((left, right) => right.score - left.score)[0];

      if (target) {
        return {
          passagePane: source.child,
          questionPane: target.child,
          layoutNode: parent,
        };
      }
    }
  }

  return null;
};

const createReadingSplitLayout = (doc, container, sourceInfo) => {
  const shell = doc.createElement("div");
  const passagePane = doc.createElement("div");
  const questionPane = doc.createElement("div");

  shell.className = "platform-reading-layout";
  passagePane.className = "platform-reading-pane platform-reading-passage-pane";
  questionPane.className = "platform-reading-pane platform-reading-question-pane";

  const leftNodes = sourceInfo.children.slice(0, sourceInfo.boundaryIndex);
  const rightNodes = sourceInfo.children.slice(sourceInfo.boundaryIndex);

  leftNodes.forEach((child) => passagePane.appendChild(child));
  rightNodes.forEach((child) => questionPane.appendChild(child));
  shell.appendChild(passagePane);
  shell.appendChild(questionPane);
  container.appendChild(shell);
};

const normalizeReadingSplitLayout = (doc, parts) => {
  parts.forEach((part) => {
    part.nodes.forEach((node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.querySelector(".platform-reading-layout")) return;

      const existingLayout = findExistingTwoPaneLayout(node);
      if (existingLayout) {
        const sourceInfo = findQuestionRunContainer(existingLayout.passagePane);
        if (moveQuestionRun(sourceInfo, existingLayout.questionPane)) {
          existingLayout.layoutNode.classList.add("platform-reading-existing-layout");
          existingLayout.passagePane.classList.add("platform-reading-passage-pane");
          existingLayout.questionPane.classList.add("platform-reading-question-pane");
        }
        return;
      }

      const sourceInfo = findQuestionRunContainer(node);
      if (!sourceInfo) return;

      createReadingSplitLayout(doc, sourceInfo.candidate, sourceInfo);
    });
  });
};

const normalizePartHierarchy = (doc, parts) => {
  if (parts.length <= 1) return parts;

  const firstNode = parts[0]?.nodes?.[0];
  if (!firstNode || firstNode === doc.body || !firstNode.parentNode) {
    return parts;
  }

  const root = doc.createElement("div");
  root.setAttribute("data-platform-part-root", "true");
  root.style.width = "100%";
  root.style.minHeight = "100%";
  firstNode.parentNode.insertBefore(root, firstNode);

  parts.forEach((part) => {
    part.nodes.forEach((node) => {
      if (node && node.parentNode !== root) {
        root.appendChild(node);
      }
    });
  });

  return parts;
};

const getPlatformContentCss = (sectionType) => {
  const sharedCss = `
    html,
    body {
      width: 100% !important;
      min-height: 100% !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      scroll-padding-bottom: 120px !important;
    }
    *,
    *::before,
    *::after {
      box-sizing: border-box !important;
    }
    [data-platform-part-root] {
      width: 100% !important;
      min-height: 100% !important;
    }
    body {
      padding-bottom: 120px !important;
    }
    input:not([type="radio"]):not([type="checkbox"]),
    textarea {
      min-width: 58px;
    }
    .platform-text-highlight {
      background: #fff176 !important;
      color: inherit !important;
      border-radius: 2px !important;
      box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.28) !important;
      cursor: pointer !important;
    }
    #${HIGHLIGHT_MENU_ID} {
      position: fixed !important;
      z-index: 2147483647 !important;
      display: none;
      padding: 6px !important;
      background: #ffffff !important;
      border: 1px solid #d4d4d4 !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    }
    #${HIGHLIGHT_MENU_ID} button {
      border: 0 !important;
      border-radius: 6px !important;
      background: #dc2626 !important;
      color: #ffffff !important;
      cursor: pointer !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      padding: 7px 10px !important;
      white-space: nowrap !important;
    }
  `;

  if (sectionType === "listening") {
    return `
      ${sharedCss}
      body {
        background: #ffffff !important;
        overflow: auto !important;
      }
      .wrap {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
      }
      .card {
        width: 100% !important;
        min-height: 100% !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
      .section {
        padding: 22px 32px 120px !important;
      }
      .instructions {
        max-width: none !important;
        border-radius: 8px !important;
        margin-bottom: 18px !important;
      }
      .subhead {
        margin-top: 22px !important;
      }
      .line {
        font-size: 16px !important;
        line-height: 1.85 !important;
        margin: 8px 0 !important;
      }
      .blank {
        height: 34px !important;
        max-width: min(180px, 45vw) !important;
      }
    `;
  }

  if (sectionType === "reading") {
    return `
      ${sharedCss}
      html,
      body {
        height: 100% !important;
        background: #f6f6f6 !important;
        overflow: hidden !important;
      }
      body {
        padding: 0 !important;
      }
      .section,
      [data-passage],
      [data-platform-part-root] {
        height: 100% !important;
        min-height: 0 !important;
      }
      .platform-reading-layout,
      .platform-reading-existing-layout {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
        gap: 16px !important;
        width: 100% !important;
        height: 100% !important;
        min-height: 0 !important;
        padding: 14px !important;
        background: #f6f6f6 !important;
      }
      .platform-reading-pane,
      .platform-reading-passage-pane,
      .platform-reading-question-pane {
        min-width: 0 !important;
        min-height: 0 !important;
        height: 100% !important;
        overflow: auto !important;
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 16px !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05) !important;
        padding: 22px !important;
      }
      .platform-reading-passage-pane::-webkit-scrollbar,
      .platform-reading-question-pane::-webkit-scrollbar,
      .platform-reading-pane::-webkit-scrollbar {
        width: 10px !important;
      }
      .platform-reading-passage-pane::-webkit-scrollbar-track,
      .platform-reading-question-pane::-webkit-scrollbar-track,
      .platform-reading-pane::-webkit-scrollbar-track {
        background: #f1f1f1 !important;
      }
      .platform-reading-passage-pane::-webkit-scrollbar-thumb,
      .platform-reading-question-pane::-webkit-scrollbar-thumb,
      .platform-reading-pane::-webkit-scrollbar-thumb {
        background: #ef4444 !important;
        border-radius: 8px !important;
      }
      @media (max-width: 900px) {
        html,
        body {
          overflow: auto !important;
        }
        .platform-reading-layout,
        .platform-reading-existing-layout {
          display: flex !important;
          flex-direction: column !important;
          height: auto !important;
          min-height: 100% !important;
        }
        .platform-reading-pane,
        .platform-reading-passage-pane,
        .platform-reading-question-pane {
          height: auto !important;
          max-height: none !important;
        }
      }
    `;
  }

  return sharedCss;
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

  const prepareAnswerControls = useCallback((doc) => {
    const elements = Array.from(doc.querySelectorAll(ANSWER_SELECTOR)).filter(
      isAnswerControl
    );
    const assignedByName = new Map();
    const usedIds = new Set();
    let nextSequentialId = 1;

    elements.forEach((element) => {
      const range = parseQuestionRange(getRangeValue(element));
      if (range) {
        range.forEach((id) => usedIds.add(id));
        return;
      }

      let questionId = extractQuestionId(element) || findNearbyQuestionId(element);

      if (!questionId && ["radio", "checkbox"].includes(element.type) && element.name) {
        questionId = assignedByName.get(element.name) || null;
      }

      if (!questionId) {
        while (usedIds.has(nextSequentialId)) {
          nextSequentialId += 1;
        }
        questionId = nextSequentialId;
      }

      if (["radio", "checkbox"].includes(element.type) && element.name) {
        assignedByName.set(element.name, questionId);
      }

      element.setAttribute(QUESTION_ID_ATTR, String(questionId));
      usedIds.add(questionId);
      nextSequentialId = Math.max(nextSequentialId, questionId + 1);

      if (
        !element.getAttribute("placeholder") &&
        (element.tagName === "TEXTAREA" ||
          (element.tagName === "INPUT" &&
            !["radio", "checkbox", "file", "range", "color"].includes(element.type)))
      ) {
        element.setAttribute("placeholder", `Question ${questionId}`);
      }
    });
  }, []);

  const collectQuestionIds = useCallback((doc) => {
    const ids = new Set();

    doc.querySelectorAll(ANSWER_SELECTOR).forEach((element) => {
      if (!isAnswerControl(element)) return;

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
      if (!isAnswerControl(element)) return;

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
      if (!isAnswerControl(element)) return;

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

  const setupHighlighting = useCallback((doc) => {
    if (!["reading", "listening"].includes(sectionType)) {
      return () => {};
    }

    const menu = doc.createElement("div");
    menu.id = HIGHLIGHT_MENU_ID;
    menu.innerHTML = `<button type="button">Remove highlight</button>`;
    doc.body.appendChild(menu);

    let activeHighlight = null;

    const hideMenu = () => {
      menu.style.display = "none";
      activeHighlight = null;
    };

    const unwrapHighlight = (highlight) => {
      const parent = highlight?.parentNode;
      if (!parent) return;

      while (highlight.firstChild) {
        parent.insertBefore(highlight.firstChild, highlight);
      }

      parent.removeChild(highlight);
      parent.normalize();
      hideMenu();
    };

    const showMenu = (highlight, event) => {
      activeHighlight = highlight;
      menu.style.left = `${Math.max(
        8,
        Math.min(event.clientX, doc.documentElement.clientWidth - 160)
      )}px`;
      menu.style.top = `${Math.max(
        8,
        Math.min(event.clientY + 8, doc.documentElement.clientHeight - 46)
      )}px`;
      menu.style.display = "block";
    };

    const isSelectionInsideAnswer = (range) => {
      const container =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;
      return Boolean(container?.closest("input, textarea, select, button"));
    };

    const wrapSelection = () => {
      const selection = doc.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString().trim();
      if (!selectedText || isSelectionInsideAnswer(range)) return;

      const container =
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;

      if (
        !container ||
        container.closest(`${HIGHLIGHT_SELECTOR}, input, textarea, select, button`)
      ) {
        return;
      }

      const highlight = doc.createElement("span");
      highlight.className = "platform-text-highlight";
      highlight.dataset.highlightId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      try {
        const contents = range.extractContents();
        highlight.appendChild(contents);
        range.insertNode(highlight);
        selection.removeAllRanges();
      } catch (error) {
        selection.removeAllRanges();
      }
    };

    const handleMouseUp = (event) => {
      if (event.target.closest(`#${HIGHLIGHT_MENU_ID}`)) return;
      window.setTimeout(wrapSelection, 0);
    };

    const handleClick = (event) => {
      const highlight = event.target.closest(HIGHLIGHT_SELECTOR);
      if (highlight) {
        event.preventDefault();
        event.stopPropagation();
        showMenu(highlight, event);
        return;
      }

      if (!event.target.closest(`#${HIGHLIGHT_MENU_ID}`)) {
        hideMenu();
      }
    };

    const handleRemove = (event) => {
      event.preventDefault();
      if (activeHighlight) unwrapHighlight(activeHighlight);
    };

    doc.addEventListener("mouseup", handleMouseUp);
    doc.addEventListener("click", handleClick);
    menu.querySelector("button")?.addEventListener("click", handleRemove);

    return () => {
      doc.removeEventListener("mouseup", handleMouseUp);
      doc.removeEventListener("click", handleClick);
      menu.querySelector("button")?.removeEventListener("click", handleRemove);
      menu.remove();
    };
  }, [sectionType]);

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) return;

    docRef.current = doc;

    const controlStyle = doc.createElement("style");
    controlStyle.textContent = `
      ${getPlatformContentCss(sectionType)}
      .footer-nav,
      [data-platform-control],
      #prevBtn,
      #nextBtn {
        display: none !important;
      }
    `;
    doc.head.appendChild(controlStyle);

    prepareAnswerControls(doc);
    partsRef.current = normalizePartHierarchy(
      doc,
      buildPartGroups(doc, sectionType)
    );
    if (sectionType === "reading") {
      normalizeReadingSplitLayout(doc, partsRef.current);
    }

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
    const cleanupHighlighting = setupHighlighting(doc);

    iframe._cleanupHtmlTestListeners = () => {
      doc.removeEventListener("input", handleInput);
      doc.removeEventListener("change", handleInput);
      cleanupHighlighting?.();
    };
  }, [
    answers,
    applyAnswersToDocument,
    collectAnswers,
    collectQuestionIds,
    onPartsChange,
    prepareAnswerControls,
    sectionType,
    setupHighlighting,
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
