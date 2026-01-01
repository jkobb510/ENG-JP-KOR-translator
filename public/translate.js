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
  const { text, input, target } = Object.fromEntries(fd.entries());
  const resultEl = document.getElementById('result');
  const pronounceBtn = document.getElementById('pronounceBtn');
  resultEl.textContent = 'Translating...';
  pronounceBtn.style.display = 'none';
  
  try {
    const res = await getTranslateAPI(text, input, target);
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await res.text();
      console.error('Received non-JSON response:', responseText);
      resultEl.textContent = 'Error: Server returned invalid response';
      return;
    }

    const data = await res.json();
    
    if (!res.ok) {
      resultEl.textContent = 'Error: ' + (data.error || 'Unknown error');
      console.error('Translation Request Failed:', data.error);
      return;
    }

    processResponse(data, resultEl, input, target);
  } catch (err) {
    resultEl.textContent = 'Error: Failed to connect';
    console.error('Network Error:', err);
  }
}

function processResponse(data, resultEl, input, target) {
  let output = data.translation || '';
  
  if ((input === 'ja' || input === 'ko') && target === 'en') {
    output = `${data.translation}`;
  } else if (input === 'en' && (target === 'ja' || target === 'ko')) {
    output = data.translation || '';
  }
  
  resultEl.textContent = output;
  resultEl.dataset.targetLang = target;
  resultEl.dataset.textToSpeak = data.translation || '';
  
  const pronounceBtn = document.getElementById('pronounceBtn');
  pronounceBtn.style.display = (target === 'ja' || target === 'ko') ? 'inline-block' : 'none';
}

async function getTranslateAPI(text, input, target) {
  return await fetch('/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, input, target })
  });
}

export { initTranslate, translateAndRender, triggerTranslate, processResponse, getTranslateAPI };