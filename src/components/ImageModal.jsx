import { useRef } from 'react';
import importImgIcon from '../import-img.png';

function handleCellKeyDown(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    ev.target.blur();
  }
}

export default function ImageModal({ row, onClose, onUpdateRow }) {
  const importFileInputRef = useRef(null);

  function handleTitleBlur(ev) {
    const [word = '', translation = '', translation2 = ''] = ev.target.textContent
      .split(' - ')
      .map(part => part.trim());
    onUpdateRow({ ...row, word, translation, translation2 });
  }

  function saveImageFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1000;
        const scale = Math.min(1, maxDim / img.width, maxDim / img.height);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        onUpdateRow({ ...row, image: canvas.toDataURL('image/jpeg', 0.8) });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function handleImagePaste(ev) {
    const items = ev.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        saveImageFile(file);
        break;
      }
    }
  }

  function handleImageDrop(ev) {
    ev.preventDefault();
    const file = [...(ev.dataTransfer?.files ?? [])].find(f => f.type.startsWith('image/'));
    if (file) saveImageFile(file);
  }

  function handleImageDragOver(ev) {
    ev.preventDefault();
  }

  function handleImportImage(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    saveImageFile(file);
  }

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <div className="image-modal" onClick={(ev) => ev.stopPropagation()}>
        <div
          className="image-modal-title"
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTitleBlur}
          onKeyDown={handleCellKeyDown}
        >
          {[row?.word, row?.translation, row?.translation2].filter(Boolean).join(' - ')}
        </div>
        <button
          type="button"
          className="image-modal-close-btn"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>
        <div
          className="image-modal-paste-area"
          tabIndex={0}
          onPaste={handleImagePaste}
          onDrop={handleImageDrop}
          onDragOver={handleImageDragOver}
        >
          {row?.image ? (
            <img src={row.image} alt="" />
          ) : (
            <span>Paste or drag an image here (Ctrl/Cmd+V)</span>
          )}
        </div>
        <label
          className="copy-table-btn import-image-btn"
          onClick={(ev) => { ev.preventDefault(); importFileInputRef.current?.click(); }}
        >
          <img src={importImgIcon} alt="" /> Import Image
        </label>
        <input
          ref={importFileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImportImage}
        />
      </div>
    </div>
  );
}
