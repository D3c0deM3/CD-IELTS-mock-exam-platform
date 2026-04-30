const crypto = require("crypto");

const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PARTICIPANT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const randomCode = (prefix, length, alphabet = ACCESS_CODE_ALPHABET) => {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return prefix ? `${prefix}${code}` : code;
};

const generateUniqueGuestAccessCode = async (db) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomCode("G-", 8);
    const [existing] = await db.execute(
      "SELECT id FROM test_sessions WHERE guest_access_code = ? LIMIT 1",
      [code]
    );
    if (existing.length === 0) return code;
  }
  throw new Error("Could not generate a unique guest access code");
};

const generateUniqueParticipantCode = async (db) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = randomCode("C-", 10, PARTICIPANT_CODE_ALPHABET);
    const [existing] = await db.execute(
      "SELECT id FROM test_participants WHERE participant_id_code = ? LIMIT 1",
      [code]
    );
    if (existing.length === 0) return code;
  }
  throw new Error("Could not generate a unique participant code");
};

module.exports = {
  generateUniqueGuestAccessCode,
  generateUniqueParticipantCode,
};
