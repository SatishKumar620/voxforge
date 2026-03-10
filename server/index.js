require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const scriptRoutes    = require("./routes/script");
const narrationRoutes = require("./routes/narration");
const publishRoutes   = require("./routes/publish");
const episodesRoutes  = require("./routes/episodes");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Ensure directories exist
["audio","data"].forEach(d => {
  const p = path.join(__dirname, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Serve audio files
app.use("/audio", express.static(path.join(__dirname, "audio")));

// Serve RSS feed (from data/ in dev, client/build in prod)
app.get("/rss.xml", (req, res) => {
  const devRss  = path.join(__dirname, "data/rss.xml");
  const prodRss = path.join(__dirname, "../client/build/rss.xml");
  const rssFile = fs.existsSync(prodRss) ? prodRss : devRss;
  if (fs.existsSync(rssFile)) {
    res.setHeader("Content-Type", "application/rss+xml");
    res.sendFile(rssFile);
  } else {
    res.status(404).send("No RSS feed yet — publish your first episode.");
  }
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/script",    scriptRoutes);
app.use("/api/narration", narrationRoutes);
app.use("/api/publish",   publishRoutes);
app.use("/api/episodes",  episodesRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    services: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      murf:      !!process.env.MURF_API_KEY,
    },
    rssUrl: `${process.env.BASE_URL || "http://localhost:" + PORT}/rss.xml`,
  });
});

// ── Serve React build in production ──────────────────────────────────────────
const clientBuild = path.join(__dirname, "../client/build");
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get("*", (req, res) => res.sendFile(path.join(clientBuild, "index.html")));
}

app.listen(PORT, () => {
  console.log(`\n🎙  VoxForge running on port ${PORT}`);
  console.log(`   Claude AI : ${process.env.ANTHROPIC_API_KEY ? "✓" : "✗ missing ANTHROPIC_API_KEY"}`);
  console.log(`   Murf AI   : ${process.env.MURF_API_KEY      ? "✓" : "✗ missing MURF_API_KEY (demo mode)"}`);
  console.log(`   RSS Feed  : ${process.env.BASE_URL || "http://localhost:" + PORT}/rss.xml\n`);
});
