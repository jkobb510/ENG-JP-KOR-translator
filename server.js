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
const { Translate } = require('@google-cloud/translate').v2;
const textToSpeech = require('@google-cloud/text-to-speech');

const translate = new Translate();
const tts = new textToSpeech.TextToSpeechClient();
const wanakana = require('wanakana');
const kuromoji = require('kuromoji');
const romanize = require('@romanize/korean');
const { Pool } = require('pg');

const app = express();
const overrides = JSON.parse(fs.readFileSync('./overrides.json', 'utf8'));

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

let tokenizer = null;

const SUPPORTED_LANGUAGES = ['en', 'ja', 'ko'];
const KANJI_REGEX = /[\u4e00-\u9faf]/;

const DIGIT_READINGS = ['ぜろ', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう'];
const NUMBER_REGEX = /^[0-9\uff10-\uff19]+$/;

// Counter-specific readings for the whole number (hours/months, 1-12).
const HOUR_READINGS = { 1: 'いち', 2: 'に', 3: 'さん', 4: 'よ', 5: 'ご', 6: 'ろく', 7: 'しち', 8: 'はち', 9: 'く', 10: 'じゅう', 11: 'じゅういち', 12: 'じゅうに' };
const MONTH_READINGS = { ...HOUR_READINGS, 4: 'し' };
const MINUTE_READINGS = { 1: 'いっ', 3: 'さん', 4: 'よん', 6: 'ろっ', 8: 'はっ', 10: 'じゅっ' };
const PUN_NUMBERS = new Set([1, 3, 4, 6, 8, 10]);

function intToKana(n) {
  if (n === 0) return DIGIT_READINGS[0];
  const units = [
    [100000000, 'おく'], [10000, 'まん'], [1000, 'せん'], [100, 'ひゃく'], [10, 'じゅう'],
  ];
  const irregular = { 300: 'さんびゃく', 600: 'ろっぴゃく', 800: 'はっぴゃく', 3000: 'さんぜん', 8000: 'はっせん' };
  let out = '';
  let rest = n;
  for (const [value, label] of units) {
    const count = Math.floor(rest / value);
    if (!count) continue;
    rest %= value;
    if (value >= 10000) {
      out += intToKana(count) + label;
    } else if (irregular[count * value]) {
      out += irregular[count * value];
    } else {
      out += (count === 1 ? '' : DIGIT_READINGS[count]) + label;
    }
  }
  if (rest) out += DIGIT_READINGS[rest];
  return out;
}

function numberReading(digits, counter) {
  const n = Number(digits.replace(/[\uff10-\uff19]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
  if (!Number.isSafeInteger(n)) return null;
  if (counter === '時' && HOUR_READINGS[n]) return HOUR_READINGS[n];
  if (counter === '月' && MONTH_READINGS[n]) return MONTH_READINGS[n];
  return intToKana(n);
}

function minuteReading(digits) {
  const n = Number(digits.replace(/[\uff10-\uff19]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
  if (!Number.isSafeInteger(n) || n < 1 || n > 59) return null;
  const ones = n % 10;
  const base = ones === 0 ? n : n - ones;
  const tens = base ? intToKana(base) : '';
  const lastIsPun = PUN_NUMBERS.has(ones || 10);
  const onesKana = ones === 0 ? '' : (MINUTE_READINGS[ones] ?? DIGIT_READINGS[ones]);
  if (ones === 0) return tens.replace(/じゅう$/, 'じゅっ') + 'ぷん';
  return tens + onesKana + (lastIsPun ? 'ぷん' : 'ふん');
}

function toReading(inputText) {
  if (!tokenizer) return null;

  const tokens = tokenizer.tokenize(inputText);
  let reading = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const surface = token.surface_form;
    const kanaReading = token.reading;

    if (surface === '月' && i > 0 && NUMBER_REGEX.test(tokens[i - 1].surface_form)) {
      reading += 'がつ';
      continue;
    }

    if (NUMBER_REGEX.test(surface)) {
      const next = tokens[i + 1]?.surface_form;
      if (next === '分') {
        const minutes = minuteReading(surface);
        if (minutes) {
          reading += minutes;
          i++;
          continue;
        }
      }
      const numeric = numberReading(surface, next);
      if (numeric) {
        reading += numeric;
        continue;
      }
    }

    if (token.pos === '助詞' || token.pos === '感動詞') {
      if (surface === 'は') { reading += 'わ'; continue; }
      if (surface === 'へ') { reading += 'え'; continue; }
    }

    if (kanaReading) {
      reading += wanakana.toHiragana(kanaReading);
    } else {
      reading += surface;
    }
  }

  if (reading.endsWith('は')) {
    reading = reading.replace(/は$/, 'わ');
  }

  return reading;
}

const CJK_PUNCTUATION = { '。': '.', '、': ',', '：': ':', '；': ';', '！': '!', '？': '?', '，': ',', '．': '.', '「': '"', '」': '"', '（': '(', '）': ')' };

function romanizeKorean(text) {
  const normalized = text.replace(/[。、：；！？，．「」（）]/g, c => CJK_PUNCTUATION[c]);
  try {
    return romanize.romanize(normalized);
  } catch (err) {
    console.warn('Korean romanization failed:', err.message);
    return null;
  }
}

function toRomaji(inputText) {
  const reading = toReading(inputText);
  return reading ? wanakana.toRomaji(reading) : null;
}

kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, t) => {
  if (err) {
    console.error('Kuromoji init failed:', err);
    process.exit(1);
  }

  tokenizer = t;
  console.log('Kuromoji tokenizer initialized.');

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function translateTo(text, lowerText, lang) {
  const langOverrides = overrides[lang];
  const customMatch = langOverrides?.[lowerText];
  let result = customMatch;

  if (!result) {
    // Swap override terms in the source first so Google translates around them.
    let source = text;
    if (langOverrides) {
      for (const [key, value] of Object.entries(langOverrides)) {
        source = source.replace(new RegExp(escapeRegex(key), 'gi'), value);
      }
    }
    result = (await translate.translate(source, lang))[0];
  }

  if (langOverrides) {
    for (const [key, value] of Object.entries(langOverrides)) {
      // \b never matches between CJK characters, so only use it for ASCII keys.
      const escaped = escapeRegex(key);
      const pattern = /^\w+$/.test(key) ? `\\b${escaped}\\b` : escaped;
      result = result.replace(new RegExp(pattern, 'gi'), value);
    }
  }

  return result;
}

app.post('/translate', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing text.' });
  }

  const lowerText = text.toLowerCase().trim();

  try {
    const [detection] = await translate.detect(text);
    const rawDetected = Array.isArray(detection) ? detection[0].language : detection.language;
    let detected = SUPPORTED_LANGUAGES.includes(rawDetected) ? rawDetected : 'en';

    // Google sometimes detects kanji-only text (e.g. "全部") as Chinese; since
    // this app only supports en/ja/ko, treat Japanese-looking text as ja.
    if (detected === 'en' && wanakana.isJapanese(text)) {
      detected = 'ja';
    }

    const response = { detected };

    // Japanese is always shown: echoed with furigana/romaji if it's the input, otherwise translated
    const jaText = detected === 'ja' ? text : await translateTo(text, lowerText, 'ja');
    const jaReading = overrides.ja_furigana?.[jaText] || (tokenizer ? toReading(jaText) : null);
    response.ja = {
      text: jaText,
      furigana: jaReading && KANJI_REGEX.test(jaText) ? jaReading : null,
      romanization: jaReading ? wanakana.toRomaji(jaReading) : null
    };

    if (detected !== 'ko') {
      const koText = await translateTo(text, lowerText, 'ko');
      response.ko = { text: koText, romanization: romanizeKorean(koText) };
    }

    if (detected !== 'en') {
      const enText = await translateTo(text, lowerText, 'en');
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