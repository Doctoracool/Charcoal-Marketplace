/* =========================
   API CONFIG (PRODUCTION FIX)
========================= */
const API_BASE = "https://charcoal-marketplace-1.onrender.com/api";

/* =========================
   OPTIONAL HELPERS
========================= */
function getAPI(url) {
  return `${API_BASE}${url}`;
}