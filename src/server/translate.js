const fs = require('fs');
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;
const romanize = require('@romanize/korean');
const translationData = require('./translation-data.json');
const { initTokenizer, toReading } = require('./toKana');

const translate = new Translate();
const overrides = JSON.parse(fs.readFileSync(path.join(__dirname, '../../overrides.json'), 'utf8'));

const japaneseKanaPattern = new RegExp(translationData.scriptPatterns.japaneseKana, 'u');
const koreanHangulPattern = new RegExp(translationData.scriptPatterns.koreanHangul, 'u');

const punctuationCharacters = Object.keys(translationData.punctuation)
  .map(character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('');
const punctuationPattern = new RegExp(`[${punctuationCharacters}]`, 'g');

function romanizeKorean(text) {
  const normalized = text.replace(punctuationPattern, character => translationData.punctuation[character]);
  try {
    return romanize.romanize(normalized);
  } catch (error) {
    console.warn('Korean romanization failed:', error.message);
    return null;
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function translateTo(text, normalizedText, targetLanguage, sourceLanguage) {
  const languageOverrides = overrides[targetLanguage];
  let result = null;

  if (languageOverrides) {
    result = languageOverrides[normalizedText] || null;
  }

  if (!result) {
    // Swap override terms in the source first so Google translates around them.
    let sourceText = text;
    if (languageOverrides) {
      for (const [overrideKey, overrideValue] of Object.entries(languageOverrides)) {
        sourceText = sourceText.replace(new RegExp(escapeRegex(overrideKey), 'gi'), overrideValue);
      }
    }
    result = (await translate.translate(sourceText, {
      from: sourceLanguage,
      to: targetLanguage,
    }))[0];
  }

  if (languageOverrides) {
    for (const [overrideKey, overrideValue] of Object.entries(languageOverrides)) {
      // \b never matches between CJK characters, so only use it for ASCII keys.
      const escapedKey = escapeRegex(overrideKey);
      let replacementPattern = escapedKey;
      if (/^\w+$/.test(overrideKey)) {
        replacementPattern = `\\b${escapedKey}\\b`;
      }
      result = result.replace(new RegExp(replacementPattern, 'gi'), overrideValue);
    }
  }

  return result;
}

module.exports = {
  translate,
  overrides,
  initTokenizer,
  toReading,
  romanizeKorean,
  translateTo,
  japaneseKanaPattern,
  koreanHangulPattern,
};
