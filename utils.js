const API_BASE = window.location.origin + "/api";

/* =========================
   SAFE API FETCH (UPGRADED)
========================= */
async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `HTTP Error ${res.status}`);
    }

    return data;

  } catch (err) {
    clearTimeout(timeout);

    console.error("API Error:", err.message);

    return {
      success: false,
      message: err.name === "AbortError"
        ? "Request timeout"
        : err.message
    };
  }
}