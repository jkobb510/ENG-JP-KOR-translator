import { useState } from 'react';
import { useStudyRows } from '../hooks/useStudyRows.js';
import ImageModal from './ImageModal.jsx';
import StudyTableActions from './StudyTableActions.jsx';
import StudyRow from './StudyRow.jsx';

export default function StudyTable({ onSaveRef }) {
  const { rows, addRow, saveRow, deleteRow, clearRows } = useStudyRows();
  const [imageModalIndex, setImageModalIndex] = useState(null);

  function handleAddRow(word, translation, translation2, furigana) {
    if (!word || !translation) {
      alert('Please enter text and get a translation first.');
      return;
    }
    addRow({ word, translation, translation2, furigana });
  }

  function updateCell(index, field, value) {
    const row = rows[index];
    if (!row) return;
    saveRow({ ...row, [field]: value });
  }

  function handleCellKeyDown(ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      ev.target.blur();
    }
  }

  onSaveRef.current = handleAddRow;

  return (
    <>
      <div className={`study-table-container${rows.length ? ' show' : ''}`} id="studyTableContainer">
        <table className="study-table">
          <thead>
            <tr>
              <th>To Study</th>
              <th aria-label="Flip phrase" />
              <th>Img</th>
              <th>Del</th>
            </tr>
          </thead>
          <tbody id="studyTableBody">
            {rows.map((row, i) => (
              <StudyRow
                key={row.id}
                row={row}
                onUpdateCell={(field, value) => updateCell(i, field, value)}
                onSaveRow={saveRow}
                onDelete={() => deleteRow(row.id)}
                onAddImage={() => setImageModalIndex(i)}
                onCellKeyDown={handleCellKeyDown}
              />
            ))}
          </tbody>
        </table>
      </div>
      <StudyTableActions rows={rows} onClear={clearRows} />

      {imageModalIndex !== null && (
        <ImageModal
          row={rows[imageModalIndex]}
          onClose={() => setImageModalIndex(null)}
          onUpdateRow={saveRow}
        />
      )}
    </>
  );
}
