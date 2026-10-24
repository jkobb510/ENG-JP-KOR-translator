import { useEffect, useRef, useState } from 'react';
import imageIcon from '../assets/image.png';
import pronounceIcon from '../assets/pronounce.png';
import { getPronounceAPI } from '../api/translate.js';
import DeleteRowButton from './DeleteRowButton.jsx';
import EditableCell from './EditableCell.jsx';
import RecordButton from './RecordButton.jsx';

const SHOW_DELAY_MS = 1000;
const HIDE_DELAY_MS = 200;

function getParentheticals(text) {
  return [...(text ?? '').matchAll(/[(（]([^()（）]*)[)）]/g)]
    .map(match => match[1].trim())
    .filter(Boolean);
}

export default function StudyRow({ row, onUpdateCell, onSaveRow, onDelete, onAddImage, onCellKeyDown }) {
  const [anchor, setAnchor] = useState(null);
  const [pronouncing, setPronouncing] = useState(false);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
  }, []);

  function handleCellEnter(ev, lang) {
    const cell = ev.currentTarget;
    clearTimeout(hideTimerRef.current);
    clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(() => {
      const rect = cell.getBoundingClientRect();
      setAnchor({
        lang,
        bottom: window.innerHeight - rect.top,
        right: document.documentElement.clientWidth - rect.right,
      });
    }, SHOW_DELAY_MS);
  }

  function handleLeave() {
    clearTimeout(showTimerRef.current);
    hideTimerRef.current = setTimeout(() => setAnchor(null), HIDE_DELAY_MS);
  }

  function handleTooltipEnter() {
    clearTimeout(hideTimerRef.current);
  }

  async function handlePronounce() {
    const lang = anchor?.lang ?? 'ja';
    const spokenText = lang === 'ko' ? row.translation : row.word;
    if (!spokenText) return;
    setPronouncing(true);
    try {
      const res = await getPronounceAPI(spokenText, lang);
      if (!res.ok) throw new Error('TTS failed');
      const audio = new Audio(URL.createObjectURL(await res.blob()));
      audio.play();
    } catch (err) {
      console.error('Pronunciation Error:', err);
      alert('Failed to pronounce');
    } finally {
      setPronouncing(false);
    }
  }

  const reading = (row.furigana ? [row.furigana] : getParentheticals(row.word)).join(' ');
  const showReading = anchor?.lang !== 'ko' && reading !== '' && reading !== (row.word ?? '').trim();

  return (
    <tr>
      <EditableCell
        value={row.word}
        onSave={(value) => onUpdateCell('word', value)}
        onKeyDown={onCellKeyDown}
        onMouseEnter={(ev) => handleCellEnter(ev, 'ja')}
        onMouseLeave={handleLeave}
      />
      <EditableCell
        value={row.translation}
        onSave={(value) => onUpdateCell('translation', value)}
        onKeyDown={onCellKeyDown}
        onMouseEnter={(ev) => handleCellEnter(ev, 'ko')}
        onMouseLeave={handleLeave}
      />
      <EditableCell
        value={row.translation2}
        onSave={(value) => onUpdateCell('translation2', value)}
        onKeyDown={onCellKeyDown}
      />
      <td>
        <button
          type="button"
          className="add-text-to-image-btn"
          aria-label="Add image"
          onClick={onAddImage}
        >
          <img src={imageIcon} alt="" />
        </button>
      </td>
      <td>
        <DeleteRowButton onClick={onDelete} />
        {/* Always mounted so recording/playback state survives the tooltip hiding. */}
        <div
          className={`translation-tooltip${anchor ? ' show' : ''}`}
          style={anchor ? { bottom: anchor.bottom, right: anchor.right } : undefined}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleLeave}
        >
          <div className="translation-tooltip-actions">
            {showReading && (
              <span className="translation-tooltip-text">{reading}</span>
            )}
            <button
              type="button"
              className="record-btn pronounce-btn"
              aria-label="Pronounce"
              disabled={pronouncing}
              onClick={handlePronounce}
            >
              <img src={pronounceIcon} alt="" draggable={false} />
            </button>
            <RecordButton row={row} onUpdateRow={onSaveRow} />
          </div>
        </div>
      </td>
    </tr>
  );
}
