let debounceTimeout;

function initTranslate() {
  const textInput = document.querySelector('textarea[name="text"]');
  if (!textInput) return;

  textInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(triggerTranslate, 1000);
  });
}

function triggerTranslate() {
  const form = document.getElementById('translateForm');
  const textInput = document.querySelector('textarea[name="text"]');
  if (!form || !textInput) return;

  if (textInput.value.trim()) {
    translateAndRender(form);
  }
}

async function translateAndRender(form) {
  const fd = new FormData(form);
  const text = (fd.get('text') || '').toString();
  const input = (fd.get('input') || '').toString();
  const target = (fd.get('target') || '').toString();

  const resultEl = document.getElementById('result');
  const pronounceBtn = document.getElementById('pronounceBtn');
  if (resultEl) resultEl.textContent = 'Translating...';
  if (pronounceBtn) pronounceBtn.style.display = 'none';

  try {
    const res = await getTranslateAPI(text, input, target);
    const data = await res.json();
    processResponse(res.ok, data, resultEl, input, target);
  } catch (err) {
    if (resultEl) resultEl.textContent = 'Error: Failed to connect';
    console.error('Network Error:', err);
  }
}

function processResponse(ok, data, resultEl, input, target) {
  if (!resultEl) return;

  if (ok) {
    const output = data.translation || '';
    resultEl.textContent = output;
    resultEl.dataset.targetLang = target;
    resultEl.dataset.textToSpeak = data.translation || '';

    const pronounceBtn = document.getElementById('pronounceBtn');
    if (pronounceBtn) {
      pronounceBtn.style.display = (target === 'ja' || target === 'ko') ? 'inline-block' : 'none';
    }
  } else {
    resultEl.textContent = 'Error: ' + (data?.error || 'Unknown error');
    const pronounceBtn = document.getElementById('pronounceBtn');
    if (pronounceBtn) pronounceBtn.style.display = 'none';
  }
}

async function getTranslateAPI(text, input, target) {
  const backendUrl = 'https://translator-backend-production-67af.up.railway.app';
  return fetch(`${backendUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, input, target })
  });
}

export { initTranslate, translateAndRender, triggerTranslate, processResponse, getTranslateAPI };