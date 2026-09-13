import { useEffect, useState } from 'react';

const STORAGE_KEY = 'studyTable';

export default function StudyTable({ canSave, onSaveRef }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setRows(JSON.parse(stored));
    } catch (e) {
      console.error('Failed to load study table from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  function addRow(word, definition) {
    if (!word || !definition) {
      alert('Please enter text and get a translation first.');
      return;
    }
    setRows(prev => [...prev, { word, definition }]);
  }

  function clearRows() {
    setRows([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  onSaveRef.current = addRow;

  return (
    <>
      <div className={`study-table-container${rows.length ? ' show' : ''}`} id="studyTableContainer">
        <table className="study-table">
          <thead>
            <tr>
              <th>Word</th>
              <th>Definition</th>
            </tr>
          </thead>
          <tbody id="studyTableBody">
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{row.word}</td>
                <td>{row.definition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`delete-button-container${rows.length ? ' show' : ''}`}>
        <button type="button" className="delete-study-btn" onClick={clearRows}>
          Delete Study Table
        </button>
      </div>
    </>
  );
}
