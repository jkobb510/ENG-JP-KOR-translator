export function selectLanguage(selector, hiddenInputSelector, onSelect) {
  const custom = document.querySelector(selector);
  const hiddenInput = document.querySelector(hiddenInputSelector);
  const toggle = custom.querySelector('.custom-select-toggle');
  const menu = custom.querySelector('.custom-select-menu');
  const options = Array.from(menu.querySelectorAll('[role="option"]'));

  function openMenu() {
    custom.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    custom.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function selectOption(optionEl) {
    options.forEach(o => o.setAttribute('aria-selected', 'false'));
    optionEl.setAttribute('aria-selected', 'true');
    const val = optionEl.dataset.value;
    hiddenInput.value = val;
    toggle.textContent = optionEl.textContent;
    custom.dataset.value = val;
    closeMenu();
    if (onSelect) onSelect();
  }

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = custom.classList.contains('open');
    if (isOpen) closeMenu();
    else openMenu();
  });

  options.forEach(opt => {
    opt.tabIndex = 0;
    opt.addEventListener('click', () => selectOption(opt));
    opt.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectOption(opt);
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = options[(options.indexOf(opt) + 1) % options.length];
        next.focus();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        const prev = options[(options.indexOf(opt) - 1 + options.length) % options.length];
        prev.focus();
      } else if (ev.key === 'Escape') {
        closeMenu();
      }
    });
  });

  toggle.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      openMenu();
    }
  });

  document.addEventListener('click', (ev) => {
    if (!custom.contains(ev.target)) closeMenu();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeMenu();
  });
}