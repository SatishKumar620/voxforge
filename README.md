# 🎙 VoxForge — AI Podcast Studio

**Idea → Script (Claude AI) → Voice (Murf AI) → Self-hosted RSS → Spotify + Apple Podcasts**

No Buzzsprout. No middlemen. Your RSS feed lives on your own server.

---

## ⚡ Step 1 — Push to GitHub

```bash
# Unzip and enter the folder
unzip voxforge.zip && cd voxforge

# Initialize git
git init
git add .
git commit -m "Initial VoxForge commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/voxforge.git
git branch -M main
git push -u origin main
```

---

## 🚀 Step 2 — Deploy on Render (free)

1. Go to **[render.com](https://render.com)** → Sign up / Log in
2. Click **New +** → **Web Service**
3. Connect your GitHub account → Select the **voxforge** repo
4. Render auto-detects settings from `render.yaml` — confirm:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
5. Scroll to **Environment Variables** → Add these:

| Key | Value | Required |
|-----|-------|----------|
| `ANTHROPIC_API_KEY` | From console.anthropic.com | YES |
| `MURF_API_KEY` | From murf.ai Dashboard → API | For real voice |
| `BASE_URL` | Your Render URL e.g. `https://voxforge.onrender.com` | YES |
| `PODCAST_TITLE` | Your podcast name | Optional |
| `PODCAST_AUTHOR` | Your name | Optional |
| `PODCAST_EMAIL` | Your email | Optional |

6. Click **Create Web Service** → deploys in ~3 min
7. App is live at `https://your-name.onrender.com`

> Free tier spins down after 15 min idle. First request = ~30s wake time.
> Upgrade to $7/mo for always-on.

---

## 💻 Run Locally 

```bash
pip update && pip install nodejs git -y
cd voxforge
npm run install:all
cp .env.example .env
nano .env        # fill in your keys
npm run build && npm start
# open http://localhost:5000
```

---

## 📡 RSS & Publishing

Your RSS feed: `https://your-app.onrender.com/rss.xml`

Submit this URL **once** to each platform — they pull new episodes automatically:

- Spotify: https://podcasters.spotify.com/
- Apple Podcasts: https://podcastsconnect.apple.com/
- Amazon Music: https://music.amazon.com/podcasts/submission
- iHeart: https://www.iheart.com/content/submit-your-podcast/

---

## 💰 Earning Money

| Method | Earnings |
|--------|----------|
| Spotify Partner Program | ~$0.003–0.005 per stream |
| Apple Subscriptions | $0.99–$9.99/month per subscriber |
| Sponsorships (1K+ downloads) | $15–$50 CPM |
| Listener donations | Direct via PayPal/Stripe in description |

---

## 🏗 Structure

```
voxforge/
├── server/
│   ├── index.js
│   └── routes/
│       ├── script.js      # Claude AI
│       ├── narration.js   # Murf AI
│       ├── publish.js     # RSS generation
│       └── episodes.js
├── client/src/App.js      # React UI
├── render.yaml
└── .env.example
```
