# Complete Guide: Deploying IP-SAKTI Sahayak Online for Free (or Nearly Free)

This guide walks you through deploying the complete **IP-SAKTI Sahayak** application online — including **Next.js Frontend**, **FastAPI Backend**, **ChromaDB RAG (TKDL Corpus & Embeddings)**, and **LLM Reasoning** — so you can share a single link that anyone can open in their web browser.

---

## Architecture Overview: How Each Component Runs Online

| Component | Technology | Cloud Host (Free Tier) | Notes |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 15 App Router | **Vercel** (100% Free) | Provides the single public URL (e.g. `https://ip-sakti.vercel.app`). |
| **Backend & RAG** | FastAPI + ChromaDB + SentenceTransformers | **Render** or **Railway** (100% Free) | `all-MiniLM-L6-v2` and `ChromaDB` (~30MB) run directly on CPU within the backend container. No paid vector DB needed. |
| **LLM Inference** | High-speed LLM | **Groq Cloud** or **Google Gemini** (100% Free) | Cloud hosts cannot run 9GB local Ollama on free 512MB RAM tiers. Using Groq or Gemini's free API provides sub-second responses (~0.5s vs 30s) at **$0.00 cost** with no credit card required. |

---

## 🚀 Method 1: The Modern Free Cloud Stack (Recommended)
This gives you a permanent, fast, 24/7 web link to share with anyone.

