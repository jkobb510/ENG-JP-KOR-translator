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

const app = express();
const overrides = JSON.parse(fs.readFileSync('./overrides.json', 'utf8'));

app.use(bodyParser.json());
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

app.get(/^(?!\/(translate|pronounce|health)).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

let tokenizer = null;

const SUPPORTED_LANGUAGES = ['en', 'ja', 'ko'];
const KANJI_REGEX = /[\u4e00-\u9faf]/;

function toReading(inputText) {
  if (!tokenizer) return null;

  const tokens = tokenizer.tokenize(inputText);
  let reading = '';

  for (const token of tokens) {
    const surface = token.surface_form;
    const kanaReading = token.reading;

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

async function translateTo(text, lowerText, lang) {
  const customMatch = overrides[lang]?.[lowerText];
  let result = customMatch || (await translate.translate(text, lang))[0];

  if (overrides[lang]) {
    for (const [key, value] of Object.entries(overrides[lang])) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      result = result.replace(regex, value);
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
    const detected = SUPPORTED_LANGUAGES.includes(rawDetected) ? rawDetected : 'en';

    const response = { detected };

    // Japanese is always shown: echoed with furigana/romaji if it's the input, otherwise translated
    const jaText = detected === 'ja' ? text : await translateTo(text, lowerText, 'ja');
    const jaReading = tokenizer ? toReading(jaText) : null;
    response.ja = {
      text: jaText,
      furigana: jaReading && KANJI_REGEX.test(jaText) ? jaReading : null,
      romanization: jaReading ? wanakana.toRomaji(jaReading) : null
    };

    if (detected !== 'ko') {
      const koText = await translateTo(text, lowerText, 'ko');
      response.ko = { text: koText, romanization: romanize.romanize(koText) };
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