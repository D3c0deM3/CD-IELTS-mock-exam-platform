const humanizeKey = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const buildBaseContextLabel = (ctx) => {
  if (ctx.taskLabel) return ctx.taskLabel;
  if (ctx.partLabel) return ctx.partLabel;
  if (ctx.passageLabel) return ctx.passageLabel;
  if (ctx.sectionLabel) return ctx.sectionLabel;
  return "Test Asset";
};

const buildSinglePlaceholderLabel = (ctx, node) => {
  const base = buildBaseContextLabel(ctx);
  const detail =
    node.title ||
    ctx.componentTitle ||
    (node.type ? humanizeKey(node.type) : "") ||
    "Image";
  return detail && detail !== base ? `${base} - ${detail}` : base;
};

const buildFieldPlaceholderLabel = (ctx, fieldName) =>
  `${buildBaseContextLabel(ctx)} - ${humanizeKey(fieldName)}`;

export const extractImageSlotsFromContent = (content) => {
  const slotsByKey = new Map();

  const addSlot = (placeholderKey, slotData) => {
    if (!placeholderKey || slotsByKey.has(placeholderKey)) return;
    slotsByKey.set(placeholderKey, {
      placeholder_key: placeholderKey,
      ...slotData,
    });
  };

  const visit = (node, ctx = {}) => {
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, ctx));
      return;
    }

    if (!node || typeof node !== "object") {
      return;
    }

    const nextCtx = { ...ctx };

    if (node.type === "listening" || node.type === "reading" || node.type === "writing") {
      nextCtx.sectionLabel =
        node.section_number != null
          ? `${humanizeKey(node.type)} Section ${node.section_number}`
          : humanizeKey(node.type);
    }

    if (node.part_number != null) {
      nextCtx.partLabel = `Listening Section ${node.part_number}`;
    }

    if (node.passage_number != null) {
      nextCtx.passageLabel = `Reading Passage ${node.passage_number}`;
    }

    if (node.task_number != null) {
      nextCtx.taskLabel = `Writing Task ${node.task_number}`;
    }

    if (node.type || node.title) {
      nextCtx.componentType = node.type || nextCtx.componentType;
      nextCtx.componentTitle = node.title || nextCtx.componentTitle;
    }

    if (node.image_placeholder_key) {
      addSlot(node.image_placeholder_key, {
        label: buildSinglePlaceholderLabel(nextCtx, node),
        context_type: node.type || nextCtx.componentType || "image",
        context_label: buildBaseContextLabel(nextCtx),
      });
    }

    if (node.image_placeholder_keys && typeof node.image_placeholder_keys === "object") {
      Object.entries(node.image_placeholder_keys).forEach(([fieldName, placeholderKey]) => {
        addSlot(placeholderKey, {
          label: buildFieldPlaceholderLabel(nextCtx, fieldName),
          context_type: node.visual_type || node.type || nextCtx.componentType || "image",
          context_label: buildBaseContextLabel(nextCtx),
        });
      });
    }

    Object.values(node).forEach((value) => visit(value, nextCtx));
  };

  visit(content);
  return Array.from(slotsByKey.values());
};

export const parseImageSlotsFromJsonText = (jsonText) => {
  if (!jsonText || !jsonText.trim()) return [];

  try {
    return extractImageSlotsFromContent(JSON.parse(jsonText));
  } catch {
    return [];
  }
};

