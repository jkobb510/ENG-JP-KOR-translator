import { useRef, useState } from 'react';
import LanguageSelect from './components/LanguageSelect.jsx';
import StudyTable from './components/StudyTable.jsx';
import { getTranslateAPI, getPronounceAPI } from './api/translate.js';
import './styles.css';

let debounceTimeout;

export default function App() {
  const [text, setText] = useState('');
  const [input, setInput] = useState('en');
  const [target, setTarget] = useState('ja');
  const [result, setResult] = useState('');
  const [romanization, setRomanization] = useState('');
  const [pronounceDisabled, setPronounceDisabled] = useState(false);
  const saveRowRef = useRef(() => {});

  function scheduleTranslate(nextText) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => triggerTranslate(nextText, input, target), 1000);
  }

  async function triggerTranslate(nextText = text, nextInput = input, nextTarget = target) {
    if (!nextText.trim()) return;
    setResult('Translating...');

    try {
      const res = await getTranslateAPI(nextText, nextInput, nextTarget);
      const contentType = res.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        console.error('Received non-JSON response:', await res.text());
        setResult('Error: Server returned invalid response');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        console.error('Translation Request Failed:', data.error);
        setResult('Error: ' + (data.error || 'Unknown error'));
        return;
      }

      setResult(data.translation || '');
      setRomanization(nextTarget !== 'en' && data.romanization ? data.romanization : '');
    } catch (err) {
      console.error('Network Error:', err);
      setResult('Error: Failed to connect');
    }
  }

  function handleTextChange(ev) {
    const value = ev.target.value;
    setText(value);
    scheduleTranslate(value);
  }

  function handleInputChange(value) {
    setInput(value);
    triggerTranslate(text, value, target);
  }

  function handleTargetChange(value) {
    setTarget(value);
    triggerTranslate(text, input, value);
  }

  function handleSwap() {
    const newInput = target;
    const newTarget = input;
    setInput(newInput);
    setTarget(newTarget);
    triggerTranslate(text, newInput, newTarget);
  }

  async function handlePronounce() {
    if (!result) return;
    setPronounceDisabled(true);
    try {
      const res = await getPronounceAPI(result, target);
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    } catch (err) {
      console.error('Pronunciation Error:', err);
      alert('Failed to pronounce');
    } finally {
      setPronounceDisabled(false);
    }
  }

  function handleSaveToStudy() {
    saveRowRef.current(text.trim(), result.trim());
  }

  const showResult = result && !result.startsWith('Error');
  const showPronounce = target === 'ja' || target === 'ko';

  return (
    <>
      <div className="banner">
        <h2>Translator App (English to Japanese/Korean)</h2>
      </div>

      <form id="translateForm" onSubmit={(e) => e.preventDefault()}>
        <textarea
          name="text"
          rows={5}
          placeholder="Enter text"
          value={text}
          onChange={handleTextChange}
        />

        <div className="form-row">
          <LanguageSelect id="inputSelect" value={input} onChange={handleInputChange} />
          <button type="button" id="swapBtn" className="swap-btn" aria-label="Swap languages" onClick={handleSwap}>
            ⇄
          </button>
          <LanguageSelect id="targetSelect" value={target} onChange={handleTargetChange} />
        </div>
      </form>

      <div className="result">
        <div id="result">{result}</div>
        <div id="romanization" style={{ display: romanization ? 'block' : 'none' }}>
          {romanization}
        </div>
        {showPronounce && (
          <button
            id="pronounceBtn"
            className="pronounce-btn"
            disabled={pronounceDisabled}
            onClick={handlePronounce}
          >
            🔊
          </button>
        )}
        {showResult && (
          <button type="button" className="save-to-study-btn" onClick={handleSaveToStudy}>
            Save to Study Table
          </button>
        )}
      </div>

      <StudyTable canSave={showResult} onSaveRef={saveRowRef} />
    </>
  );
}
