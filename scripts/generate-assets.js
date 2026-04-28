/**
 * generate-assets.js
 *
 * Fetches live GitHub data for Rossyyyyyy and writes two unique SVG files:
 *   - assets/header.svg      → animated game-style banner with live stats
 *   - assets/stats-card.svg  → RPG stat card with real GitHub numbers
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

/** Escape text for safe SVG embedding */
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build a pixel-style progress bar SVG snippet */
function pixelBar(x, y, width, pct, color) {
  const filled = Math.round((width * Math.min(pct, 100)) / 100);
  const blocks = Math.floor(filled / 6);
  let bar = "";
  for (let i = 0; i < Math.floor(width / 6); i++) {
    const bx   = x + i * 6;
    const fill = i < blocks ? color : "#1e1e3a";
    bar += `<rect x="${bx}" y="${y}" width="5" height="8" rx="1" fill="${fill}"/>`;
  }
  return bar;
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

    return {
      name       : user.name        || USERNAME,
      bio        : user.bio         || "Full-Stack Developer",
      followers  : user.followers   || 0,
      following  : user.following   || 0,
      publicRepos: user.public_repos || 0,
      stars,
      forks,
      avatarUrl  : user.avatar_url  || "",
      createdAt  : user.created_at  || "",
    };
  } catch {
    // fallback so the Action never hard-fails
    return {
      name: USERNAME, bio: "Full-Stack Developer",
      followers: 0, following: 0, publicRepos: 0,
      stars: 0, forks: 0, avatarUrl: "", createdAt: "",
    };
  }
}

// ─── SVG generators ──────────────────────────────────────────────────────────

