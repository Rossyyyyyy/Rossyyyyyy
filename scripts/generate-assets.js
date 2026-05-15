/**
 * generate-assets.js
 *
 * Fetches live GitHub data for Rossyyyyyy and writes two unique SVG files:
 *   - assets/header.svg      → deep-space game banner with live stat boxes
 *   - assets/stats-card.svg  → RPG stat card with smooth gradient bars
 *
 * Run locally:  node scripts/generate-assets.js
 * In CI:        called by .github/workflows/generate-assets.yml
 *
 * Env vars (optional, raises API rate limit):
 *   GITHUB_TOKEN  – a personal access token or the Actions GITHUB_TOKEN
 */

const https  = require("https");
const fs     = require("fs");
const path   = require("path");

// ─── config ──────────────────────────────────────────────────────────────────
const USERNAME   = "Rossyyyyyy";
const ASSETS_DIR = path.join(__dirname, "..", "assets");

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Simple HTTPS GET → resolves with parsed JSON */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const options = { headers: { "User-Agent": "readme-generator" } };
    if (process.env.GITHUB_TOKEN) {
      options.headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

/** Fetch visitor count from komarev.com — returns a number or null on failure */
function fetchVisitorCount(username) {
  return new Promise((resolve) => {
    const url = `https://komarev.com/ghpvc/?username=${encodeURIComponent(username)}&format=json`;
    https.get(url, { headers: { "User-Agent": "readme-generator" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          // komarev returns { count: <number> }
          resolve(typeof json.count === "number" ? json.count : null);
        } catch {
          resolve(null);
        }
      });
    }).on("error", () => resolve(null));
  });
}

/** Escape text for safe SVG embedding */
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build a smooth gradient progress bar SVG snippet.
 * Returns a track rect + filled rect + shimmer highlight.
 */
function gradientBar(x, y, trackW, trackH, pct, fillColor, shimmerColor) {
  const filled = Math.max(4, Math.round((trackW * Math.min(pct, 100)) / 100));
  const r = Math.floor(trackH / 2);
  return [
    `<rect x="${x}" y="${y}" width="${trackW}" height="${trackH}" rx="${r}" fill="url(#track)"/>`,
    `<rect x="${x}" y="${y}" width="${filled}" height="${trackH}" rx="${r}" fill="${fillColor}" opacity="0.92"/>`,
    `<rect x="${x}" y="${y}" width="${filled}" height="${Math.ceil(trackH / 3)}" rx="${r}" fill="${shimmerColor}" opacity="0.35"/>`,
  ].join("\n  ");
}

// ─── fetch GitHub data ────────────────────────────────────────────────────────

