import { useState } from 'react';
import { getPronounceAPI } from '../api/translate.js';

export default function usePronunciation() {
  const [pronounceDisabled, setPronounceDisabled] = useState({});

  async function handlePronounce(language, spokenText) {
    if (!spokenText) return;

    setPronounceDisabled(previous => ({ ...previous, [language]: true }));
    try {
      const response = await getPronounceAPI(spokenText, language);
      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      await audio.play();
    } catch (error) {
      console.error('Pronunciation Error:', error);
      alert('Failed to pronounce');
    } finally {
      setPronounceDisabled(previous => ({ ...previous, [language]: false }));
    }
  }

  return { pronounceDisabled, handlePronounce };
}