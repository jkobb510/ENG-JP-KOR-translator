# Translator App (English ↔ Japanese/Korean)

## Description

This application is a full-stack translator featuring a Node.js/Express backend deployed on Railway and a static frontend hosted on GitHub Pages. It prioritizes local custom translations from `overrides.json` and falls back to the **Google Cloud Translation API (v2)** for all other text. It also provides high-quality text-to-speech pronunciation using **Google Cloud Text-to-Speech API**.

---

## Features

* **Custom Overrides:** Exact input matches are served instantly from `overrides.json`, reducing API calls.
* **Google Cloud Translation API:** Handles standard translations for non-overridden inputs.
* **High-Quality Pronunciation:** Uses Google Cloud Text-to-Speech with Neural2 voices for Japanese and Korean.
* **Language Swap:** One-click button to swap input and target languages (like Google Translate).
* **Modular Frontend:** ESM-based JavaScript modules for clean separation of concerns (`translate.js`, `pronounce.js`, `swap.js`, `selectLanguage.js`).
* **Custom Language Selectors:** Accessible, keyboard-navigable dropdowns with smooth animations.
* **CORS-Enabled Backend:** Configurable via `ALLOWED_ORIGINS` environment variable for secure cross-origin requests.
* **PR Preview Deployments:** Railway automatically creates preview environments for pull requests.

---

## Architecture

### Backend (Railway)
- **Hosting:** Railway ([translator-backend-production-67af.up.railway.app](https://translator-backend-production-67af.up.railway.app))
- **Framework:** Express.js
- **APIs:** Google Cloud Translation v2, Google Cloud Text-to-Speech
- **Environment:** Node.js with CommonJS modules

### Frontend (GitHub Pages)
- **Hosting:** GitHub Pages ([jkobb510.github.io/ENG-JP-KOR-translator](https://jkobb510.github.io/ENG-JP-KOR-translator))
- **Format:** Static HTML/CSS/JS (ES Modules)
- **Backend URL:** Configured in `public/translate.js` and `public/pronounce.js`

---

## Prerequisites

* **Node.js** (v18 or higher)
* **Google Cloud Project:** With Translation API and Text-to-Speech API enabled
* **Service Account Key:** JSON key file from Google Cloud IAM
* **Railway Account:** For backend deployment (free tier available)
* **GitHub Account:** For frontend hosting via GitHub Pages

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jkobb510/ENG-JP-KOR-translator.git
cd ENG-JP-KOR-translator
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
GOOGLE_CLOUD_KEY_JSON=<paste-your-service-account-json-here>
ALLOWED_ORIGINS=https://jkobb510.github.io,https://translator-backend-production-67af.up.railway.app
PORT=3000
```

**Note:** For Railway deployment, set `GOOGLE_CLOUD_KEY_JSON` and `ALLOWED_ORIGINS` as environment variables in the Railway dashboard (not in `.env`).

### 4. File Structure

```
translator/
├── .github/
│   └── workflows/
│       └── static.yml          # GitHub Pages deployment workflow
├── node_modules/
├── public/                     # Frontend (deployed to GitHub Pages)
│   ├── index.html
│   ├── styles.css
│   ├── script.js               # Main entry point
│   ├── translate.js            # Translation logic
│   ├── pronounce.js            # TTS pronunciation
│   ├── swap.js                 # Language swap button
│   ├── selectLanguage.js       # Custom dropdowns
│   └── package.json            # {"type": "module"} for ESM
├── tests/
│   ├── api.test.mjs            # API tests
│   └── unit.test.mjs           # Unit tests
├── overrides.json              # Custom translation overrides
├── package.json
├── package-lock.json
├── server.js                   # Express backend
└── README.md
```

---

## Usage

### Running Locally

#### 1. Start the Backend Server

```bash
npm start
```

Server will run on `http://localhost:3000` after Kuromoji tokenizer initializes.

#### 2. Access the Frontend

Open `public/index.html` in your browser, or serve it with:

```bash
npx serve public
```

**Note:** Update `backendUrl` in `public/translate.js` and `public/pronounce.js` to `http://localhost:3000` for local testing.

### Deployment

#### Backend (Railway)

1. Push code to GitHub
2. Connect repository to Railway
3. Set environment variables:
   - `GOOGLE_CLOUD_KEY_JSON`: Your service account JSON
   - `ALLOWED_ORIGINS`: `https://jkobb510.github.io,<your-railway-url>`
4. Railway auto-deploys on push to `main`

#### Frontend (GitHub Pages)

1. Push changes to `main` branch
2. GitHub Actions workflow (`.github/workflows/static.yml`) auto-deploys `public/` folder
3. Access at `https://jkobb510.github.io/ENG-JP-KOR-translator/`

---

## API Endpoints

### `POST /translate`

**Request Body:**
```json
{
  "text": "hello",
  "input": "en",
  "target": "ja"
}
```

**Response:**
```json
{
  "translation": "こんにちは"
}
```

### `POST /pronounce`

**Request Body:**
```json
{
  "text": "こんにちは",
  "lang": "ja"
}
```

**Response:** Audio stream (MP3)

### `GET /health`

**Response:** `"ok"` (for Railway health checks)

---

## Testing

Application uses **Jest** with ESM support and jsdom for browser API testing.

### Run Tests

```bash
npm test
```

### Test Files

- `tests/api.test.mjs`: Translation API integration tests
- `tests/unit.test.mjs`: DOM manipulation and UI logic tests

**Note:** Tests use dynamic imports (`await import(...)`) to avoid top-level DOM dependencies.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLOUD_KEY_JSON` | Service account JSON (for Railway) | `{"type":"service_account",...}` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to key file (local only) | `/path/to/key.json` |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://jkobb510.github.io` |
| `PORT` | Server port (Railway sets this automatically) | `3000` |

---

## Technologies

### Backend
- Express.js
- Google Cloud Translation API v2
- Google Cloud Text-to-Speech API
- Kuromoji (Japanese morphological analysis)
- Wanakana (Kana/Romaji conversion)
- @romanize/korean (Korean romanization)
- CORS middleware

### Frontend
- Vanilla JavaScript (ES Modules)
- Custom accessible dropdowns
- Fetch API for backend communication

### DevOps
- Railway (backend hosting)
- GitHub Pages (frontend hosting)
- GitHub Actions (CI/CD)
- Jest (testing)

---

## CORS Configuration

The backend uses dynamic CORS based on `ALLOWED_ORIGINS`:

- **If `ALLOWED_ORIGINS` is set:** Only listed origins are allowed
- **If `ALLOWED_ORIGINS` is empty:** All origins are allowed (⚠️ use only for development)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request (Railway will create a preview deployment automatically)

---

## License

ISC

---

## Links

- **Live App:** https://jkobb510.github.io/ENG-JP-KOR-translator/
- **Backend API:** https://translator-backend-production-67af.up.railway.app
- **Repository:** https://github.com/jkobb510/ENG-JP-KOR-translator

---

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` in Railway includes `https://jkobb510.github.io`
- Check browser console for blocked origin details

### Backend Crashes
- Verify `GOOGLE_CLOUD_KEY_JSON` is valid JSON
- Check Railway logs for startup errors
- Ensure health check endpoint `/health` is accessible

### Tests Failing
- Run `npm install` to ensure jest and jest-environment-jsdom are installed
- Verify `public/package.json` contains `{"type": "module"}`
- Use `NODE_OPTIONS=--experimental-vm-modules jest` to enable ESM
