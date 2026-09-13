export async function getTranslateAPI(text, input, target) {
  return fetch('/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, input, target })
  });
}

export async function getPronounceAPI(text, lang) {
  return fetch('/pronounce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang })
  });
}
