export default function EditableCell({ value, onSave, onKeyDown }) {
  return (
    <td
      contentEditable
      suppressContentEditableWarning
      onBlur={(ev) => onSave(ev.currentTarget.textContent)}
      onKeyDown={onKeyDown}
    >
      {value}
    </td>
  );
}
