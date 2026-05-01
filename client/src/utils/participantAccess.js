export const getCurrentParticipantCode = () => {
  try {
    const participant = JSON.parse(
      localStorage.getItem("currentParticipant") || "{}"
    );
    return participant.participant_id_code || "";
  } catch {
    return "";
  }
};

export const withParticipantAccess = (url) => {
  const participantCode = getCurrentParticipantCode();
  if (!participantCode) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}participant_id_code=${encodeURIComponent(
    participantCode
  )}`;
};
