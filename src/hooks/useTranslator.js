import { useEffect, useRef, useState } from 'react';
import { getTranslateAPI } from '../api/translate.js';
import usePronunciation from './usePronunciation.js';

const TRANSLATE_DEBOUNCE_MS = 1000;

function isHangul(text) {
  return /^[\p{Script=Hangul}\s]+$/u.test(text);
}

function isEnglish(text) {
  return /^[A-Za-z\s.,!?'"-]+$/.test(text);
}

export default function useTranslator() {
  const [text, setText] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('');
  const { pronounceDisabled, handlePronounce } = usePronunciation();
  const debounceTimeoutRef = useRef(null);
  const saveRowRef = useRef(() => {});

  useEffect(() => () => clearTimeout(debounceTimeoutRef.current), []);

  async function triggerTranslate(nextText) {
    if (!nextText.trim()) {
      setResults(null);
      setStatus('');
      return;
    }

    setStatus('Translating...');

    try {
      const response = await getTranslateAPI(nextText);
      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        console.error('Received non-JSON response:', await response.text());
        setStatus('Error: Server returned invalid response');
        setResults(null);
        return;
      }

      const translation = await response.json();

      if (!response.ok) {
        console.error('Translation Request Failed:', translation.error);
        setStatus('Error: ' + (translation.error || 'Unknown error'));
        setResults(null);
        return;
      }

      setResults(translation);
      setStatus('');
    } catch (error) {
      console.error('Network Error:', error);
      setStatus('Error: Failed to connect');
      setResults(null);
    }
  }

  function handleTextChange(event) {
    const nextText = event.target.value;
    setText(nextText);
    clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(
      () => triggerTranslate(nextText),
      TRANSLATE_DEBOUNCE_MS
    );
  }

  function handleSaveToStudy() {
    if (!results) return;

    const input = text.trim();
    const japanese = results.ja.text;
    const korean = results.ko?.text ?? (isHangul(input) ? input : '');
    const english = results.en?.text ?? (isEnglish(input) ? input : '');
    saveRowRef.current(japanese, korean, english, results.ja.furigana ?? '');
  }

  return {
    text,
    results,
    status,
    pronounceDisabled,
    saveRowRef,
    handleTextChange,
    handlePronounce,
    handleSaveToStudy,
    showResult: results && !status.startsWith('Error')
  };
}