const wanakana = require('wanakana');
const kuromoji = require('kuromoji');
const translationData = require('./translation-data.json');
let tokenizer = null;
const digitPatternCharacters = [];

for (const digit of translationData.digits) {
  digitPatternCharacters.push(digit.ascii, digit.fullwidth);
}
const numberPattern = new RegExp(`^[${digitPatternCharacters.join('')}]+$`);
const halfwidthDigitByFullwidth = new Map(translationData.digits.map(digit => [digit.fullwidth, digit.ascii]));
const minutePunNumbers = new Set(translationData.minutePunNumbers);

function digitToKana(digit) {
  return translationData.digits[digit].reading;
}

function unitCountToKana(unitCount, unit) {
  const irregularReading = translationData.irregularNumberReadings[unitCount * unit.value];
  if (irregularReading) 
    return irregularReading;

  let countReading = '';
  if (unitCount !== 1) countReading = integerToKana(unitCount);
  return countReading + unit.reading;
}

function integerToKana(number) {
  if (number === 0) return digitToKana(0);

  let reading = '';
  let remainingNumber = number;
  for (const unit of translationData.numberUnits) {
    const unitCount = Math.floor(remainingNumber / unit.value);
    if (!unitCount) continue;

    remainingNumber %= unit.value;
    if (unit.value >= 10000) {
      reading += integerToKana(unitCount) + unit.reading;
    } else {
      reading += unitCountToKana(unitCount, unit);
    }
  }

  if (remainingNumber) {
    reading += digitToKana(remainingNumber);
  }
  return reading;
}

function parseDigits(digitText) {
  let asciiDigits = '';
  for (const character of digitText) {
    asciiDigits += halfwidthDigitByFullwidth.has(character)
      ? halfwidthDigitByFullwidth.get(character)
      : character;
  }
  return Number(asciiDigits);
}

function numberToKana(digitText, followingCounter) {
  const number = parseDigits(digitText);
  if (!Number.isSafeInteger(number)) return null;
  if (followingCounter === translationData.counters.hour && translationData.hourReadings[number]) {
      return translationData.hourReadings[number];
  }
  if (followingCounter === translationData.counters.month && translationData.monthReadings[number]) {
    return translationData.monthReadings[number];
  }
  return integerToKana(number);
}

function minuteEndingFor(onesDigit) {
  const lastDigit = onesDigit || 10;
  return minutePunNumbers.has(lastDigit)
    ? translationData.minuteEndings.pun
    : translationData.minuteEndings.fun;
}

function minuteOnesToKana(onesDigit) {
  if (onesDigit === 0) return '';
  if (translationData.minuteReadings[onesDigit]) {
    return translationData.minuteReadings[onesDigit];
  }
  return digitToKana(onesDigit);
}

function minuteTensToKana(tensNumber, shortenEnding) {
  if (tensNumber === 0) return '';
  let tensReading = integerToKana(tensNumber);
  if (shortenEnding) {
    tensReading = tensReading.replace(new RegExp(`${translationData.minuteEndings.ten}$`), translationData.minuteEndings.irregularTen);
  }
  return tensReading;
}

function minuteNumberToKana(digitText) {
  const number = parseDigits(digitText);
  if (!Number.isSafeInteger(number) || number < 1 || number > 59) 
    return null;

  const onesDigit = number % 10;
  const tensNumber = number - onesDigit;
  const tensReading = minuteTensToKana(tensNumber, onesDigit === 0);
  const onesReading = minuteOnesToKana(onesDigit);
  return tensReading + onesReading + minuteEndingFor(onesDigit);
}

function readNumberToken(tokens, tokenIndex) {
  const digitText = tokens[tokenIndex].surface_form;
  if (!numberPattern.test(digitText)) return null;
  let followingSurfaceForm = '';
  if (tokens[tokenIndex + 1]) {
    followingSurfaceForm = tokens[tokenIndex + 1].surface_form;
  }

  if (followingSurfaceForm === translationData.counters.minute) {
    const minuteReading = minuteNumberToKana(digitText);
    if (minuteReading) return { reading: minuteReading, tokensToSkip: 1 };
  }

  const numberReading = numberToKana(digitText, followingSurfaceForm);
  if (!numberReading) 
    return null;
  return { reading: numberReading, tokensToSkip: 0 };
}

function readParticle(token) {
  if (!translationData.particlePartsOfSpeech.includes(token.pos)) return null;
  if (Object.hasOwn(translationData.particleReadings, token.surface_form)) {
    return translationData.particleReadings[token.surface_form];
  }
  return null;
}

function normalizeReading(surfaceForm, reading) {
  const hiragana = reading ? wanakana.toHiragana(reading) : surfaceForm;
  if (hiragana.includes('にっぽん')) {
    return hiragana.replace(/にっぽん/g, 'にほん');
  }
  return hiragana;
}

function readToken(tokens, tokenIndex) {
  const token = tokens[tokenIndex];
  const surfaceForm = token.surface_form;
  const previousToken = tokens[tokenIndex - 1];

  if (surfaceForm === translationData.counters.month && previousToken && numberPattern.test(previousToken.surface_form)) {
    return { reading: translationData.monthReading, tokensToSkip: 0 };
  }

  const numberToken = readNumberToken(tokens, tokenIndex);
  if (numberToken) return numberToken;

  const particleReading = readParticle(token);
  if (particleReading) 
    return { reading: particleReading, tokensToSkip: 0 };

  return { reading: normalizeReading(surfaceForm, token.reading), tokensToSkip: 0 };
}

function toReading(inputText) {
  if (!tokenizer) return null;

  const tokens = tokenizer.tokenize(inputText);
  let reading = '';
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    const tokenReading = readToken(tokens, tokenIndex);
    reading += tokenReading.reading;
    tokenIndex += tokenReading.tokensToSkip;
  }
  return reading;
}

function initTokenizer(callback) {
  kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((error, initializedTokenizer) => {
    if (!error) tokenizer = initializedTokenizer;
    callback(error);
  });
}

module.exports = { initTokenizer, toReading };