import axios from "axios";

// Strip any non-printable chars (BOM, CR, LF, etc.) that corrupt Axios URL validation
const BASE_URL = (process.env.REACT_APP_API_URL || "https://draftsage-production-721d.up.railway.app")
  .replace(/[^\x20-\x7E]/g, "")
  .trim();

const api = axios.create({
  baseURL: BASE_URL,
  // Engine calls can take 10-20s normally, but under concurrent load the 70b
  // model can take 60-75s. 90s gives enough headroom without hanging forever.
  timeout: 90000,
});

// Log resolved API URL once at startup so users can verify in DevTools
// if their browser is hitting the right backend.
// eslint-disable-next-line no-console
console.info("[DraftSage] Engine endpoint:", BASE_URL);

// Attach auth token + session id if present
api.interceptors.request.use((config) => {
  const token     = localStorage.getItem("draftsage_token");
  const sessionId = localStorage.getItem("draftsage_session_id");
  if (token)     config.headers.Authorization  = `Bearer ${token}`;
  if (sessionId) config.headers["X-Session-Id"] = sessionId;
  return config;
});

// Detect session-invalidated responses and force a clean logout.
// Triggered when another device signs in with this account and invalidates
// our session_id. We clear local state and redirect to login with a
// querystring the Login page can read to show a friendly message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;

    if (status === 401) {
      const alreadyOnLogin = typeof window !== "undefined" && window.location.pathname.startsWith("/login");

      if (detail === "session_invalidated") {
        try {
          localStorage.removeItem("draftsage_token");
          localStorage.removeItem("draftsage_session_id");
        } catch { /* ignore */ }
        if (!alreadyOnLogin) {
          window.location.replace("/login?reason=session_invalidated");
        }
      } else if (detail === "login_required") {
        // Unauthenticated Engine request — send to login with redirect back
        if (!alreadyOnLogin) {
          window.location.replace("/login?reason=login_required&redirect=/draft");
        }
      }
    }

    return Promise.reject(error);
  }
);

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
    return "Couldn't reach the Engine. If you use an ad-blocker, allow draftsage-production-721d.up.railway.app and reload.";
  }
  const s = err?.response?.status;
  if (s === 401) {
    const detail = err?.response?.data?.detail;
    if (detail === "session_invalidated") {
      return "Signed in on another device — please sign in again.";
    }
    if (detail === "login_required") {
      return "Please sign in to use the Engine.";
    }
    return "Please sign in again.";
  }
  if (s === 429) return "You've hit the daily limit. Upgrade to Pro for unlimited Engine runs.";
  if (s === 502 || s === 503 || s === 504) {
    return "Engine is temporarily unavailable. Try again in a few seconds.";
  }
  return fallback;
}

export default api;
