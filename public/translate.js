  const textInput = document.querySelector('textarea[name="text"]');
  let debounceTimeout;

textInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(triggerTranslate, 1000);
  });

function triggerTranslate() {
    const form = document.getElementById('translateForm');
    if (textInput.value.trim()) {
      translateAndRender(form);
    }
  }

async function translateAndRender(form) {
  const fd = new FormData(form);
  const { text, input, target } = Object.fromEntries(fd.entries());
  const resultEl = document.getElementById('result');
  const pronounceBtn = document.getElementById('pronounceBtn');
  resultEl.textContent = 'Translating...';
  pronounceBtn.style.display = 'none';
  
  try {
    const res = await getTranslateAPI(text, input, target);
    const data = await res.json();
    processResponse(res.ok, data, resultEl, text, input, target);
  } catch (err) {
    resultEl.textContent = 'Error: Failed to connect';
    console.error('Network Error:', err);
  }
}

function processResponse(ok, data, resultEl, originalText, input, target) {
  if (ok) {
    let output = data.translation || '';
    
    if ((input === 'ja' || input === 'ko') && target === 'en') {
      output = `${data.translation}`;
    } else if (input === 'en' && (target === 'ja' || target === 'ko')) {
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

async function getTranslateAPI(text, input, target) {
  const backendUrl = 'https://translator-backend-production-67af.up.railway.app';
  return await fetch(`${backendUrl}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, input, target })
  });
}
export { translateAndRender, triggerTranslate };