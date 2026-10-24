function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  })[character]);
}

function buildClipboardContent(rows) {
  const tableRows = [
    ['Japanese', 'Korean', 'English'],
    ...rows.map(row => [row.word, row.translation ?? '', row.translation2 ?? ''])
  ];
  const text = tableRows.map(columns => columns.join('\t')).join('\n');
  const cellStyle = 'border: 1px solid #000; padding: 6px 10px;';
  const htmlRows = tableRows
    .map(columns => `<tr>${columns.map(value => `<td style="${cellStyle}">${escapeHtml(value)}</td>`).join('')}</tr>`)
    .join('');

  return {
    text,
    html: `<table style="border-collapse: collapse;">${htmlRows}</table>`
  };
}

export async function copyStudyTable(rows) {
  const { text, html } = buildClipboardContent(rows);

  try {
    if (navigator.clipboard?.write && window.ClipboardItem) {
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' })
      });
      await navigator.clipboard.write([clipboardItem]);
      return;
    }

    await navigator.clipboard.writeText(text);
  } catch (error) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (fallbackError) {
      console.error('Failed to copy study table:', fallbackError ?? error);
    }
  }
}