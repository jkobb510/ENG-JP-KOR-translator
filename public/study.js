const STORAGE_KEY = 'studyTable';

function saveTableToLocalStorage() {
  const tableBody = document.getElementById('studyTableBody');
  const rows = [];
  tableBody.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 2) {
      rows.push({
        word: cells[0].textContent,
        definition: cells[1].textContent
      });
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

function loadTableFromLocalStorage() {
  const tableBody = document.getElementById('studyTableBody');
  const tableContainer = document.getElementById('studyTableContainer');
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    try {
      const rows = JSON.parse(stored);
      rows.forEach(({ word, definition }) => {
        const row = document.createElement('tr');
        const wordCell = document.createElement('td');
        const defCell = document.createElement('td');
        wordCell.textContent = word;
        defCell.textContent = definition;
        row.appendChild(wordCell);
        row.appendChild(defCell);
        tableBody.appendChild(row);
      });
      if (rows.length > 0) {
        tableContainer.classList.add('show');
      }
    } catch (e) {
      console.error('Failed to load study table from localStorage:', e);
    }
  }
}

export function initStudyButton() {
  const saveBtn = document.getElementById('saveToStudyBtn');
  const deleteBtn = document.getElementById('deleteStudyTableBtn');
  const deleteContainer = document.getElementById('deleteButtonContainer');
  const resultEl = document.getElementById('result');
  const textInput = document.querySelector('textarea[name="text"]');
  const tableContainer = document.getElementById('studyTableContainer');
  const tableBody = document.getElementById('studyTableBody');

  // Load table from localStorage on init
  loadTableFromLocalStorage();
  if (tableContainer.classList.contains('show')) {
    deleteContainer.classList.add('show');
  }

  // Show save button when result has content
  const observer = new MutationObserver(() => {
    if (resultEl.textContent.trim() && !resultEl.textContent.includes('Error')) {
      saveBtn.style.display = 'inline-block';
    } else {
      saveBtn.style.display = 'none';
    }
  });

  observer.observe(resultEl, { childList: true, characterData: true, subtree: true });

  // Handle save button click
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const inputText = textInput.value.trim();
    const translation = resultEl.textContent.trim();

    if (!inputText || !translation) {
      alert('Please enter text and get a translation first.');
      return;
    }

    // Show table if hidden
    if (!tableContainer.classList.contains('show')) {
      tableContainer.classList.add('show');
      deleteContainer.classList.add('show');
    }

    // Add new row
    const row = document.createElement('tr');
    const inputCell = document.createElement('td');
    const translationCell = document.createElement('td');

    inputCell.textContent = inputText;
    translationCell.textContent = translation;

    row.appendChild(inputCell);
    row.appendChild(translationCell);

    tableBody.appendChild(row);
    saveTableToLocalStorage();
  });

  // Handle delete button click
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    tableBody.innerHTML = '';
    tableContainer.classList.remove('show');
    deleteContainer.classList.remove('show');
    localStorage.removeItem(STORAGE_KEY);
  });
}
