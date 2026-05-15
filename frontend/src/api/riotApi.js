/** Riot Data Dragon helpers — fetches champion data directly from the CDN, no backend needed */

const DDRAGON = "https://ddragon.leagueoflegends.com";

// Cache so we only fetch once per session
let _patch = null;
let _champions = null;

// Map of display name → Data Dragon ID for champions that differ
const NAME_TO_ID = {
  "Wukong":          "MonkeyKing",
  "Nunu & Willump":  "Nunu",
  "Renata Glasc":    "Renata",
  "K'Sante":         "KSante",
  "Bel'Veth":        "Belveth",
  "Cho'Gath":        "Chogath",
  "Kog'Maw":         "KogMaw",
  "Kha'Zix":         "Khazix",
  "Rek'Sai":         "RekSai",
  "Vel'Koz":         "Velkoz",
  "Kai'Sa":          "Kaisa",
  "LeBlanc":         "Leblanc",
  "Dr. Mundo":       "DrMundo",
  "Jarvan IV":       "JarvanIV",
  "Lee Sin":         "LeeSin",
  "Master Yi":       "MasterYi",
  "Miss Fortune":    "MissFortune",
  "Twisted Fate":    "TwistedFate",
  "Aurelion Sol":    "AurelionSol",
  "Xin Zhao":        "XinZhao",
  "Tahm Kench":      "TahmKench",
  "Gangplank":       "Gangplank",
  "Vi":              "Vi",
};

/** Fetch and cache the latest patch version */
async function getLatestPatch() {
  if (_patch) return _patch;
  const res = await fetch(`${DDRAGON}/api/versions.json`);
  const versions = await res.json();
  _patch = versions[0];
  return _patch;
}

/**
 * Fetch ALL champions from Riot Data Dragon (directly, no backend needed).
 * Returns array sorted alphabetically, each item:
 *   { id, name, title, key, icon, tags, blurb }
 */
export async function fetchAllChampions() {
  if (_champions) return _champions;

  const patch = await getLatestPatch();
  const res = await fetch(
    `${DDRAGON}/cdn/${patch}/data/en_US/champion.json`
  );
  const json = await res.json();

  const list = Object.entries(json.data).map(([id, data]) => ({
    id,
    name: data.name,
    title: data.title,
    key: data.key,
    icon: `${DDRAGON}/cdn/${patch}/img/champion/${id}.png`,
    tags: data.tags || [],
    blurb: data.blurb || "",
    patch,
  }));

  list.sort((a, b) => a.name.localeCompare(b.name));
  _champions = list;
  return list;
}

/** Build the icon URL for any champion name */
export function getChampionIconUrl(name, patch = "14.24.1") {
  const id = NAME_TO_ID[name] || name.replace(/[\s'.]/g, "").replace(/[^a-zA-Z0-9]/g, "");
  // If we have a cached patch, use it
  const p = _patch || patch;
  return `${DDRAGON}/cdn/${p}/img/champion/${id}.png`;
}

/** Build the splash art URL for any champion name */
export function getChampionSplashUrl(name, skinNum = 0) {
  const id = NAME_TO_ID[name] || name.replace(/[\s'.]/g, "").replace(/[^a-zA-Z0-9]/g, "");
  return `${DDRAGON}/cdn/img/champion/splash/${id}_${skinNum}.jpg`;
}

/** Clear cache (useful in tests or on patch update) */
export function clearChampionCache() {
  _patch = null;
  _champions = null;
}

export const DDRAGON_BASE = DDRAGON;