function buildHeaderSVG(data) {
  const now = new Date().toUTCString();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="220" viewBox="0 0 900 220">
  <defs>
    <!-- background gradient -->
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#0f0f1a"/>
      <stop offset="50%"  stop-color="#1a0533"/>
      <stop offset="100%" stop-color="#0f0f1a"/>
    </linearGradient>
    <!-- purple glow gradient for text -->
    <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#c084fc"/>
      <stop offset="50%"  stop-color="#f0abfc"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <!-- scanline pattern for CRT effect -->
    <pattern id="scan" x="0" y="0" width="900" height="4" patternUnits="userSpaceOnUse">
      <rect width="900" height="1" y="3" fill="#000" opacity="0.08"/>
    </pattern>
    <!-- glow filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- background -->
  <rect width="900" height="220" fill="url(#bg)"/>
  <!-- CRT scanlines overlay -->
  <rect width="900" height="220" fill="url(#scan)"/>

  <!-- decorative corner pixels TL -->
  <rect x="0"  y="0"  width="8" height="8"  fill="#a855f7"/>
  <rect x="8"  y="0"  width="4" height="4"  fill="#a855f7" opacity="0.6"/>
  <rect x="0"  y="8"  width="4" height="4"  fill="#a855f7" opacity="0.6"/>
  <!-- decorative corner pixels TR -->
  <rect x="892" y="0"  width="8" height="8"  fill="#ec4899"/>
  <rect x="888" y="0"  width="4" height="4"  fill="#ec4899" opacity="0.6"/>
  <rect x="892" y="8"  width="4" height="4"  fill="#ec4899" opacity="0.6"/>
  <!-- decorative corner pixels BL -->
  <rect x="0"   y="212" width="8" height="8" fill="#ec4899"/>
  <rect x="8"   y="216" width="4" height="4" fill="#ec4899" opacity="0.6"/>
  <rect x="0"   y="208" width="4" height="4" fill="#ec4899" opacity="0.6"/>
  <!-- decorative corner pixels BR -->
  <rect x="892" y="212" width="8" height="8" fill="#a855f7"/>
  <rect x="888" y="216" width="4" height="4" fill="#a855f7" opacity="0.6"/>
  <rect x="892" y="208" width="4" height="4" fill="#a855f7" opacity="0.6"/>

  <!-- top border line -->
  <rect x="12" y="3"   width="876" height="2" fill="#a855f7" opacity="0.5"/>
  <!-- bottom border line -->
  <rect x="12" y="215" width="876" height="2" fill="#ec4899" opacity="0.5"/>

  <!-- blinking cursor decoration -->
  <rect x="40" y="30" width="10" height="16" fill="#a855f7" opacity="0.9">
    <animate attributeName="opacity" values="0.9;0;0.9" dur="1s" repeatCount="indefinite"/>
  </rect>

  <!-- [ PLAYER ONE ] label -->
  <text x="60" y="44" font-family="'Courier New', monospace" font-size="12"
        fill="#6b7280" letter-spacing="3">[ PLAYER ONE ]</text>

  <!-- main name with glow -->
  <text x="450" y="110" font-family="'Courier New', monospace" font-size="52"
        font-weight="bold" text-anchor="middle" fill="url(#tg)"
        filter="url(#softglow)" letter-spacing="4">${esc(data.name.toUpperCase())}</text>

  <!-- subtitle -->
  <text x="450" y="140" font-family="'Courier New', monospace" font-size="14"
        text-anchor="middle" fill="#c4b5fd" letter-spacing="2"
        filter="url(#glow)">${esc(data.bio)}</text>

  <!-- divider dots -->
  <text x="450" y="162" font-family="'Courier New', monospace" font-size="12"
        text-anchor="middle" fill="#a855f7" opacity="0.7">· · · · · · · · · · · · · · · · · · · ·</text>

  <!-- live stats row -->
  <text x="160" y="188" font-family="'Courier New', monospace" font-size="11"
        text-anchor="middle" fill="#f0abfc">⭐ ${esc(String(data.stars))} STARS</text>
  <text x="290" y="188" font-family="'Courier New', monospace" font-size="11"
        text-anchor="middle" fill="#818cf8">📦 ${esc(String(data.publicRepos))} REPOS</text>
  <text x="450" y="188" font-family="'Courier New', monospace" font-size="11"
        text-anchor="middle" fill="#34d399">👥 ${esc(String(data.followers))} FOLLOWERS</text>
  <text x="620" y="188" font-family="'Courier New', monospace" font-size="11"
        text-anchor="middle" fill="#f59e0b">🍴 ${esc(String(data.forks))} FORKS</text>
  <text x="760" y="188" font-family="'Courier New', monospace" font-size="11"
        text-anchor="middle" fill="#ec4899">🇵🇭 PHILIPPINES</text>

  <!-- last updated -->
  <text x="450" y="212" font-family="'Courier New', monospace" font-size="9"
        text-anchor="middle" fill="#374151" letter-spacing="1">AUTO-UPDATED: ${esc(now)}</text>
</svg>`;
}

function buildStatsCardSVG(data) {
  const now = new Date().toUTCString();

  // Clamp values for bar display (max caps for visual purposes)
  const reposPct  = Math.min((data.publicRepos / 50)  * 100, 100);
  const starsPct  = Math.min((data.stars       / 100) * 100, 100);
  const follPct   = Math.min((data.followers   / 200) * 100, 100);
  const forksPct  = Math.min((data.forks       / 50)  * 100, 100);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280">
  <defs>
    <linearGradient id="cbg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#0f0f1a"/>
      <stop offset="100%" stop-color="#1a0533"/>
    </linearGradient>
    <filter id="cglow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- scanlines -->
    <pattern id="cscan" x="0" y="0" width="480" height="4" patternUnits="userSpaceOnUse">
      <rect width="480" height="1" y="3" fill="#000" opacity="0.07"/>
    </pattern>
  </defs>

  <!-- card background -->
  <rect width="480" height="280" rx="8" fill="url(#cbg)"/>
  <rect width="480" height="280" rx="8" fill="url(#cscan)"/>
  <!-- border -->
  <rect x="1" y="1" width="478" height="278" rx="7"
        fill="none" stroke="#a855f7" stroke-width="1.5" opacity="0.7"/>
  <!-- inner border accent -->
  <rect x="4" y="4" width="472" height="272" rx="5"
        fill="none" stroke="#ec4899" stroke-width="0.5" opacity="0.3"/>

  <!-- corner pixels -->
  <rect x="0"   y="0"   width="6" height="6" rx="1" fill="#a855f7"/>
  <rect x="474" y="0"   width="6" height="6" rx="1" fill="#ec4899"/>
  <rect x="0"   y="274" width="6" height="6" rx="1" fill="#ec4899"/>
  <rect x="474" y="274" width="6" height="6" rx="1" fill="#a855f7"/>

  <!-- title bar -->
  <rect x="0" y="0" width="480" height="36" rx="7" fill="#1a0533"/>
  <rect x="0" y="28" width="480" height="8"  fill="#1a0533"/>

  <!-- blinking cursor in title -->
  <rect x="14" y="10" width="8" height="14" fill="#a855f7">
    <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
  </rect>
  <text x="30" y="24" font-family="'Courier New', monospace" font-size="13"
        font-weight="bold" fill="#f0abfc" filter="url(#cglow)"
        letter-spacing="2">⚔  RPG STAT CARD  ⚔</text>
  <text x="380" y="24" font-family="'Courier New', monospace" font-size="10"
        fill="#6b7280">LIVE DATA</text>

  <!-- player name -->
  <text x="240" y="62" font-family="'Courier New', monospace" font-size="16"
        font-weight="bold" text-anchor="middle" fill="#c084fc"
        filter="url(#cglow)">${esc(data.name.toUpperCase())}</text>
  <text x="240" y="78" font-family="'Courier New', monospace" font-size="10"
        text-anchor="middle" fill="#6b7280" letter-spacing="2">CLASS: FULL-STACK DEVELOPER</text>

  <!-- divider -->
  <rect x="20" y="86" width="440" height="1" fill="#a855f7" opacity="0.3"/>

  <!-- stat rows -->
  <!-- REPOS -->
  <text x="20"  y="108" font-family="'Courier New', monospace" font-size="11" fill="#c4b5fd">📦 REPOS</text>
  <text x="110" y="108" font-family="'Courier New', monospace" font-size="11" fill="#f0abfc">${esc(String(data.publicRepos))}</text>
  ${pixelBar(140, 100, 270, reposPct, "#a855f7")}
  <text x="420" y="108" font-family="'Courier New', monospace" font-size="10" fill="#6b7280">${Math.round(reposPct)}%</text>

  <!-- STARS -->
  <text x="20"  y="132" font-family="'Courier New', monospace" font-size="11" fill="#c4b5fd">⭐ STARS</text>
  <text x="110" y="132" font-family="'Courier New', monospace" font-size="11" fill="#fbbf24">${esc(String(data.stars))}</text>
  ${pixelBar(140, 124, 270, starsPct, "#f59e0b")}
  <text x="420" y="132" font-family="'Courier New', monospace" font-size="10" fill="#6b7280">${Math.round(starsPct)}%</text>

  <!-- FOLLOWERS -->
  <text x="20"  y="156" font-family="'Courier New', monospace" font-size="11" fill="#c4b5fd">👥 FOLLOWERS</text>
  <text x="130" y="156" font-family="'Courier New', monospace" font-size="11" fill="#34d399">${esc(String(data.followers))}</text>
  ${pixelBar(160, 148, 250, follPct, "#10b981")}
  <text x="420" y="156" font-family="'Courier New', monospace" font-size="10" fill="#6b7280">${Math.round(follPct)}%</text>

  <!-- FORKS -->
  <text x="20"  y="180" font-family="'Courier New', monospace" font-size="11" fill="#c4b5fd">🍴 FORKS</text>
  <text x="110" y="180" font-family="'Courier New', monospace" font-size="11" fill="#f472b6">${esc(String(data.forks))}</text>
  ${pixelBar(140, 172, 270, forksPct, "#ec4899")}
  <text x="420" y="180" font-family="'Courier New', monospace" font-size="10" fill="#6b7280">${Math.round(forksPct)}%</text>

  <!-- divider -->
  <rect x="20" y="194" width="440" height="1" fill="#a855f7" opacity="0.3"/>

  <!-- XP bar label -->
  <text x="20" y="214" font-family="'Courier New', monospace" font-size="11"
        fill="#c4b5fd">⚡ OVERALL XP</text>
  <!-- XP bar (average of all stats) -->
  ${pixelBar(20, 220, 440, Math.round((reposPct + starsPct + follPct + forksPct) / 4), "#818cf8")}

  <!-- footer -->
  <rect x="0" y="254" width="480" height="26" rx="0" fill="#0a0a14"/>
  <rect x="0" y="272" width="480" height="8"  rx="0" fill="#0a0a14"/>
  <text x="240" y="268" font-family="'Courier New', monospace" font-size="9"
        text-anchor="middle" fill="#374151" letter-spacing="1">UPDATED: ${esc(now)}</text>
</svg>`;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("⚔  Fetching GitHub data for", USERNAME, "...");
  const data = await getGitHubData();
  console.log("   name:", data.name, "| repos:", data.publicRepos,
              "| stars:", data.stars, "| followers:", data.followers);

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
