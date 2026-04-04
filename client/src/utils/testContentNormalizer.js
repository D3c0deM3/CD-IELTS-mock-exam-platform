export const GAP_PLACEHOLDER_REGEX =
  /(\(?\d+\)?(?:\s*[^\w\s]+\s*)?(?:\.{2,}|…+|_{2,}))/g;

const GAP_TOKEN_REGEX = /\(?(\d+)\)?(?:\s*[^\w\s]+\s*)?(?:\.{2,}|…+|_{2,})/;

const asArray = (value) => (Array.isArray(value) ? value : []);

const toText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const titleizeKey = (value) =>
  toText(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const extractQuestionIdFromText = (value) => {
  const match = toText(value).match(GAP_TOKEN_REGEX);
  return match ? Number.parseInt(match[1], 10) : null;
};

const normalizeOptions = (options) =>
  asArray(options)
    .map((option) => toText(option).trim())
    .filter(Boolean);

const normalizeListeningQuestion = (question, index) => {
  const normalized = {
    ...question,
    id: Number.parseInt(question?.id, 10) || index + 1,
  };

  const typeAliases = {
    map_labeling: "matching",
    map_labelling: "matching",
    matching_features: "matching",
    matching_information: "matching",
    multiple_choice_single: "multiple_choice",
  };

  normalized.type = typeAliases[normalized.type] || normalized.type;

  if (!normalized.prompt && normalized.question) {
    normalized.prompt = normalized.question;
  }

  if (!normalized.question && normalized.prompt) {
    normalized.question = normalized.prompt;
  }

  const matchingOptions = normalizeOptions(
    normalized.matching_options || normalized.options
  );

  if (normalized.type === "matching" && matchingOptions.length > 0) {
    normalized.matching_options = matchingOptions;
  }

  if (normalized.type === "multiple_choice") {
    normalized.options = normalizeOptions(normalized.options);
  }

  return normalized;
};

const normalizeStructuredItem = (item) => {
  if (typeof item === "string") {
    const questionId = extractQuestionIdFromText(item);
    if (questionId) {
      return { type: "question", question_id: questionId, content: item };
    }
    return { type: "text", content: item };
  }

  if (!item || typeof item !== "object") {
    return { type: "text", content: toText(item) };
  }

  const content =
    item.content || item.label || item.text || item.prompt || item.question || "";
  const questionId =
    item.question_id || item.questionId || extractQuestionIdFromText(content);

  if (item.type === "question" || questionId) {
    return {
      ...item,
      type: "question",
      question_id: questionId,
      content,
    };
  }

  return {
    ...item,
    type: item.type || "text",
    content,
  };
};

const inferQuestionIdsFromRows = (rows) => {
  const ids = [];
  asArray(rows).forEach((row) => {
    Object.values(row || {}).forEach((value) => {
      const questionId = extractQuestionIdFromText(value);
      if (questionId) ids.push(questionId);
    });
  });
  return [...new Set(ids)];
};

const normalizeListeningComponent = (component, questions) => {
  const normalized = { ...component };

  if (normalized.type === "table") {
    const rows = asArray(normalized.rows);
    const inferredKeys = rows[0] ? Object.keys(rows[0]) : [];
    normalized.rows = rows;
    normalized.column_keys = asArray(normalized.column_keys).length
      ? normalized.column_keys
      : inferredKeys;
    normalized.headers = asArray(normalized.headers).length
      ? normalized.headers
      : normalized.column_keys.map(titleizeKey);
    normalized.question_ids = asArray(normalized.question_ids).length
      ? normalized.question_ids
      : inferQuestionIdsFromRows(rows);
    return normalized;
  }

  if (normalized.type === "notes") {
    const items = asArray(normalized.items).map((item) => toText(item));
    normalized.items = items;
    normalized.question_ids = asArray(normalized.question_ids).length
      ? normalized.question_ids
      : items.map(extractQuestionIdFromText).filter(Boolean);
    return normalized;
  }

  if (
    normalized.type === "map_labeling" ||
    normalized.type === "map_labelling"
  ) {
    const items = asArray(normalized.locations).map((location, index) => ({
      question_id:
        location.question_id || extractQuestionIdFromText(location.label) || index + 1,
      label: location.label || `Location ${index + 1}`,
    }));

    const options = normalizeOptions(
      normalized.map_letters ||
        normalized.options ||
        normalized.options_box?.options ||
        questions
          .filter((question) => items.some((item) => item.question_id === question.id))
          .flatMap((question) => question.matching_options || question.options || [])
    );

    return {
      type: "matching_list",
      title: normalized.title,
      instructions: normalized.instructions,
      options_box: {
        title: normalized.options_box?.title || "Map Labels",
        options,
      },
      items,
    };
  }

  if (normalized.type === "matching_list") {
    normalized.options_box = {
      title: normalized.options_box?.title || "Options",
      options: normalizeOptions(normalized.options_box?.options),
    };
    normalized.items = asArray(normalized.items).map((item, index) => ({
      question_id:
        item.question_id || extractQuestionIdFromText(item.label) || index + 1,
      label: item.label || item.prompt || `Question ${index + 1}`,
    }));
    return normalized;
  }

  if (normalized.type === "matching_table") {
    normalized.options_box = {
      title: normalized.options_box?.title || "Options",
      options: normalizeOptions(normalized.options_box?.options),
    };
    normalized.matching_pairs = asArray(normalized.matching_pairs);
    normalized.columns = asArray(normalized.columns);
    return normalized;
  }

  return normalized;
};

const normalizeListeningVisualStructure = (visualStructure, questions) => {
  if (!visualStructure || typeof visualStructure !== "object") {
    return visualStructure;
  }

  if (visualStructure.type === "mixed") {
    return {
      ...visualStructure,
      components: asArray(visualStructure.components).map((component) =>
        normalizeListeningComponent(component, questions)
      ),
    };
  }

  if (visualStructure.type === "notes") {
    return normalizeListeningComponent(visualStructure, questions);
  }

  if (visualStructure.type === "structured_notes") {
    return {
      ...visualStructure,
      sections: asArray(visualStructure.sections).map((section) => ({
        ...section,
        items: asArray(section.items).map(normalizeStructuredItem),
      })),
    };
  }

  if (visualStructure.type === "form") {
    return {
      ...visualStructure,
      sections: asArray(visualStructure.sections).map((section) => ({
        ...section,
        items: asArray(section.items).map(normalizeStructuredItem),
      })),
    };
  }

  return visualStructure;
};

const normalizeReadingQuestion = (question, index) => {
  const normalized = {
    ...question,
    id: Number.parseInt(question?.id, 10) || index + 1,
  };

  const typeAliases = {
    true_false_not_given: "true_false_ng",
    yes_no_notgiven: "yes_no_ng",
    yes_no_not_given: "yes_no_ng",
    word_bank_matching: "matching",
    map_labeling: "matching",
    map_labelling: "matching",
  };

  normalized.type = typeAliases[normalized.type] || normalized.type;

  if (!normalized.prompt && normalized.question) {
    normalized.prompt = normalized.question;
  }

  if (!normalized.question && normalized.prompt) {
    normalized.question = normalized.prompt;
  }

  if (normalized.type === "true_false_ng") {
    normalized.options = normalizeOptions(normalized.options);
    if (!normalized.options.length) {
      normalized.options = ["TRUE", "FALSE", "NOT GIVEN"];
    }
  }

  if (normalized.type === "yes_no_ng") {
    normalized.options = normalizeOptions(normalized.options);
    if (!normalized.options.length) {
      normalized.options = ["YES", "NO", "NOT GIVEN"];
    }
  }

  if (normalized.type === "multiple_choice") {
    normalized.options = normalizeOptions(normalized.options);
  }

  const matchingOptions = normalizeOptions(
    normalized.matching_options || normalized.options
  );
  if (normalized.type === "matching" && matchingOptions.length > 0) {
    normalized.matching_options = matchingOptions;
  }

  return normalized;
};

const normalizeReadingPassage = (passage, index) => {
  const questions = asArray(passage.questions).map(normalizeReadingQuestion);
  return {
    ...passage,
    passage_number:
      Number.parseInt(passage?.passage_number, 10) || index + 1,
    formatted_content: toText(
      passage.formatted_content || passage.content || passage.text
    ),
    visual_structure: {
      ...passage.visual_structure,
      question_groups: asArray(passage.visual_structure?.question_groups),
    },
    questions,
  };
};

const normalizeWritingTask = (task, index) => {
  const taskNumber = Number.parseInt(task?.task_number, 10) || index + 1;
  return {
    ...task,
    task_number: taskNumber,
    title: task.title || `Task ${taskNumber}`,
    instructions: toText(task.instructions),
    prompt: toText(task.prompt || task.description || task.topic),
    questions: asArray(task.questions),
  };
};

export const normalizeTestContent = (content) => {
  if (!content || typeof content !== "object") {
    return content;
  }

  return {
    ...content,
    sections: asArray(content.sections).map((section) => {
      if (section.type === "listening") {
        const parts = asArray(section.parts).map((part, index) => {
          const questions = asArray(part.questions).map(normalizeListeningQuestion);
          return {
            ...part,
            part_number: Number.parseInt(part?.part_number, 10) || index + 1,
            questions,
            visual_structure: normalizeListeningVisualStructure(
              part.visual_structure,
              questions
            ),
          };
        });

        return { ...section, parts };
      }

      if (section.type === "reading") {
        return {
          ...section,
          passages: asArray(section.passages).map(normalizeReadingPassage),
        };
      }

      if (section.type === "writing") {
        return {
          ...section,
          tasks: asArray(section.tasks)
            .map(normalizeWritingTask)
            .sort((left, right) => left.task_number - right.task_number),
        };
      }

      return section;
    }),
  };
};
