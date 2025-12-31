import { initPronounceButton } from './pronounce.js'
import { selectLanguage } from './selectLanguage.js'
import { triggerTranslate, initTranslate } from './translate.js'
import { initSwapButton } from './swap.js';

document.addEventListener('DOMContentLoaded', () => {
  initTranslate();
  selectLanguage('#inputSelect', 'input[name="input"]', triggerTranslate);
  selectLanguage('#targetSelect', 'input[name="target"]', triggerTranslate);
  initSwapButton(triggerTranslate);
  initPronounceButton();
});