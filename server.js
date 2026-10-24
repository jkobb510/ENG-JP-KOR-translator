const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

require('dotenv').config();
if (process.env.GOOGLE_CLOUD_KEY_JSON) {
  const credsPath = path.join(process.cwd(), 'gcp-key.json');
  fs.writeFileSync(credsPath, process.env.GOOGLE_CLOUD_KEY_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
}
const textToSpeech = require('@google-cloud/text-to-speech');

const tts = new textToSpeech.TextToSpeechClient();
const wanakana = require('wanakana');
const { Pool } = require('pg');
const { translate, overrides, initTokenizer, toReading, romanizeKorean, translateTo } = require('./translate');

const app = express();

app.use(bodyParser.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

console.log('CORS allowed origins:', allowedOrigins.length ? allowedOrigins : ['*']);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('CORS blocked origin:', origin);
    return callback(new Error('CORS not allowed for origin: ' + origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.get('/health', (_req, res) => {
  res.send('ok');
});

const dbUrl = process.env.POSTGRES_PRIVATE_URL || process.env.DATABASE_URL;
const pool = dbUrl ? new Pool({ connectionString: dbUrl }) : null;
const ROW_COLUMNS = ['word', 'translation', 'translation2', 'furigana', 'image', 'audio'];

if (pool) {
  pool.query(`
    CREATE TABLE IF NOT EXISTS study_rows (
      id SERIAL PRIMARY KEY,
      word TEXT NOT NULL DEFAULT '',
      translation TEXT NOT NULL DEFAULT '',
      translation2 TEXT NOT NULL DEFAULT '',
      furigana TEXT NOT NULL DEFAULT '',
      image TEXT,
      audio TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `).catch(err => console.error('Failed to create study_rows table:', err.message));
} else {
  console.warn('No POSTGRES_PRIVATE_URL/DATABASE_URL set; study rows are not persisted on the server.');
}

function requireDb(_req, res, next) {
  if (!pool) return res.status(503).json({ error: 'Database not configured.' });
  next();
}

function rowValues(body) {
  return ROW_COLUMNS.map(col => (body?.[col] ?? (col === 'image' || col === 'audio' ? null : '')));
}

app.get('/api/rows', requireDb, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, ${ROW_COLUMNS.join(', ')} FROM study_rows ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    console.error('Load rows failed:', err);
    res.status(500).json({ error: 'Failed to load rows.' });
  }
});

app.post('/api/rows', requireDb, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO study_rows (${ROW_COLUMNS.join(', ')}) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      rowValues(req.body)
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create row failed:', err);
    res.status(500).json({ error: 'Failed to create row.' });
  }
});

app.put('/api/rows/:id', requireDb, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
  try {
    const assignments = ROW_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE study_rows SET ${assignments}, updated_at = now() WHERE id = $7`,
      [...rowValues(req.body), id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Row not found.' });
    res.json({ id });
  } catch (err) {
    console.error('Update row failed:', err);
    res.status(500).json({ error: 'Failed to update row.' });
  }
});

app.delete('/api/rows/:id', requireDb, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id.' });
  try {
    await pool.query('DELETE FROM study_rows WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('Delete row failed:', err);
    res.status(500).json({ error: 'Failed to delete row.' });
  }
});

app.delete('/api/rows', requireDb, async (_req, res) => {
  try {
    await pool.query('TRUNCATE study_rows');
    res.status(204).end();
  } catch (err) {
    console.error('Clear rows failed:', err);
    res.status(500).json({ error: 'Failed to clear rows.' });
  }
});

app.get(/^(?!\/(translate|pronounce|health|api)).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const SUPPORTED_LANGUAGES = ['en', 'ja', 'ko'];
const KANJI_REGEX = /[\u4e00-\u9faf]/;

initTokenizer(err => {
  if (err) {
    console.error('Kuromoji init failed:', err);
    process.exit(1);
  }

  console.log('Kuromoji tokenizer initialized.');

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
});

app.post('/translate', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing text.' });
  }

  const lowerText = text.toLowerCase().trim();

  try {
    // Google sometimes detects kanji-only text (e.g. "全部") as Chinese; since
    // this app only supports en/ja/ko, treat Japanese-looking text as ja.
    // wanakana.isJapanese rejects mixed text like "5じ", so also check for kana/Hangul directly.
    let detected;
    if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) {
      detected = 'ja';
    } else if (/\p{Script=Hangul}/u.test(text)) {
      detected = 'ko';
    } else {
      const [detection] = await translate.detect(text);
      detected = SUPPORTED_LANGUAGES.includes(detection.language) ? detection.language : 'en';
      if (detected === 'en' && wanakana.isJapanese(text)) detected = 'ja';
    }

    const response = { detected };

    // Japanese is always shown: echoed with furigana/romaji if it's the input, otherwise translated
    const jaText = detected === 'ja' ? text : await translateTo(text, lowerText, 'ja', detected);
    const jaReading = overrides.ja_furigana?.[jaText] || toReading(jaText);
    response.ja = {
      text: jaText,
      furigana: jaReading && KANJI_REGEX.test(jaText) ? jaReading : null,
      romanization: jaReading ? wanakana.toRomaji(jaReading) : null
    };

    if (detected !== 'ko') {
      const koText = await translateTo(text, lowerText, 'ko', detected);
      response.ko = { text: koText, romanization: romanizeKorean(koText) };
    }

    if (detected !== 'en') {
      const enText = await translateTo(text, lowerText, 'en', detected);
      response.en = { text: enText };
    }

    res.json(response);

  } catch (err) {
    console.error('Translation Error:', err);
    res.status(500).json({ error: 'Translation service failed.' });
  }
});

app.post('/pronounce', async (req, res) => {
  const { text, lang } = req.body;

  if (!text || !lang) {
    return res.status(400).json({ error: 'Missing text or language.' });
  }

  try {
    const request = {
      input: { text },
      voice: {
        languageCode: lang === 'ja' ? 'ja-JP' : 'ko-KR',
        name: lang === 'ja' ? 'ja-JP-Neural2-B' : 'ko-KR-Neural2-A',
      },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await tts.synthesizeSpeech(request);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);

  } catch (err) {
    console.error('TTS Error:', err);
    res.status(500).json({ error: 'Text-to-speech service failed.' });
  }
});