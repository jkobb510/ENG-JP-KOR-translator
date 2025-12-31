export function setSelectValue(selectId, value) {
  const root = document.querySelector(selectId);
  if (!root) return;
  const btn = root.querySelector('.custom-select-toggle');
  const items = root.querySelectorAll('li[data-value]');
  let label = value;
  items.forEach(li => {
    const match = li.getAttribute('data-value') === value;
    li.setAttribute('aria-selected', match ? 'true' : 'false');
    if (match) label = li.textContent.trim();
  });
  root.dataset.value = value;
  if (btn) btn.textContent = label;
}

export function initSwapButton(triggerTranslate) {
  const swapBtn = document.getElementById('swapBtn');
  if (!swapBtn) return;

  swapBtn.addEventListener('click', () => {
    const inputHidden = document.querySelector('input[name="input"]');
    const targetHidden = document.querySelector('input[name="target"]');
    if (!inputHidden || !targetHidden) return;

    const newInput = targetHidden.value;
    const newTarget = inputHidden.value;

    inputHidden.value = newInput;
    targetHidden.value = newTarget;

    setSelectValue('#inputSelect', newInput);
    setSelectValue('#targetSelect', newTarget);

    triggerTranslate?.();
  });
}