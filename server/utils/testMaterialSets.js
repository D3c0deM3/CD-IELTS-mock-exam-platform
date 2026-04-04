const db = require("../db");

const LEGACY_MOCK_ID_PATTERN = /\[MOCK_ID:(\d+)\]/;

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const extractMaterialSetIdFromNotes = (adminNotes) => {
  if (typeof adminNotes !== "string") {
    return null;
  }

  const match = adminNotes.match(LEGACY_MOCK_ID_PATTERN);
  return match ? parsePositiveInt(match[1]) : null;
};

const sanitizeSessionNotes = (adminNotes) => {
  if (adminNotes === undefined || adminNotes === null) {
    return null;
  }

  const cleaned = String(adminNotes).replace(LEGACY_MOCK_ID_PATTERN, "").trim();
  return cleaned || null;
};

const getLatestMaterialSetIdForTest = async (testId) => {
  const normalizedTestId = parsePositiveInt(testId);
  if (!normalizedTestId) {
    return null;
  }

  const [rows] = await db.execute(
    `SELECT id
     FROM test_material_sets
     WHERE test_id = ?
     ORDER BY updated_at DESC, created_at DESC, id DESC
     LIMIT 1`,
    [normalizedTestId]
  );

  return rows[0]?.id || null;
};

const getValidatedMaterialSetIdForTest = async (testId, testMaterialsId) => {
  const normalizedTestId = parsePositiveInt(testId);
  const normalizedSetId = parsePositiveInt(testMaterialsId);

  if (!normalizedTestId) {
    return null;
  }

  if (!normalizedSetId) {
    return getLatestMaterialSetIdForTest(normalizedTestId);
  }

  const [rows] = await db.execute(
    `SELECT id
     FROM test_material_sets
     WHERE id = ? AND test_id = ?
     LIMIT 1`,
    [normalizedSetId, normalizedTestId]
  );

  return rows[0]?.id || null;
};

const resolveSessionMaterialSetId = async ({
  testId,
  testMaterialsId,
  adminNotes,
}) => {
  const explicitSetId = parsePositiveInt(testMaterialsId);
  if (explicitSetId) {
    return explicitSetId;
  }

  const legacySetId = extractMaterialSetIdFromNotes(adminNotes);
  if (legacySetId) {
    return legacySetId;
  }

  return getLatestMaterialSetIdForTest(testId);
};

module.exports = {
  extractMaterialSetIdFromNotes,
  getLatestMaterialSetIdForTest,
  getValidatedMaterialSetIdForTest,
  resolveSessionMaterialSetId,
  sanitizeSessionNotes,
};
