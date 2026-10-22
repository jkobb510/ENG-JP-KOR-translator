import { useState } from 'react';
import imageIcon from '../image.png';
import { useStudyRows } from '../hooks/useStudyRows.js';
import ImageModal from './ImageModal.jsx';
import StudyTableActions from './StudyTableActions.jsx';
import DeleteRowButton from './DeleteRowButton.jsx';
import EditableCell from './EditableCell.jsx';
import RecordButton from './RecordButton.jsx';

export default function StudyTable({ onSaveRef }) {
  const { rows, addRow, saveRow, deleteRow, clearRows } = useStudyRows();
  const [imageModalIndex, setImageModalIndex] = useState(null);

  function handleAddRow(word, translation, translation2) {
    if (!word || !translation) {
      alert('Please enter text and get a translation first.');
      return;
    }
    addRow({ word, translation, translation2 });
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
              <th>Word</th>
              <th>Translation</th>
              <th>Translation 2</th>
              <th>Add image</th>
              <th>Record</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody id="studyTableBody">
            {rows.map((row, i) => (
              <tr key={row.id}>
                <EditableCell
                  value={row.word}
                  onSave={(value) => updateCell(i, 'word', value)}
                  onKeyDown={handleCellKeyDown}
                />
                <EditableCell
                  value={row.translation}
                  onSave={(value) => updateCell(i, 'translation', value)}
                  onKeyDown={handleCellKeyDown}
                />
                <EditableCell
                  value={row.translation2}
                  onSave={(value) => updateCell(i, 'translation2', value)}
                  onKeyDown={handleCellKeyDown}
                />
                <td>
                  <button
                    type="button"
                    className="add-text-to-image-btn"
                    aria-label="Add image"
                    onClick={() => setImageModalIndex(i)}
                  >
                    <img src={imageIcon} alt="" />
                  </button>
                </td>
                <td>
                  <RecordButton row={row} onUpdateRow={saveRow} />
                </td>
                <td>
                  <DeleteRowButton onClick={() => deleteRow(row.id)} />
                </td>
              </tr>
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
