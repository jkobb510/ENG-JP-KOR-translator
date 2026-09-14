import { useRef, useState } from 'react';
import StudyTable from './components/StudyTable.jsx';
import { getTranslateAPI, getPronounceAPI } from './api/translate.js';
import './styles.css';

let debounceTimeout;

export default function App() {
  const [text, setText] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('');
  const [pronounceDisabled, setPronounceDisabled] = useState({});
  const saveRowRef = useRef(() => {});

  function scheduleTranslate(nextText) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => triggerTranslate(nextText), 1000);
  }

  async function triggerTranslate(nextText = text) {
    if (!nextText.trim()) {
      setResults(null);
      setStatus('');
      return;
    }
    setStatus('Translating...');

    try {
      const res = await getTranslateAPI(nextText);
      const contentType = res.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        console.error('Received non-JSON response:', await res.text());
        setStatus('Error: Server returned invalid response');
        setResults(null);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        console.error('Translation Request Failed:', data.error);
        setStatus('Error: ' + (data.error || 'Unknown error'));
        setResults(null);
        return;
      }

      setResults(data);
      setStatus('');
    } catch (err) {
      console.error('Network Error:', err);
      setStatus('Error: Failed to connect');
      setResults(null);
    }
  }

  function handleTextChange(ev) {
    const value = ev.target.value;
    setText(value);
    scheduleTranslate(value);
  }

  async function handlePronounce(lang, spokenText) {
    if (!spokenText) return;
    setPronounceDisabled(prev => ({ ...prev, [lang]: true }));
    try {
      const res = await getPronounceAPI(spokenText, lang);
      if (!res.ok) throw new Error('TTS failed');
      const audioBlob = await res.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    } catch (err) {
      console.error('Pronunciation Error:', err);
      alert('Failed to pronounce');
    } finally {
      setPronounceDisabled(prev => ({ ...prev, [lang]: false }));
    }
  }

  function formatJapaneseCell(block) {
    return block.furigana ? `${block.text} (${block.furigana})` : block.text;
  }

  function handleSaveToStudy() {
    if (!results) return;

    const word = results.detected === 'ja' ? formatJapaneseCell(results.ja) : text.trim();
    const translations = [];
    if (results.detected !== 'ja') translations.push(formatJapaneseCell(results.ja));
    if (results.ko) translations.push(results.ko.text);
    if (results.en) translations.push(results.en.text);

    saveRowRef.current(word, translations[0] ?? '', translations[1] ?? '');
  }

  const showResult = results && !status.startsWith('Error');

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
      </form>

      <div className="result">
        {status && <div id="status">{status}</div>}

        {showResult && (
          <div className="translation-results">
            <div className="lang-block ja-block">
              {results.ja.furigana && (
                <div className="furigana">{results.ja.furigana}</div>
              )}
              <div
                className={`ja-text pronounceable${pronounceDisabled.ja ? ' disabled' : ''}`}
                onClick={() => handlePronounce('ja', results.ja.text)}
              >
                {results.ja.text}
              </div>
              {results.ja.romanization && (
                <div className="romanization">{results.ja.romanization}</div>
              )}
            </div>

            {results.ko && (
              <div className="lang-block ko-block">
                <div
                  className={`ko-text pronounceable${pronounceDisabled.ko ? ' disabled' : ''}`}
                  onClick={() => handlePronounce('ko', results.ko.text)}
                >
                  {results.ko.text}
                </div>
                <div className="romanization">{results.ko.romanization}</div>
              </div>
            )}

            {results.en && (
              <div className="lang-block en-block">
                <div className="en-text">{results.en.text}</div>
              </div>
            )}

            <button type="button" className="save-to-study-btn" onClick={handleSaveToStudy}>
              Save to Study Table
            </button>
          </div>
        )}
      </div>

      <StudyTable canSave={showResult} onSaveRef={saveRowRef} />
    </>
  );
}
