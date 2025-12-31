import { initPronounceButton } from './pronounce.js'
import { selectLanguage } from './selectLanguage.js'
import { triggerTranslate } from './translate.js'
import { initSwapButton } from './swap.js';

document.addEventListener('DOMContentLoaded', () => {
  selectLanguage('#inputSelect', 'input[name="input"]', triggerTranslate);
  selectLanguage('#targetSelect', 'input[name="target"]', triggerTranslate);
  initSwapButton(triggerTranslate);
  initPronounceButton();
});