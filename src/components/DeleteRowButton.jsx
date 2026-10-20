export default function DeleteRowButton({ onClick }) {
  return (
    <button type="button" className="delete-row-btn" aria-label="Delete row" onClick={onClick}>
      ✕
    </button>
  );
}
