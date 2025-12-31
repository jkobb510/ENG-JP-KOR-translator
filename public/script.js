import { initPronounceButton } from './pronounce.js'
import { selectLanguage } from './selectLanguage.js'
import { triggerTranslate } from './translate.js'

document.addEventListener('DOMContentLoaded', () => {
  // Initialize input language dropdown
  selectLanguage('#inputSelect', 'input[name="input"]', triggerTranslate);
  // Initialize target language dropdown
  selectLanguage('#targetSelect', 'input[name="target"]', triggerTranslate);

  // Initialize pronunciation button
  initPronounceButton();
});