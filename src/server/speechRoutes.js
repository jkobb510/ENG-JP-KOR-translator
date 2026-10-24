const express = require('express');
const textToSpeech = require('@google-cloud/text-to-speech');

const router = express.Router();
const tts = new textToSpeech.TextToSpeechClient();

router.post('/', async (req, res) => {
  const { text, lang: language } = req.body;
  if (!text || !language) {
    return res.status(400).json({ error: 'Missing text or language.' });
  }

  try {
    let languageCode = 'ko-KR';
    let voiceName = 'ko-KR-Neural2-A';
    if (language === 'ja') {
      languageCode = 'ja-JP';
      voiceName = 'ja-JP-Neural2-B';
    }

    const [response] = await tts.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: { audioEncoding: 'MP3' },
    });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'Text-to-speech service failed.' });
  }
});

module.exports = router;