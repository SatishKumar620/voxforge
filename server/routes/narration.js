const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Real Murf AI voice IDs — from murf.ai voice library
// These are verified Murf voice IDs. Update if Murf changes their catalog.
const MURF_VOICES = {
  "en-US-marcus":  { name: "Marcus",  gender: "male",   accent: "American",   style: "Conversational" },
  "en-US-terrell": { name: "Terrell", gender: "male",   accent: "American",   style: "Promo" },
  "en-GB-alfie":   { name: "Alfie",   gender: "male",   accent: "British",    style: "Conversational" },
  "en-US-natalie": { name: "Natalie", gender: "female", accent: "American",   style: "Conversational" },
  "en-GB-hazel":   { name: "Hazel",   gender: "female", accent: "British",    style: "Conversational" },
  "en-AU-jack":    { name: "Jack",    gender: "male",   accent: "Australian", style: "Conversational" },
};

router.get("/voices", (req, res) => {
  res.json({ voices: MURF_VOICES });
});

router.post("/generate", async (req, res) => {
  const { script, voiceId, pitch = 0, speed = 0 } = req.body;

  if (!script) return res.status(400).json({ error: "Script is required" });
  if (!voiceId) return res.status(400).json({ error: "voiceId is required" });

  const murfKey = process.env.MURF_API_KEY;
  if (!murfKey) {
    return res.status(400).json({
      error: "MURF_API_KEY not configured",
      demo: true,
      message: "Add MURF_API_KEY to your environment to enable real voice synthesis",
    });
  }

  try {
    // Murf has a 3000 char limit per request — chunk if needed
    const chunks = chunkScript(script, 2800);
    const audioBuffers = [];

    for (const chunk of chunks) {
      const response = await axios.post(
        "https://api.murf.ai/v1/speech/generate",
        {
          voiceId,
          text: chunk,
          format: "MP3",
          sampleRate: 44100,
          speed,
          pitch,
          channelType: "MONO",
          pronunciationDictionary: {},
          encodeAsBase64: false,
          variation: 1,
          audioDuration: 0,
          modelVersion: "GEN2",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": murfKey,
          },
          responseType: "arraybuffer",
          timeout: 60000,
        }
      );
      audioBuffers.push(Buffer.from(response.data));
    }

    // Save merged audio to disk
    const filename = `${uuidv4()}.mp3`;
    const audioDir = path.join(__dirname, "../audio");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
    const filePath = path.join(audioDir, filename);
    fs.writeFileSync(filePath, Buffer.concat(audioBuffers));

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    res.json({
      success: true,
      audioUrl: `${baseUrl}/audio/${filename}`,
      filename,
      size: fs.statSync(filePath).size,
    });
  } catch (err) {
    console.error("Murf error:", err.response?.data?.toString() || err.message);
    const errMsg = err.response?.data
      ? JSON.parse(err.response.data.toString())?.errorMessage || "Murf API error"
      : err.message;
    res.status(500).json({ error: errMsg });
  }
});

// Split long scripts into chunks at sentence boundaries
function chunkScript(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

module.exports = router;
