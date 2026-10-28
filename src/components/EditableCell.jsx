export default function EditableCell({ value, onSave, onKeyDown, onMouseEnter, onMouseLeave, className }) {
  return (
    <div
      className={`editable-cell-content${className ? ` ${className}` : ''}`}
      contentEditable
      suppressContentEditableWarning
      onBlur={(ev) => onSave(ev.currentTarget.textContent)}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {value}
    </div>
  );
}
