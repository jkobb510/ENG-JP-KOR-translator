const express = require('express');
const wanakana = require('wanakana');
const {
  translate,
  overrides,
  toReading,
  romanizeKorean,
  translateTo,
  japaneseKanaPattern,
  koreanHangulPattern,
} = require('./translate');
const translationData = require('./translation-data.json');

const router = express.Router();
const supportedLanguages = ['en', 'ja', 'ko'];
const kanjiPattern = new RegExp(translationData.scriptPatterns.kanji, 'u');

async function detectLanguage(text) {
  if (japaneseKanaPattern.test(text)) return 'ja';
  if (koreanHangulPattern.test(text)) return 'ko';

  const [languageDetection] = await translate.detect(text);
  let detected = 'en';
  if (supportedLanguages.includes(languageDetection.language)) {
    detected = languageDetection.language;
  }
  if (detected === 'en' && wanakana.isJapanese(text)) detected = 'ja';
  return detected;
}

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing text.' });
  }

  const normalizedText = text.toLowerCase().trim();

  try {
    const detected = await detectLanguage(text);
    const response = { detected };
    let japaneseText = text;
    if (detected !== 'ja') {
      japaneseText = await translateTo(text, normalizedText, 'ja', detected);
    }
    const japaneseReading = overrides.ja_furigana?.[japaneseText] || toReading(japaneseText);

    response.ja = {
      text: japaneseText,
      furigana: null,
      romanization: null,
    };
    if (japaneseReading && kanjiPattern.test(japaneseText)) {
      response.ja.furigana = japaneseReading;
    }
    if (japaneseReading) {
      response.ja.romanization = wanakana.toRomaji(japaneseReading);
    }

    if (detected !== 'ko') {
      const koreanText = await translateTo(text, normalizedText, 'ko', detected);
      response.ko = { text: koreanText, romanization: romanizeKorean(koreanText) };
    }

    if (detected !== 'en') {
      const englishText = await translateTo(text, normalizedText, 'en', detected);
      response.en = { text: englishText };
    }

    res.json(response);
  } catch (error) {
    console.error('Translation Error:', error);
    res.status(500).json({ error: 'Translation service failed.' });
  }
});

module.exports = router;