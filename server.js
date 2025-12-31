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
app.use(express.static('public'));

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

let tokenizer = null;

function toRomaji(text) {
  if (!tokenizer) return null;

  const tokens = tokenizer.tokenize(text);
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

  return wanakana.toRomaji(reading);
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

app.post('/translate', async (req, res) => {
  const { text, input, target } = req.body;

  if (!text || !target) {
    return res.status(400).json({ error: 'Missing text or target language.' });
  }

  const lowerText = text.toLowerCase().trim();

  try {
    let result;
    let romanized = null;

    const customMatch = overrides[target]?.[lowerText];
    if (customMatch) {
      result = customMatch;
    } else {
      const [translated] = await translate.translate(text, target);
      result = translated;
    }

    if (overrides[target]) {
      for (const [key, value] of Object.entries(overrides[target])) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        result = result.replace(regex, value);
      }
    }

    if (target === 'ja') {
      romanized = tokenizer ? toRomaji(result) : 'Analyzer not ready';
    } else if (target === 'ko') {
      romanized = romanize.romanize(result);
    } else if (target === 'en') {
      if (input === 'ja') romanized = tokenizer ? toRomaji(text) : 'Analyzer not ready';
      if (input === 'ko') romanized = romanize.romanize(text);
    }

    res.json({ translation: result, romanization: romanized });

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