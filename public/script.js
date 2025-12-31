import { initPronounceButton } from './pronounce.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize source language dropdown
  initCustomSelect('#sourceSelect', 'input[name="source"]', triggerTranslate);
  // Initialize target language dropdown
  initCustomSelect('#targetSelect', 'input[name="target"]', triggerTranslate);

  const textInput = document.querySelector('textarea[name="text"]');
  let debounceTimeout;

  function triggerTranslate() {
    const form = document.getElementById('translateForm');
    if (textInput.value.trim()) {
      translateAndRender(form);
    }
  }

  textInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(triggerTranslate, 1000);
  });

  // Initialize pronunciation button
  initPronounceButton();
});

function initCustomSelect(selector, hiddenInputSelector, onSelect) {
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

async function translateAndRender(form) {
  const fd = new FormData(form);
  const { text, source, target } = Object.fromEntries(fd.entries());
  const resultEl = document.getElementById('result');
  const pronounceBtn = document.getElementById('pronounceBtn');
  resultEl.textContent = 'Translating...';
  pronounceBtn.style.display = 'none';
  
  try {
    const res = await getTranslateAPI(text, source, target);
    const data = await res.json();
    processResponse(res.ok, data, resultEl, text, source, target);
  } catch (err) {
    resultEl.textContent = 'Error: Failed to connect';
    console.error('Network Error:', err);
  }
}

function processResponse(ok, data, resultEl, originalText, source, target) {
  if (ok) {
    let output = data.translation || '';
    
    if ((source === 'ja' || source === 'ko') && target === 'en') {
      output = `${data.translation}\n${originalText}`;
    } else if (source === 'en' && (target === 'ja' || target === 'ko')) {
      output = data.translation || '';
    }
    
    resultEl.textContent = output;
    resultEl.dataset.targetLang = target;
    resultEl.dataset.textToSpeak = data.translation || '';
    
    // Show pronounce button for Japanese and Korean
    const pronounceBtn = document.getElementById('pronounceBtn');
    pronounceBtn.style.display = (target === 'ja' || target === 'ko') ? 'inline-block' : 'none';
  } else {
    resultEl.textContent = 'Error: ' + data.error;
    console.error('Translation Request Failed:', data.error);
    document.getElementById('pronounceBtn').style.display = 'none';
  }
}

async function getTranslateAPI(text, source, target) {
  const backendUrl = 'https://translator-backend-production-67af.up.railway.app/'; // Change this to your deployed backend URL
  return await fetch(`${backendUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source, target })
  });
}