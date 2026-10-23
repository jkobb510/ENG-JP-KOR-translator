import copyIcon from '../copy.png';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export default function StudyTableActions({ rows, onClear }) {
  function copyTable() {
    const header = ['Japanese', 'Korean', 'English'];
    const lines = [header, ...rows.map(row => [row.word, row.translation ?? '', row.translation2 ?? ''])];
    const text = lines.map(cols => cols.join('\t')).join('\n');

    const cellStyle = 'border: 1px solid #000; padding: 6px 10px;';
    const tableStyle = 'border-collapse: collapse;';
    const rowsHtml = lines
      .map((cols) => `<tr>${cols.map((col) => `<td style="${cellStyle}">${escapeHtml(col)}</td>`).join('')}</tr>`)
      .join('');
    const html = `<table style="${tableStyle}">${rowsHtml}</table>`;

    if (navigator.clipboard?.write && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      });
      navigator.clipboard.write([item]).catch(() => navigator.clipboard.writeText(text));
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className={`delete-button-container${rows.length ? ' show' : ''}`}>
      <button type="button" className="copy-table-btn" onClick={copyTable}>
        <img src={copyIcon} alt="" /> Copy Table
      </button>
      <button type="button" className="delete-study-btn" onClick={onClear}>
        Delete Study Table
      </button>
    </div>
  );
}
