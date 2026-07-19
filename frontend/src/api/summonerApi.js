/**
 * Summoner API — Riot account linking, match history, ranked stats, mastery.
 * Uses the same axios instance as geminiApi (shared auth interceptors).
 */

import axios from "axios";

const BASE_URL = (process.env.REACT_APP_API_URL || "https://draftsage-production-721d.up.railway.app")
  .replace(/[^\x20-\x7E]/g, "")
  .trim();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Attach auth token + session id (same pattern as geminiApi)
api.interceptors.request.use((config) => {
  const token     = localStorage.getItem("draftsage_token");
  const sessionId = localStorage.getItem("draftsage_session_id");
  if (token)     config.headers.Authorization  = `Bearer ${token}`;
  if (sessionId) config.headers["X-Session-Id"] = sessionId;
  return config;
});

/**
 * Get available regions for the dropdown.
 */
export async function getRegions() {
  const { data } = await api.get("/api/summoner/regions");
  return data.regions;
}

/**
 * Link a Riot account to the authenticated user.
 * @param {string} gameName - e.g. "Fahdl"
 * @param {string} tagLine - e.g. "NA1"
 * @param {string} region - e.g. "na1"
 */
export async function linkRiotAccount(gameName, tagLine, region = "na1") {
  const { data } = await api.post("/api/summoner/link", {
    game_name: gameName,
    tag_line: tagLine,
    region,
  });
  return data;
}

/**
 * Unlink the Riot account from the authenticated user.
 */
export async function unlinkRiotAccount() {
  const { data } = await api.post("/api/summoner/unlink");
  return data;
}

/**
 * Fetch full profile for a summoner (public, no auth required).
 * @param {string} gameName
 * @param {string} tagLine
 * @param {string} region
 */
export async function fetchSummonerProfile(gameName, tagLine, region = "na1") {
  const { data } = await api.post("/api/summoner/profile", {
    game_name: gameName,
    tag_line: tagLine,
    region,
  });
  return data;
}

/**
 * Fetch profile for the currently linked Riot account (auth required).
 */
export async function fetchMyProfile() {
  const { data } = await api.get("/api/summoner/me");
  return data;
}
