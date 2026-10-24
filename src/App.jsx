import StudyTable from './components/StudyTable.jsx';
import useTranslator from './hooks/useTranslator.js';
import './styles.css';

export default function App() {
  const {
    text,
    results,
    status,
    pronounceDisabled,
    saveRowRef,
    handleTextChange,
    handlePronounce,
    handleSaveToStudy,
    showResult
  } = useTranslator();

  return (
    <>
      <div className="banner">
        <h2>Translator App (Japanese/Korean)</h2>
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
            </div>

            {results.ko && (
              <div className="lang-block ko-block">
                <div
                  className={`ko-text pronounceable${pronounceDisabled.ko ? ' disabled' : ''}`}
                  onClick={() => handlePronounce('ko', results.ko.text)}
                >
                  {results.ko.text}
                </div>
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

      <StudyTable onSaveRef={saveRowRef} />
    </>
  );
}
