import { useRef } from 'react';
import importImgIcon from '../assets/import-img.png';
import resizeImageFile from '../utils/resizeImageFile.js';

function handleCellKeyDown(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    ev.target.blur();
  }
}

export default function ImageModal({ row, onClose, onUpdateRow }) {
  const importFileInputRef = useRef(null);

  function handleTitleBlur(event) {
    const title = event.target.textContent;
    const parts = title.split(' - ');
    const word = parts[0]?.trim() ?? '';
    const translation = parts[1]?.trim() ?? '';
    const translation2 = parts[2]?.trim() ?? '';
    onUpdateRow({ ...row, word, translation, translation2 });
  }

  async function saveImageFile(file) {
    try {
      const image = await resizeImageFile(file);
      onUpdateRow({ ...row, image });
    } catch (error) {
      console.error('Failed to import image:', error);
    }
  }

  function handleImagePaste(ev) {
    const items = ev.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        void saveImageFile(file);
        break;
      }
    }
  }

  function handleImageDrop(ev) {
    ev.preventDefault();
    const file = [...(ev.dataTransfer?.files ?? [])].find(f => f.type.startsWith('image/'));
    if (file) void saveImageFile(file);
  }

  function handleImageDragOver(ev) {
    ev.preventDefault();
  }

  function handleImportImage(ev) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    void saveImageFile(file);
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