### Step 1: Get a Free High-Speed LLM API Key (2 Minutes)
1. Go to [Groq Console](https://console.groq.com/) (100% Free, no credit card required).
2. Sign in with Google / GitHub and click **API Keys** -> **Create API Key**.
3. Copy the key (starts with `gsk_...`).
> *Alternative*: You can also use [Google AI Studio](https://aistudio.google.com/) (`AIza...`) with `LLM_MODEL=gemini-2.0-flash`.

---

### Step 2: Deploy the Backend on Render (100% Free)
1. Push your repository to **GitHub** (if not already done).
2. Go to [Render.com](https://render.com/) and create a free account.
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the deployment settings:
   - **Name:** `ip-sakti-backend`
   - **Root Directory:** `backend` (or leave empty if using Dockerfile)
   - **Runtime:** `Docker` (Render will automatically detect `backend/Dockerfile`)
   - **Instance Type:** `Free`
6. Add the following **Environment Variables** in Render's dashboard:
   - `LLM_PROVIDER`: `openai`
   - `OPENAI_BASE_URL`: `https://api.groq.com/openai/v1`
   - `OPENAI_API_KEY`: `gsk_your_groq_key_here`
   - `LLM_MODEL`: `llama-3.3-70b-versatile` *(or `gemma2-9b-it`)*
   - `CORS_ORIGINS`: `*`
   - `SECRET_KEY`: *Any random string (e.g. `sakti-secret-key-12345`)*
7. Click **Create Web Service**.
8. Once deployed, Render will give you a backend URL like:
   `https://ip-sakti-backend.onrender.com`

---

### Step 3: Deploy the Frontend on Vercel (100% Free)
1. Go to [Vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository.
4. In the configuration screen:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click "Edit" and choose:
     `IP-SAKTI-frontend/frontend-koutsa`
5. Open the **Environment Variables** section and add:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://ip-sakti-backend.onrender.com` *(your Render backend URL from Step 2, no trailing slash)*
6. Click **Deploy**.
7. In ~2 minutes, Vercel will give you your final public link:
   👉 **`https://ip-sakti-sahayak.vercel.app`**

🎉 **You're done!** Anyone who visits that link can register, view the OTP directly on-screen (demo mode), run Ayurvedic formulation patent classifications, and get grounded RAG evidence with instant AI reasoning.

---

## ⚡ Method 2: Instant Live Web Link in 60 Seconds (Zero Cloud Setup)
If you want to share a live working link **right now** directly from your computer without configuring cloud hosting:

You can use **Cloudflare Tunnel** (free, secure HTTPS, no account needed):

1. Start your local stack:
   - In Terminal 1: Run the backend (`./run-backend.ps1` or `bash run-backend.sh`)
   - In Terminal 2: Run the frontend (`./run-frontend.ps1` or `bash run-frontend.sh`)
2. Download `cloudflared`:
   - Windows (PowerShell with winget):
     ```powershell
     winget install --id Cloudflare.cloudflared
     ```
   - Or download standalone exe from [Cloudflare Releases](https://github.com/cloudflare/cloudflared/releases).
3. Expose your frontend to the public internet:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
4. Cloudflare will output a public HTTPS link:
   ```text
   +-----------------------------------------------------------------------+
   |  Your quick Tunnel has been created! Visit it at:                    |
   |  https://some-random-words.trycloudflare.com                         |
   +-----------------------------------------------------------------------+
   ```
5. Share that URL! Anyone can access your full app running on your computer.

*(Note: Your computer needs to stay awake with the terminals open while people use it).*

---

## 🐳 Method 3: Hugging Face Spaces (All-in-One Free Container, Single URL)
Hugging Face Spaces provides **2 vCPU, 16 GB RAM, 50 GB Disk for FREE**.

1. Create a free account at [huggingface.co](https://huggingface.co/).
2. Create a **New Space**:
   - SDK: **Docker** (Blank)
   - Space Hardware: **CPU Basic (Free - 16GB RAM)**
3. Push your repository to the Space Git remote.
4. Set Space Secrets:
   - `LLM_PROVIDER`: `openai`
   - `OPENAI_BASE_URL`: `https://api.groq.com/openai/v1`
   - `OPENAI_API_KEY`: `gsk_...`
   - `LLM_MODEL`: `llama-3.3-70b-versatile`
5. Hugging Face gives you a single clean link:
   `https://username-space-name.hf.space`

---

## 🛡️ How to Keep it Running 24/7 Constantly for 28 Days

If you need the app to remain online continuously for **28 days** (e.g. for hackathon evaluation, patent jury review, or demo testing) without sleeping or shutting down:

### The Free Tier Math
- **Render Free Tier:** Provides **750 free instance hours** every month.
- **Your Requirement:** 28 days × 24 hours = **672 hours**.
- **Conclusion:** 672 hours is **well within the 750-hour free limit**! You will **NOT** be charged.

---

### Step-by-Step: Keeping it 100% Awake & Persistent for 28 Days

#### 1. Eliminate Cold Starts with UptimeRobot (100% Free)
Render free services put apps to sleep after 15 minutes of inactivity. To keep it awake 24/7:
1. Go to [UptimeRobot.com](https://uptimerobot.com/) and register a free account.
2. Click **Add New Monitor**.
3. Settings:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `IP-SAKTI Backend Keep-Alive`
   - **URL (or IP):** `https://your-backend.onrender.com/health`
   - **Monitoring Interval:** `10 minutes`
4. Click **Create Monitor**.
Now UptimeRobot pings your `/health` endpoint every 10 minutes. Your backend **never sleeps**, stays warm, and gives instantaneous responses to anyone who opens your link anytime during the 28 days!

#### 2. Keep User Accounts & Case History Safe (Free Cloud Database)
On free cloud containers, local SQLite disk is ephemeral and can wipe on redeploys. To make sure all created users, login sessions, and case history persist safely across all 28 days:
1. Go to [Neon.tech](https://neon.tech/) (100% free serverless PostgreSQL, no credit card required).
2. Create a free project called `ipsakti`.
3. Copy the Postgres connection string:
   `postgresql://user:password@ep-xyz.aws.neon.tech/neondb?sslmode=require`
4. In your **Render Dashboard** environment variables, set:
   - `DATABASE_URL`: paste your Neon connection string.
Your backend automatically creates the tables, and all data is preserved permanently for all 28 days.

---

### Alternative Free / Cheap Options for 28 Days

| Provider | Cost for 28 Days | Setup | Reliability |
| :--- | :--- | :--- | :--- |
| **Vercel + Render + UptimeRobot + Neon** | **$0.00 (100% Free)** | 10 mins (as described above) | ⭐⭐⭐⭐⭐ (Zero cost, never sleeps, persistent data) |
| **Google Cloud (GCP) $300 Trial** | **$0.00 (Free Credits)** | 15 mins (Spin up `e2-medium` VM with Docker) | ⭐⭐⭐⭐⭐ (Dedicated Linux VM, 90 days validity) |
| **Hetzner Cloud VPS (CX22)** | **~$3.80 total (₹320 INR)** | 5 mins (Single 4GB RAM server) | ⭐⭐⭐⭐⭐ (Dedicated resources, no pingers required) |
