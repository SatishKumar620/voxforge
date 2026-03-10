const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../data/episodes.json");
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "[]");

function readEpisodes() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf8")); }
  catch { return []; }
}
function writeEpisodes(eps) {
  fs.writeFileSync(DB_PATH, JSON.stringify(eps, null, 2));
}

// ── Publish: save episode + generate RSS ─────────────────────────────────────
router.post("/", async (req, res) => {
  const { title, description, tags, audioFilename, duration, category } = req.body;

  if (!title) return res.status(400).json({ error: "title is required" });

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const audioUrl = audioFilename ? `${baseUrl}/audio/${audioFilename}` : null;

  const episode = {
    id: Date.now().toString(),
    title,
    description,
    tags: tags || [],
    category,
    duration,
    audioFilename,
    audioUrl,
    publishedAt: new Date().toISOString(),
    guid: `voxforge-${Date.now()}`,
  };

  const episodes = readEpisodes();
  episodes.unshift(episode);
  writeEpisodes(episodes);

  // Re-generate RSS feed
  generateRSS(episodes, baseUrl);

  res.json({
    success: true,
    episode,
    rssUrl: `${baseUrl}/rss.xml`,
    message: "Episode published. Submit your RSS feed to Spotify & Apple once.",
    submitLinks: {
      spotify: "https://podcasters.spotify.com/",
      apple:   "https://podcastsconnect.apple.com/",
      amazon:  "https://music.amazon.com/podcasts/submission",
    },
  });
});

// ── Generate RSS 2.0 feed ─────────────────────────────────────────────────────
function generateRSS(episodes, baseUrl) {
  const podcastTitle   = process.env.PODCAST_TITLE   || "VoxForge Podcast";
  const podcastDesc    = process.env.PODCAST_DESC    || "AI-generated podcast episodes";
  const podcastAuthor  = process.env.PODCAST_AUTHOR  || "VoxForge";
  const podcastEmail   = process.env.PODCAST_EMAIL   || "hello@voxforge.ai";
  const podcastLang    = process.env.PODCAST_LANG    || "en";
  const podcastImg     = process.env.PODCAST_IMAGE   || `${baseUrl}/cover.jpg`;

  const items = episodes.map(ep => {
    const pubDate = new Date(ep.publishedAt).toUTCString();
    const durationSecs = parseInt(ep.duration || 10) * 60;
    const audioUrl = ep.audioUrl || "";
    const tagsStr  = (ep.tags || []).join(", ");
    return `
    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.description || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${ep.guid}</guid>
      <itunes:title><![CDATA[${ep.title}]]></itunes:title>
      <itunes:summary><![CDATA[${ep.description || ""}]]></itunes:summary>
      <itunes:duration>${durationSecs}</itunes:duration>
      <itunes:keywords>${tagsStr}</itunes:keywords>
      <itunes:explicit>no</itunes:explicit>
      ${audioUrl ? `<enclosure url="${audioUrl}" type="audio/mpeg" length="0" />` : ""}
    </item>`;
  }).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[${podcastTitle}]]></title>
    <description><![CDATA[${podcastDesc}]]></description>
    <link>${baseUrl}</link>
    <language>${podcastLang}</language>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <itunes:author>${podcastAuthor}</itunes:author>
    <itunes:email>${podcastEmail}</itunes:email>
    <itunes:image href="${podcastImg}" />
    <itunes:category text="Technology" />
    <itunes:explicit>no</itunes:explicit>
    <itunes:owner>
      <itunes:name>${podcastAuthor}</itunes:name>
      <itunes:email>${podcastEmail}</itunes:email>
    </itunes:owner>
    ${items}
  </channel>
</rss>`;

  const rssPath = path.join(__dirname, "../../client/build/rss.xml");
  // Also write to server/data for dev mode
  const rssDevPath = path.join(__dirname, "../data/rss.xml");
  try { fs.writeFileSync(rssDevPath, rss); } catch {}
  try { if (fs.existsSync(path.dirname(rssPath))) fs.writeFileSync(rssPath, rss); } catch {}
}

module.exports = router;
module.exports.generateRSS = generateRSS;
