const fs = require('fs');
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;
const wanakana = require('wanakana');
const kuromoji = require('kuromoji');
const romanize = require('@romanize/korean');

const translate = new Translate();
const overrides = JSON.parse(fs.readFileSync(path.join(__dirname, 'overrides.json'), 'utf8'));

let tokenizer = null;

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

function parseDigits(digits) {
  return Number(digits.replace(/[\uff10-\uff19]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
}

function numberReading(digits, counter) {
  const n = parseDigits(digits);
  if (!Number.isSafeInteger(n)) return null;
  if (counter === '時' && HOUR_READINGS[n]) return HOUR_READINGS[n];
  if (counter === '月' && MONTH_READINGS[n]) return MONTH_READINGS[n];
  return intToKana(n);
}

function minuteReading(digits) {
  const n = parseDigits(digits);
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

function initTokenizer(callback) {
  kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, t) => {
    if (!err) tokenizer = t;
    callback(err);
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function translateTo(text, lowerText, lang, from) {
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
    result = (await translate.translate(source, { from, to: lang }))[0];
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

module.exports = { translate, overrides, initTokenizer, toReading, romanizeKorean, translateTo };
