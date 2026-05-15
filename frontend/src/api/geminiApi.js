import axios from "axios";

const BASE_URL = (process.env.REACT_APP_API_URL || "http://localhost:8000").trim();

const api = axios.create({ baseURL: BASE_URL });

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

/** Get AI draft suggestions */
export const getSuggestions = async ({ allyPicks, enemyPicks, role, championPool, banMode }) => {
  const { data } = await api.post("/api/draft/suggest", {
    ally_picks: allyPicks,
    enemy_picks: enemyPicks,
    role,
    champion_pool: championPool || null,
    ban_mode: banMode || false,
  });
  return data;
};

export default api;
