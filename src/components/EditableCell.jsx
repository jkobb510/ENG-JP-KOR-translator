export default function EditableCell({ value, onSave, onKeyDown, onMouseEnter, onMouseLeave }) {
  return (
    <td
      contentEditable
      suppressContentEditableWarning
      onBlur={(ev) => onSave(ev.currentTarget.textContent)}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {value}
    </td>
  );
}
