import copyIcon from '../assets/copy.png';
import { copyStudyTable } from '../utils/studyTableClipboard.js';

export default function StudyTableActions({ rows, onClear }) {
  return (
    <div className={`delete-button-container${rows.length ? ' show' : ''}`}>
      <button type="button" className="copy-table-btn" onClick={() => copyStudyTable(rows)}>
        <img src={copyIcon} alt="" /> Copy Table
      </button>
      <button type="button" className="delete-study-btn" onClick={onClear}>
        Delete Study Table
      </button>
    </div>
  );
}
