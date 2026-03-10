const express = require("express");
const router = express.Router();
const axios = require("axios");

router.post("/generate", async (req, res) => {
  const { idea, category, duration, voiceTone } = req.body;

  if (!idea) return res.status(400).json({ error: "Idea is required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on server" });

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: `You are VoxForge, a world-class podcast scriptwriter. Write compelling, natural-sounding podcast scripts.
Return ONLY valid JSON — no markdown, no code fences:
{
  "title": "Catchy episode title",
  "description": "2-sentence episode description suitable for podcast directories",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "script": "Full script. Use [INTRO], [MAIN], [OUTRO] section markers. Write naturally for spoken delivery — contractions, rhetorical questions, pauses marked as '...' and emphasis with CAPS. Target exactly ${duration || 10} minutes of spoken audio at ~150 words/min."
}`,
        messages: [
          {
            role: "user",
            content: `Category: ${category || "General"}\nIdea: ${idea}\nDuration: ${duration || 10} minutes\nVoice style: ${voiceTone || "Professional"}`,
          },
        ],
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
      }
    );

    const raw = response.data.content?.map((b) => b.text || "").join("");
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ success: true, ...parsed });
  } catch (err) {
    console.error("Script error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;
