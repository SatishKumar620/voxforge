const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "../data/episodes.json");

// Ensure data dir exists
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

// Save episode locally
router.post("/save", (req, res) => {
  const episodes = readEpisodes();
  const episode = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  episodes.unshift(episode);
  writeEpisodes(episodes);
  res.json({ success: true, episode });
});

// Get all episodes
router.get("/", (req, res) => {
  res.json(readEpisodes());
});

// Delete episode
router.delete("/:id", (req, res) => {
  const episodes = readEpisodes().filter((e) => e.id !== req.params.id);
  writeEpisodes(episodes);
  res.json({ success: true });
});

module.exports = router;
