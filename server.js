const express = require('express');
const bodyParser = require('body-parser');
const { Translate } = require('@google-cloud/translate').v2;
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const wanakana = require('wanakana');
const kuromoji = require('kuromoji');
const romanize = require('@romanize/korean');
require('dotenv').config();
const app = express();
const translate = new Translate();
const tts = new textToSpeech.TextToSpeechClient();
const overrides = JSON.parse(fs.readFileSync('./overrides.json', 'utf8'));

let tokenizer = null;

async function toRomaji(text) {
    if (!tokenizer) return null;

    const tokens = tokenizer.tokenize(text);
    let reading = '';

    for (const token of tokens) {
        let kanaReading = token.reading;
        let surface = token.surface_form;

        if (token.pos === '助詞' || token.pos === '感動詞') {
            if (surface === 'は') {
                reading += 'わ';
                continue;
            }
            if (surface === 'へ') {
                reading += 'え';
                continue;
            }
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
        console.error('Kuromoji dictionary initialization failed. Error:', err);
        process.exit(1);
    }
    tokenizer = t;
    console.log('Kuromoji tokenizer initialized.');

    app.listen(3000, () => {
        console.log('Server running on http://localhost:3000');
    });
});

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/translate', async (req, res) => {
  const { text, source, target } = req.body;

  if (!text || text.trim() === '' || !target || target.trim() === '') {
    return res.status(400).json({ error: 'Missing or empty text or target language.' });
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
      const targetOverrides = overrides[target];
      for (const [key, value] of Object.entries(targetOverrides)) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        result = result.replace(regex, value);
      }
    }

    // Romanize target language
    if (target === 'ja') {
        if (!tokenizer) {
            romanized = "Error: Analyzer not ready";
        } else {
            romanized = await toRomaji(result);
        }
    } else if (target === 'ko') {
        romanized = romanize.romanize(result);
    }
    // Romanize source language when translating TO English
    else if (target === 'en') {
        if (source === 'ja') {
            if (!tokenizer) {
                romanized = "Error: Analyzer not ready";
            } else {
                romanized = await toRomaji(text);
            }
        } else if (source === 'ko') {
            romanized = romanize.romanize(text);
        }
    }

    res.json({ translation: result, romanization: romanized });
  } catch (err) {
    console.error('Translation Error:', err.message);
    res.status(500).json({
      error: 'Translation service failed. Check server logs.'
    });
  }
});

app.post('/pronounce', async (req, res) => {
  const { text, lang } = req.body;

  if (!text || !lang) {
    return res.status(400).json({ error: 'Missing text or language.' });
  }

  try {
    const request = {
      input: { text: text },
      voice: {
        languageCode: lang === 'ja' ? 'ja-JP' : 'ko-KR',
        name: lang === 'ja' ? 'ja-JP-Neural2-B' : 'ko-KR-Neural2-A',
      },
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await tts.synthesizeSpeech(request);
    const audioContent = response.audioContent;

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioContent);
  } catch (err) {
    console.error('TTS Error:', err.message);
    res.status(500).json({ error: 'Text-to-speech service failed.' });
  }
});