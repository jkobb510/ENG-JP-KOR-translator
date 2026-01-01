import { setSelectValue } from '../public/swap.js';
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('[Unit] setSelectValue (DOM tests)', () => {
  beforeEach(() => {
    // mock DOM for DOM manipulation
    document.body.innerHTML = `
      <div class="custom-select" id="inputSelect">
        <button class="custom-select-toggle">English</button>
        <ul class="custom-select-menu">
          <li data-value="en" aria-selected="true">English</li>
          <li data-value="ja" aria-selected="false">Japanese</li>
        </ul>
      </div>
    `;
  });

  test('should update button text', () => {
    const btn = document.querySelector('#inputSelect .custom-select-toggle');
    setSelectValue('#inputSelect', 'ja');
    expect(btn.textContent).toBe('Japanese');
  });

  test('should toggle aria-selected', () => {
    const options = document.querySelectorAll('li[data-value]');
    setSelectValue('#inputSelect', 'ja');
    expect(options[1].getAttribute('aria-selected')).toBe('true');
    expect(options[0].getAttribute('aria-selected')).toBe('false');
  });
});

describe('[Unit] Translation API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('should POST with correct payload', async () => {
    const { getTranslateAPI } = await import('../public/translate.js');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translation: 'こんにちは' })
    });

    await getTranslateAPI('hello', 'en', 'ja');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/translate'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('should handle network errors', async () => {
    const { getTranslateAPI } = await import('../public/translate.js');
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(getTranslateAPI('hello', 'en', 'ja')).rejects.toThrow();
  });
});