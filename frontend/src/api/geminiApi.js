import axios from "axios";

// Strip any non-printable chars (BOM, CR, LF, etc.) that corrupt Axios URL validation
const BASE_URL = (process.env.REACT_APP_API_URL || "https://draftsage-production.up.railway.app")
  .replace(/[^\x20-\x7E]/g, "")
  .trim();

const api = axios.create({
  baseURL: BASE_URL,
  // Engine calls can take 10-20s when external sources (lolalytics) are slow.
  // 45s is the upper bound — enough headroom for cold-starts + LLM streaming.
  timeout: 45000,
});

// Log resolved API URL once at startup so users can verify in DevTools
// if their browser is hitting the right backend.
// eslint-disable-next-line no-console
console.info("[DraftSage] Engine endpoint:", BASE_URL);

// Attach auth token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("draftsage_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Fetch the full champion list from backend (backed by Data Dragon) */
export const fetchChampions = async (search = "") => {
  const { data } = await api.get("/api/champions", { params: { search } });
  return data.champions;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns true if the error looks transient and worth retrying once:
 * - Network error (no response)
 * - Timeout
 * - 502/503/504 (gateway / upstream issues — Railway cold-start, Groq rate-limit
 *   bubbling up to upstream timeout, etc.)
 * 4xx errors are user errors and should NOT be retried.
 */
function isTransient(err) {
  if (err.code === "ECONNABORTED") return true;          // axios timeout
  if (err.code === "ERR_NETWORK")  return true;          // no response at all
  if (!err.response)               return true;          // network blip
  const s = err.response.status;
  return s === 502 || s === 503 || s === 504;
}

/** Run an axios request, retrying once on transient failures. */
async function withRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (!isTransient(err)) throw err;
    // Brief backoff so the upstream has time to recover (e.g., Groq rate-limit window)
    await sleep(800);
    return await fn();   // single retry — if this also fails, surface the error
  }
}

/** Get DraftSage Engine draft suggestions. Retries once on transient failure. */
export const getSuggestions = async ({ allyPicks, enemyPicks, role, championPool, banMode }) => {
  const { data } = await withRetry(() =>
    api.post("/api/draft/suggest", {
      ally_picks:    allyPicks,
      enemy_picks:   enemyPicks,
      role,
      champion_pool: championPool || null,
      ban_mode:      banMode || false,
    })
  );
  return data;
};

/**
 * Pull a human-readable message out of an axios error.
 * Tries server-supplied detail first, then known patterns, falls back to a generic.
 * Also logs the raw error to console so users / devs can diagnose.
 */
export function describeApiError(err, fallback = "Something went wrong. Please try again.") {
  // Always log so users hitting an issue can inspect in DevTools.
  // eslint-disable-next-line no-console
  console.error("[DraftSage] Engine request failed:", {
    code:    err?.code,
    message: err?.message,
    status:  err?.response?.status,
    detail:  err?.response?.data,
    url:     err?.config?.baseURL + err?.config?.url,
  });

  // Server-supplied detail (FastAPI HTTPException)
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail.length > 0) return detail;

  // Known transport errors
  if (err?.code === "ECONNABORTED") {
    return "The Engine took too long to respond. Try again — sometimes the patch-data source is slow.";
  }
  if (err?.code === "ERR_NETWORK" || !err?.response) {
    return "Couldn't reach the Engine. If you use an ad-blocker, allow draftsage-production.up.railway.app and reload.";
  }
  const s = err?.response?.status;
  if (s === 401) return "Please sign in again.";
  if (s === 429) return "You've hit the daily limit. Upgrade to Pro for unlimited Engine runs.";
  if (s === 502 || s === 503 || s === 504) {
    return "Engine is temporarily unavailable. Try again in a few seconds.";
  }
  return fallback;
}

export default api;
