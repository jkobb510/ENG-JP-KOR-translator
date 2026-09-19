import { useEffect, useState } from 'react';
import copyIcon from '../copy.png';

const STORAGE_KEY = 'studyTable';

function loadRows() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load study table from localStorage:', e);
    return [];
  }
}

export default function StudyTable({ canSave, onSaveRef }) {
  const [rows, setRows] = useState(loadRows);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  function addRow(word, translation, translation2) {
    if (!word || !translation) {
      alert('Please enter text and get a translation first.');
      return;
    }
    setRows(prev => [...prev, { word, translation, translation2 }]);
  }

  function deleteRow(index) {
    setRows(prev => prev.filter((_, i) => i !== index));
  }

  function updateCell(index, field, value) {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function handleCellKeyDown(ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      ev.target.blur();
    }
  }

  function clearRows() {
    setRows([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function copyTable() {
    const header = ['Word', 'Translation', 'Translation 2'];
    const lines = [header, ...rows.map(row => [row.word, row.translation ?? row.definition ?? '', row.translation2 ?? ''])];
    const text = lines.map(cols => cols.join('\t')).join('\n');
    navigator.clipboard.writeText(text);
  }

  onSaveRef.current = addRow;

  return (
    <>
      <div className={`study-table-container${rows.length ? ' show' : ''}`} id="studyTableContainer">
        <table className="study-table">
          <thead>
            <tr>
              <th>Word</th>
              <th>Translation</th>
              <th>Translation 2</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="studyTableBody">
            {rows.map((row, i) => (
              <tr key={i}>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(ev) => updateCell(i, 'word', ev.target.textContent)}
                  onKeyDown={handleCellKeyDown}
                >
                  {row.word}
                </td>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(ev) => updateCell(i, 'translation', ev.target.textContent)}
                  onKeyDown={handleCellKeyDown}
                >
                  {row.translation ?? row.definition}
                </td>
                <td
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(ev) => updateCell(i, 'translation2', ev.target.textContent)}
                  onKeyDown={handleCellKeyDown}
                >
                  {row.translation2}
                </td>
                <td>
                  <button
                    type="button"
                    className="delete-row-btn"
                    aria-label="Delete row"
                    onClick={() => deleteRow(i)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`delete-button-container${rows.length ? ' show' : ''}`}>
        <button type="button" className="copy-table-btn" onClick={copyTable}>
          <img src={copyIcon} alt="" /> Copy Table
        </button>
        <button type="button" className="delete-study-btn" onClick={clearRows}>
          Delete Study Table
        </button>
      </div>
    </>
  );
}
