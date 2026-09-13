import { useEffect, useRef, useState } from 'react';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' }
];

export default function LanguageSelect({ id, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(ev) {
      if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false);
    }
    function handleEscape(ev) {
      if (ev.key === 'Escape') setOpen(false);
    }
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selected = LANGUAGES.find(l => l.value === value) ?? LANGUAGES[0];

  function selectOption(optionValue) {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    <div
      id={id}
      ref={rootRef}
      className={`custom-select${open ? ' open' : ''}`}
      data-value={value}
      aria-haspopup="listbox"
    >
      <button
        type="button"
        className="custom-select-toggle"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(ev) => {
          if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            setOpen(true);
          }
        }}
      >
        {selected.label}
      </button>
      <ul className="custom-select-menu" role="listbox" tabIndex={-1}>
        {LANGUAGES.map((lang, i) => (
          <li
            key={lang.value}
            role="option"
            tabIndex={0}
            data-value={lang.value}
            aria-selected={lang.value === value}
            onClick={() => selectOption(lang.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                selectOption(lang.value);
              } else if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                ev.currentTarget.parentElement.children[(i + 1) % LANGUAGES.length].focus();
              } else if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                ev.currentTarget.parentElement.children[(i - 1 + LANGUAGES.length) % LANGUAGES.length].focus();
              }
            }}
          >
            {lang.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