async function getGitHubData() {
  try {
    const user  = await fetchJSON(`https://api.github.com/users/${USERNAME}`);
    const repos = await fetchJSON(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&type=owner`
    );

    const stars = Array.isArray(repos)
      ? repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
      : 0;

    const forks = Array.isArray(repos)
      ? repos.reduce((sum, r) => sum + (r.forks_count || 0), 0)
      : 0;

    // Fetch visitor count from komarev (may return null if unavailable)
    const visitors = await fetchVisitorCount(USERNAME);

    return {
      name       : user.name        || USERNAME,
      bio        : user.bio         || "Full-Stack Developer",
      followers  : user.followers   || 0,
      following  : user.following   || 0,
      publicRepos: user.public_repos || 0,
      stars,
      forks,
      visitors   : visitors !== null ? visitors : "—",
      avatarUrl  : user.avatar_url  || "",
      createdAt  : user.created_at  || "",
    };
  } catch {
    // fallback so the Action never hard-fails
    return {
      name: USERNAME, bio: "Full-Stack Developer",
      followers: 0, following: 0, publicRepos: 0,
      stars: 0, forks: 0, visitors: "—", avatarUrl: "", createdAt: "",
    };
  }
}

// ─── SVG generators ──────────────────────────────────────────────────────────

function buildHeaderSVG(data) {
  const now      = new Date().toUTCString();
  const nameText = esc(data.name.toUpperCase());
  const bioText  = esc(data.bio);
  const visitors = typeof data.visitors === "number" ? esc(String(data.visitors)) : "—";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="260" viewBox="0 0 900 260">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#07071a"/>
      <stop offset="40%"  stop-color="#130a2e"/>
      <stop offset="70%"  stop-color="#1a0533"/>
      <stop offset="100%" stop-color="#07071a"/>
    </linearGradient>
    <linearGradient id="nameg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#f472b6"/>
      <stop offset="30%"  stop-color="#c084fc"/>
      <stop offset="60%"  stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <linearGradient id="accentg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7c3aed" stop-opacity="0"/>
      <stop offset="30%"  stop-color="#a855f7"/>
      <stop offset="50%"  stop-color="#ec4899"/>
      <stop offset="70%"  stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </linearGradient>
    <pattern id="scan" x="0" y="0" width="900" height="3" patternUnits="userSpaceOnUse">
      <rect width="900" height="1" y="2" fill="#000" opacity="0.06"/>
    </pattern>
    <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bigglow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sglow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="2" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- background + scanlines -->
  <rect width="900" height="260" fill="url(#bg)"/>
  <rect width="900" height="260" fill="url(#scan)"/>

  <!-- star field -->
  <circle cx="45"  cy="18"  r="1"   fill="#fff" opacity="0.6"/>
  <circle cx="120" cy="55"  r="0.8" fill="#c4b5fd" opacity="0.5"/>
  <circle cx="200" cy="12"  r="1.2" fill="#fff" opacity="0.7"/>
  <circle cx="310" cy="40"  r="0.7" fill="#f0abfc" opacity="0.5"/>
  <circle cx="500" cy="15"  r="0.8" fill="#c4b5fd" opacity="0.6"/>
  <circle cx="590" cy="48"  r="1.1" fill="#fff" opacity="0.5"/>
  <circle cx="680" cy="20"  r="0.9" fill="#f0abfc" opacity="0.4"/>
  <circle cx="760" cy="38"  r="1"   fill="#fff" opacity="0.6"/>
  <circle cx="840" cy="12"  r="0.7" fill="#c4b5fd" opacity="0.5"/>

  <!-- corner brackets TL -->
  <rect x="0"  y="0"  width="28" height="3"  fill="#a855f7"/>
  <rect x="0"  y="0"  width="3"  height="28" fill="#a855f7"/>
  <rect x="4"  y="4"  width="16" height="2"  fill="#ec4899" opacity="0.7"/>
  <rect x="4"  y="4"  width="2"  height="16" fill="#ec4899" opacity="0.7"/>
  <!-- TR -->
  <rect x="872" y="0"  width="28" height="3"  fill="#ec4899"/>
  <rect x="897" y="0"  width="3"  height="28" fill="#ec4899"/>
  <rect x="880" y="4"  width="16" height="2"  fill="#a855f7" opacity="0.7"/>
  <rect x="894" y="4"  width="2"  height="16" fill="#a855f7" opacity="0.7"/>
  <!-- BL -->
  <rect x="0"   y="257" width="28" height="3"  fill="#ec4899"/>
  <rect x="0"   y="232" width="3"  height="28" fill="#ec4899"/>
  <rect x="4"   y="254" width="16" height="2"  fill="#a855f7" opacity="0.7"/>
  <rect x="4"   y="240" width="2"  height="16" fill="#a855f7" opacity="0.7"/>
  <!-- BR -->
  <rect x="872" y="257" width="28" height="3"  fill="#a855f7"/>
  <rect x="897" y="232" width="3"  height="28" fill="#a855f7"/>
  <rect x="880" y="254" width="16" height="2"  fill="#ec4899" opacity="0.7"/>
  <rect x="894" y="240" width="2"  height="16" fill="#ec4899" opacity="0.7"/>

  <!-- accent bars -->
  <rect x="32" y="1"   width="836" height="2" fill="url(#accentg)" opacity="0.8"/>
  <rect x="32" y="257" width="836" height="2" fill="url(#accentg)" opacity="0.8"/>

  <!-- top status bar -->
  <rect x="0" y="0" width="900" height="32" fill="#0a0a1e" opacity="0.7"/>
  <rect x="36" y="9" width="9" height="14" rx="1" fill="#a855f7">
    <animate attributeName="opacity" values="1;0;1" dur="0.9s" repeatCount="indefinite"/>
  </rect>
  <text x="52" y="22" font-family="'Courier New',monospace" font-size="11" fill="#6b7280" letter-spacing="2">PLAYER_ONE.EXE</text>
  <circle cx="820" cy="16" r="4" fill="#10b981">
    <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text x="830" y="21" font-family="'Courier New',monospace" font-size="10" fill="#10b981">ONLINE</text>

  <!-- side bars -->
  <rect x="18" y="36" width="2" height="188" fill="#a855f7" opacity="0.25"/>
  <rect x="880" y="36" width="2" height="188" fill="#ec4899" opacity="0.25"/>

  <!-- name shadow -->
  <text x="450" y="122" font-family="'Courier New',monospace" font-size="54"
        font-weight="bold" text-anchor="middle"
        fill="#7c3aed" opacity="0.4" filter="url(#bigglow)" letter-spacing="6">${nameText}</text>
  <!-- name main -->
  <text x="450" y="122" font-family="'Courier New',monospace" font-size="54"
        font-weight="bold" text-anchor="middle"
        fill="url(#nameg)" filter="url(#glow)" letter-spacing="6">${nameText}</text>

  <!-- subtitle -->
  <text x="450" y="152" font-family="'Courier New',monospace" font-size="13"
        text-anchor="middle" fill="#c4b5fd" letter-spacing="4"
        filter="url(#sglow)">✦  ${bioText}  ·  IT STUDENT  ·  🇵🇭  ✦</text>

  <!-- thin divider -->
  <rect x="200" y="163" width="500" height="1" fill="url(#accentg)" opacity="0.6"/>

  <!-- stat boxes -->
  <!-- STARS -->
  <rect x="60"  y="176" width="120" height="44" rx="4" fill="#0f0f2a" stroke="#a855f7" stroke-width="1" opacity="0.9"/>
  <text x="120" y="194" font-family="'Courier New',monospace" font-size="9"  text-anchor="middle" fill="#6b7280" letter-spacing="2">⭐ STARS</text>
  <text x="120" y="212" font-family="'Courier New',monospace" font-size="16" text-anchor="middle" fill="#f0abfc" font-weight="bold" filter="url(#sglow)">${esc(String(data.stars))}</text>
  <!-- REPOS -->
  <rect x="195" y="176" width="120" height="44" rx="4" fill="#0f0f2a" stroke="#818cf8" stroke-width="1" opacity="0.9"/>
  <text x="255" y="194" font-family="'Courier New',monospace" font-size="9"  text-anchor="middle" fill="#6b7280" letter-spacing="2">📦 REPOS</text>
  <text x="255" y="212" font-family="'Courier New',monospace" font-size="16" text-anchor="middle" fill="#818cf8" font-weight="bold" filter="url(#sglow)">${esc(String(data.publicRepos))}</text>
  <!-- FOLLOWERS -->
  <rect x="330" y="176" width="120" height="44" rx="4" fill="#0f0f2a" stroke="#34d399" stroke-width="1" opacity="0.9"/>
  <text x="390" y="194" font-family="'Courier New',monospace" font-size="9"  text-anchor="middle" fill="#6b7280" letter-spacing="2">👥 FOLLOWERS</text>
  <text x="390" y="212" font-family="'Courier New',monospace" font-size="16" text-anchor="middle" fill="#34d399" font-weight="bold" filter="url(#sglow)">${esc(String(data.followers))}</text>
  <!-- FORKS -->
  <rect x="465" y="176" width="120" height="44" rx="4" fill="#0f0f2a" stroke="#f59e0b" stroke-width="1" opacity="0.9"/>
  <text x="525" y="194" font-family="'Courier New',monospace" font-size="9"  text-anchor="middle" fill="#6b7280" letter-spacing="2">🍴 FORKS</text>
  <text x="525" y="212" font-family="'Courier New',monospace" font-size="16" text-anchor="middle" fill="#f59e0b" font-weight="bold" filter="url(#sglow)">${esc(String(data.forks))}</text>
  <!-- VISITORS -->
  <rect x="600" y="176" width="120" height="44" rx="4" fill="#0f0f2a" stroke="#ec4899" stroke-width="1" opacity="0.9"/>
  <text x="660" y="194" font-family="'Courier New',monospace" font-size="9"  text-anchor="middle" fill="#6b7280" letter-spacing="2">👁 VISITORS</text>
  <text x="660" y="212" font-family="'Courier New',monospace" font-size="16" text-anchor="middle" fill="#ec4899" font-weight="bold" filter="url(#sglow)">${visitors}</text>
  <!-- LEVEL -->
  <rect x="735" y="176" width="120" height="44" rx="4" fill="#1a0533" stroke="#a855f7" stroke-width="1.5" opacity="0.95"/>
  <text x="795" y="194" font-family="'Courier New',monospace" font-size="9"  text-anchor="middle" fill="#6b7280" letter-spacing="2">⚔ LEVEL</text>
  <text x="795" y="212" font-family="'Courier New',monospace" font-size="16" text-anchor="middle" fill="#c084fc" font-weight="bold" filter="url(#glow)">∞</text>

  <!-- footer bar -->
  <rect x="0" y="232" width="900" height="28" fill="#0a0a1e" opacity="0.6"/>
  <text x="450" y="250" font-family="'Courier New',monospace" font-size="9"
        text-anchor="middle" fill="#374151" letter-spacing="1">AUTO-UPDATED: ${esc(now)}</text>
</svg>`;
}

function buildStatsCardSVG(data) {
  const now = new Date().toUTCString();

  // Percentage caps for visual display
  const reposPct    = Math.min((data.publicRepos / 50)  * 100, 100);
  const starsPct    = Math.min((data.stars       / 100) * 100, 100);
  const follPct     = Math.min((data.followers   / 200) * 100, 100);
  const forksPct    = Math.min((data.forks       / 50)  * 100, 100);
  const visitorsPct = typeof data.visitors === "number"
    ? Math.min((data.visitors / 5000) * 100, 100) : 0;
  const overallPct  = Math.round((reposPct + starsPct + follPct + forksPct) / 4);

  const visitors = typeof data.visitors === "number" ? esc(String(data.visitors)) : "—";
  const visitorsLabel = visitorsPct > 0 ? `${Math.round(visitorsPct)}%` : "—";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="340" viewBox="0 0 480 340">
  <defs>
    <linearGradient id="cbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#07071a"/>
      <stop offset="60%"  stop-color="#130a2e"/>
      <stop offset="100%" stop-color="#1a0533"/>
    </linearGradient>
    <linearGradient id="titleg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#f472b6"/>
      <stop offset="50%"  stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <linearGradient id="xpg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#7c3aed"/>
      <stop offset="50%"  stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="topbar" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#1a0533"/>
      <stop offset="50%"  stop-color="#2d1060"/>
      <stop offset="100%" stop-color="#1a0533"/>
    </linearGradient>
    <linearGradient id="track" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#1a1a3a"/>
      <stop offset="100%" stop-color="#0f0f2a"/>
    </linearGradient>
    <filter id="cglow" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="sglow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="1.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="cscan" x="0" y="0" width="480" height="3" patternUnits="userSpaceOnUse">
      <rect width="480" height="1" y="2" fill="#000" opacity="0.06"/>
    </pattern>
  </defs>

  <!-- background -->
  <rect width="480" height="340" rx="10" fill="url(#cbg)"/>
  <rect width="480" height="340" rx="10" fill="url(#cscan)"/>

  <!-- outer border -->
  <rect x="0.75" y="0.75" width="478.5" height="338.5" rx="9.5"
        fill="none" stroke="url(#titleg)" stroke-width="1.5" opacity="0.8"/>
  <rect x="3" y="3" width="474" height="334" rx="8"
        fill="none" stroke="#a855f7" stroke-width="0.5" opacity="0.2"/>

  <!-- corner accents -->
  <rect x="0"   y="0"   width="10" height="3"  rx="1" fill="#a855f7"/>
  <rect x="0"   y="0"   width="3"  height="10" rx="1" fill="#a855f7"/>
  <rect x="470" y="0"   width="10" height="3"  rx="1" fill="#ec4899"/>
  <rect x="477" y="0"   width="3"  height="10" rx="1" fill="#ec4899"/>
  <rect x="0"   y="337" width="10" height="3"  rx="1" fill="#ec4899"/>
  <rect x="0"   y="330" width="3"  height="10" rx="1" fill="#ec4899"/>
  <rect x="470" y="337" width="10" height="3"  rx="1" fill="#a855f7"/>
  <rect x="477" y="330" width="3"  height="10" rx="1" fill="#a855f7"/>

  <!-- title bar -->
  <rect x="0" y="0" width="480" height="42" rx="9" fill="url(#topbar)"/>
  <rect x="0" y="34" width="480" height="8" fill="url(#topbar)"/>
  <rect x="14" y="12" width="8" height="16" rx="1" fill="#a855f7">
    <animate attributeName="opacity" values="1;0;1" dur="0.9s" repeatCount="indefinite"/>
  </rect>
  <text x="30" y="28" font-family="'Courier New',monospace" font-size="13"
        font-weight="bold" fill="url(#titleg)" filter="url(#cglow)" letter-spacing="2">⚔  RPG STAT CARD  ⚔</text>
  <rect x="380" y="13" width="82" height="16" rx="3" fill="#0a2a1a" stroke="#10b981" stroke-width="0.8"/>
  <circle cx="390" cy="21" r="3" fill="#10b981">
    <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <text x="396" y="25" font-family="'Courier New',monospace" font-size="9" fill="#10b981" letter-spacing="1">LIVE DATA</text>

  <!-- player info -->
  <text x="240" y="70" font-family="'Courier New',monospace" font-size="17"
        font-weight="bold" text-anchor="middle" fill="url(#titleg)"
        filter="url(#cglow)">${esc(data.name.toUpperCase())}</text>
  <text x="240" y="86" font-family="'Courier New',monospace" font-size="10"
        text-anchor="middle" fill="#6b7280" letter-spacing="3">CLASS: FULL-STACK DEVELOPER</text>
  <rect x="190" y="93" width="100" height="18" rx="3" fill="#1a0533" stroke="#a855f7" stroke-width="0.8"/>
  <text x="240" y="106" font-family="'Courier New',monospace" font-size="9"
        text-anchor="middle" fill="#c084fc" letter-spacing="2">⚡ LVL ∞  ·  🇵🇭</text>

  <!-- divider -->
  <rect x="20" y="118" width="440" height="1" fill="url(#xpg)" opacity="0.4"/>

  <!-- REPOS -->
  <text x="20"  y="140" font-family="'Courier New',monospace" font-size="11" fill="#c4b5fd">📦 REPOS</text>
  <text x="108" y="140" font-family="'Courier New',monospace" font-size="11" fill="#f0abfc" font-weight="bold">${esc(String(data.publicRepos))}</text>
  ${gradientBar(140, 131, 270, 10, reposPct, "#a855f7", "#c084fc")}
  <text x="420" y="140" font-family="'Courier New',monospace" font-size="10" fill="#6b7280">${Math.round(reposPct)}%</text>

  <!-- STARS -->
  <text x="20"  y="164" font-family="'Courier New',monospace" font-size="11" fill="#c4b5fd">⭐ STARS</text>
  <text x="108" y="164" font-family="'Courier New',monospace" font-size="11" fill="#fbbf24" font-weight="bold">${esc(String(data.stars))}</text>
  ${gradientBar(140, 155, 270, 10, starsPct, "#f59e0b", "#fbbf24")}
  <text x="420" y="164" font-family="'Courier New',monospace" font-size="10" fill="#6b7280">${Math.round(starsPct)}%</text>

  <!-- FOLLOWERS -->
  <text x="20"  y="188" font-family="'Courier New',monospace" font-size="11" fill="#c4b5fd">👥 FOLLOWERS</text>
  <text x="128" y="188" font-family="'Courier New',monospace" font-size="11" fill="#34d399" font-weight="bold">${esc(String(data.followers))}</text>
  ${gradientBar(160, 179, 250, 10, follPct, "#10b981", "#34d399")}
  <text x="420" y="188" font-family="'Courier New',monospace" font-size="10" fill="#6b7280">${Math.round(follPct)}%</text>

  <!-- FORKS -->
  <text x="20"  y="212" font-family="'Courier New',monospace" font-size="11" fill="#c4b5fd">🍴 FORKS</text>
  <text x="108" y="212" font-family="'Courier New',monospace" font-size="11" fill="#f472b6" font-weight="bold">${esc(String(data.forks))}</text>
  ${gradientBar(140, 203, 270, 10, forksPct, "#ec4899", "#f472b6")}
  <text x="420" y="212" font-family="'Courier New',monospace" font-size="10" fill="#6b7280">${Math.round(forksPct)}%</text>

  <!-- VISITORS -->
  <text x="20"  y="236" font-family="'Courier New',monospace" font-size="11" fill="#c4b5fd">👁 VISITORS</text>
  <text x="118" y="236" font-family="'Courier New',monospace" font-size="11" fill="#a78bfa" font-weight="bold">${visitors}</text>
  ${gradientBar(160, 227, 250, 10, visitorsPct, "#7c3aed", "#a78bfa")}
  <text x="420" y="236" font-family="'Courier New',monospace" font-size="10" fill="#6b7280">${visitorsLabel}</text>

  <!-- divider -->
  <rect x="20" y="250" width="440" height="1" fill="url(#xpg)" opacity="0.4"/>

  <!-- OVERALL XP -->
  <text x="20" y="270" font-family="'Courier New',monospace" font-size="11" fill="#c4b5fd">⚡ OVERALL XP</text>
  <text x="420" y="270" font-family="'Courier New',monospace" font-size="10" fill="#6b7280">${overallPct}%</text>
  ${gradientBar(20, 277, 440, 12, overallPct, "url(#xpg)", "#f0abfc")}
  <text x="90" y="287" font-family="'Courier New',monospace" font-size="8" fill="#6b7280" opacity="0.8">KEEP GRINDING...</text>

  <!-- footer -->
  <rect x="0" y="308" width="480" height="32" rx="0" fill="#050510" opacity="0.8"/>
  <rect x="0" y="330" width="480" height="10" rx="0" fill="#050510" opacity="0.8"/>
  <rect x="20" y="308" width="440" height="1" fill="url(#xpg)" opacity="0.3"/>
  <text x="240" y="326" font-family="'Courier New',monospace" font-size="9"
        text-anchor="middle" fill="#374151" letter-spacing="1">UPDATED: ${esc(now)}</text>
</svg>`;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("⚔  Fetching GitHub data for", USERNAME, "...");
  const data = await getGitHubData();
  console.log("   name:", data.name, "| repos:", data.publicRepos,
              "| stars:", data.stars, "| followers:", data.followers,
              "| visitors:", data.visitors);

  if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const headerPath = path.join(ASSETS_DIR, "header.svg");
  const statsPath  = path.join(ASSETS_DIR, "stats-card.svg");

  fs.writeFileSync(headerPath, buildHeaderSVG(data), "utf8");
  console.log("✅  Written:", headerPath);

  fs.writeFileSync(statsPath, buildStatsCardSVG(data), "utf8");
  console.log("✅  Written:", statsPath);

  console.log("🎮  Done! Assets are ready.");
}

main().catch((err) => { console.error(err); process.exit(1); });
