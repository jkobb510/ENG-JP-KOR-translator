export async function initPronounceButton() {
  const pronounceBtn = document.getElementById('pronounceBtn');
  const resultEl = document.getElementById('result');

  pronounceBtn.addEventListener('click', async () => {
    const textToSpeak = resultEl.dataset.textToSpeak;
    const targetLang = resultEl.dataset.targetLang;
    
    if (textToSpeak) {
      pronounceBtn.disabled = true;
      pronounceBtn.textContent = '🔄';
      
      try {
        const res = await fetch('/pronounce', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSpeak, lang: targetLang })
        });

        if (!res.ok) throw new Error('TTS failed');

        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } catch (err) {
        console.error('Pronunciation Error:', err);
        alert('Failed to pronounce');
      } finally {
        pronounceBtn.disabled = false;
        pronounceBtn.textContent = '🔊';
      }
    }
  });
}