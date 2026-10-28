import { useEffect, useRef, useState } from 'react';
import imageIcon from '../assets/image.png';
import flipIcon from '../assets/flip-icon.jpeg';
import pronounceIcon from '../assets/pronounce.png';
import DeleteRowButton from './DeleteRowButton.jsx';
import EditableCell from './EditableCell.jsx';
import RecordButton from './RecordButton.jsx';
import usePronunciation from '../hooks/usePronunciation.js';

const SHOW_DELAY_MS = 1000;
const HIDE_DELAY_MS = 200;
const STUDY_FIELDS = ['word', 'translation', 'translation2'];
const STUDY_LANGUAGES = ['ja', 'ko', 'en'];
const NEXT_LANGUAGE_NAMES = ['Korean', 'English', 'Japanese'];
const ENGLISH_LANGUAGE = 'en';

function getParentheticals(text) {
  return [...text.matchAll(/[(（]([^()（）]*)[)）]/g)]
    .map(match => match[1].trim())
    .filter(Boolean);
}

export default function StudyRow({ row, onUpdateCell, onSaveRow, onDelete, onAddImage, onCellKeyDown }) {
  const [anchor, setAnchor] = useState(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const { pronounceDisabled, handlePronounce } = usePronunciation();
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
  }, []);

  function handleCellEnter(ev, lang) {
    if (lang === ENGLISH_LANGUAGE) return;
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

  const activeField = STUDY_FIELDS[displayIndex];
  const activeLanguage = STUDY_LANGUAGES[displayIndex];
  const activeValue = row[activeField] ?? '';
  const nextIndex = (displayIndex + 1) % STUDY_FIELDS.length;
  const nextValue = row[STUDY_FIELDS[nextIndex]] ?? '';
  const reading = (row.furigana ? [row.furigana] : getParentheticals(row.word)).join(' ');
  const showReading = activeLanguage === 'ja' && reading !== '' && reading !== row.word.trim();
  const isTooltipVisible = anchor !== null && activeLanguage !== ENGLISH_LANGUAGE;

  function handleFlip() {
    if (isFlipping) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplayIndex(nextIndex);
      return;
    }
    setIsFlipping(true);
  }

  function handleFlipTransitionEnd(ev) {
    if (ev.target !== ev.currentTarget) return;
    setDisplayIndex(index => (index + 1) % STUDY_FIELDS.length);
    setIsFlipping(false);
  }

  return (
    <tr>
      <td className="study-word-cell">
        <div
          className={`study-flip-card${isFlipping ? ' is-flipping' : ''}`}
        >
          <div className="study-flip-sizer" aria-hidden="true">
            {STUDY_FIELDS.map(field => (
              <span className="study-flip-size-value" key={field}>
                {row[field] ?? ''}
              </span>
            ))}
          </div>
          <div className="study-flip-face study-flip-front" onTransitionEnd={handleFlipTransitionEnd}>
            <EditableCell
              value={activeValue}
              onSave={(value) => onUpdateCell(activeField, value)}
              onKeyDown={onCellKeyDown}
              onMouseEnter={(ev) => handleCellEnter(ev, activeLanguage)}
              onMouseLeave={handleLeave}
            />
          </div>
          <div className="study-flip-face study-flip-back" aria-hidden="true">
            {nextValue}
          </div>
        </div>
      </td>
      <td>
        <button
          type="button"
          className="flip-study-word-btn"
          aria-label={`Show ${NEXT_LANGUAGE_NAMES[displayIndex]}`}
          onClick={handleFlip}
          disabled={isFlipping}
        >
          <img src={flipIcon} alt="" />
        </button>
      </td>
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
          className={`translation-tooltip${isTooltipVisible ? ' show' : ''}`}
          style={isTooltipVisible ? { bottom: anchor.bottom, right: anchor.right } : undefined}
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
              disabled={pronounceDisabled[anchor?.lang ?? 'ja']}
              onClick={() => {
                void handlePronounce(anchor?.lang ?? activeLanguage, activeValue);
              }}
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
