# Translator App (English ↔ Japanese/Korean)

## Description

This application provides an English, Japanese, and Korean study translator. A React frontend is built with Vite and served by an Express API. Translation uses custom rules from `overrides.json` and the Google Cloud Translation API (v2); pronunciation uses Google Cloud Text-to-Speech.

---

## Features

* **Custom Overrides:** Exact input matches are served instantly from `overrides.json`, reducing API calls.
* **Study translations:** Produces Japanese readings and romanization, Korean romanization, and available English translations.
* **Japanese and Korean pronunciation:** Uses Google Cloud Text-to-Speech Neural2 voices.
* **Study table:** Stores study rows locally in IndexedDB and can synchronize them with the server.
* **Custom translation rules:** Uses `overrides.json` to apply project-specific translations.
* **CORS configuration:** The Express API accepts configured origins through `ALLOWED_ORIGINS`.

---

## Architecture

### Frontend
- React application under `src/`, built with Vite into `dist/`.
- In development, Vite proxies `/translate`, `/pronounce`, and `/api` to the Express server at `http://localhost:3000`.
- In production, Express serves the built frontend and API from the same origin.

### Backend
- Express.js with CommonJS modules under `src/server/`.
- `server.js` is the root startup entry point. It loads configuration, initializes the database and Japanese tokenizer, then starts listening.
- Translation and speech use Google Cloud Translation v2 and Google Cloud Text-to-Speech.
- Study rows are stored in PostgreSQL when `POSTGRES_PRIVATE_URL` or `DATABASE_URL` is configured. The browser also maintains local rows in IndexedDB.

---

## Prerequisites

* **Node.js** (v18 or higher)
* **Google Cloud Project:** With Translation API and Text-to-Speech API enabled
* **Google Cloud credentials:** A service account key file or the `GOOGLE_CLOUD_KEY_JSON` environment variable
* **PostgreSQL:** Optional; configure a connection URL to enable server-side study-row synchronization

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
GOOGLE_CLOUD_KEY_JSON=<service-account-json>
ALLOWED_ORIGINS=http://localhost:5173,https://your-production-domain.example
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=3000
```

`DATABASE_URL` is optional. `POSTGRES_PRIVATE_URL` takes precedence when both database variables are set. In production, configure secrets and origins in the hosting provider rather than committing them to `.env`. If `ALLOWED_ORIGINS` is empty, the API allows all origins; set it explicitly in production.

### 4. File Structure

```
translator/
├── src/
│   ├── api/                    # Frontend API clients
│   ├── components/             # React UI components
│   ├── hooks/                  # Study-row state and synchronization
│   ├── server/                 # Express app, routes, translation and speech logic
│   │   ├── translation-data.json
│   │   └── toKana.js
│   ├── App.jsx
│   ├── db.js                   # Browser IndexedDB storage
│   └── main.jsx
├── tests/                      # Jest frontend tests
├── overrides.json              # Custom translation overrides
├── package.json
├── server.js                   # Backend startup entry point
└── vite.config.mjs
```

---

## Usage

### Running Locally

#### Start the backend

```bash
npm start
```

The server listens on `http://localhost:3000` after the Kuromoji tokenizer initializes.

#### Start the frontend in development

In another terminal, run:

```bash
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). API requests are proxied to the backend.

#### Build the production frontend

```bash
npm run build
```

After building, `npm start` serves the frontend from `dist/` together with the API.

### Deployment

#### Railway (App + API)

Deploy the repository to a Node.js host that supports the configured environment variables and, if server-side row sync is needed, PostgreSQL. The start command is `npm start`; the `postinstall` script builds the Vite frontend. Set `GOOGLE_CLOUD_KEY_JSON`, `ALLOWED_ORIGINS`, and the database connection URL in the host configuration. Express serves both the built UI and API from the deployed origin.

---

## API Endpoints

### `POST /translate`

**Request Body:**
```json
{
  "text": "hello"
}
```

**Response shape:**
```json
{
  "detected": "en",
  "ja": {
    "text": "こんにちは",
    "furigana": null,
    "romanization": "konnichiwa"
  },
  "ko": {
    "text": "안녕하세요",
    "romanization": "annyeonghaseyo"
  }
}
```

Depending on the detected input language, the response may also contain an `en` translation. Japanese is always included.

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

### Study rows

Study-row endpoints require a configured PostgreSQL database. They are mounted under `/api/rows`:

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/api/rows` | List study rows |
| `POST` | `/api/rows` | Create a row; accepts `word`, `translation`, `translation2`, `furigana`, `image`, and `audio` |
| `PUT` | `/api/rows/:id` | Replace a row's editable fields |
| `DELETE` | `/api/rows/:id` | Delete a row |
| `DELETE` | `/api/rows` | Clear all server rows |

Without a database URL, these endpoints return `503`; the frontend can still use local IndexedDB storage.

---

## Testing

The project uses Jest and jsdom for frontend tests.

### Run Tests

```bash
npm test
```

The current test suite is in `tests/App.test.jsx`.

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLOUD_KEY_JSON` | Service account JSON; startup writes it to a local credentials file | Service-account JSON |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional path to an existing service account key file | `/path/to/key.json` |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://your-domain.com` |
| `POSTGRES_PRIVATE_URL` | Preferred PostgreSQL connection URL | `postgresql://...` |
| `DATABASE_URL` | Fallback PostgreSQL connection URL | `postgresql://...` |
| `PORT` | Server port (Railway sets this automatically) | `3000` |

---

## Technologies

### Backend
- Express.js
- Google Cloud Translation API v2
- Google Cloud Text-to-Speech API
- PostgreSQL (`pg`)
- Kuromoji (Japanese morphological analysis)
- Wanakana (Kana/Romaji conversion)
- @romanize/korean (Korean romanization)
- CORS middleware

### Frontend
- React
- Vite
- IndexedDB for local study-row storage
- Fetch API for backend communication

### DevOps
- Railway (full-stack hosting)
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

- **Live App + API:** https://translator-backend-production-67af.up.railway.app
- **Repository:** https://github.com/jkobb510/ENG-JP-KOR-translator

---

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` includes the frontend origin when making cross-origin requests
- Check browser console for blocked origin details

### Backend Crashes
- Verify `GOOGLE_CLOUD_KEY_JSON` is valid JSON
- Check Railway logs for startup errors
- Ensure health check endpoint `/health` is accessible

### Tests Failing
- Run `npm install` to install project dependencies
- Run `npm test -- --runInBand` to execute tests sequentially and inspect failures
