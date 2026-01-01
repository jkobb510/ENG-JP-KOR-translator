import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('Translation Integration', () => {
  let container;
  let consoleErrorSpy;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <form id="translateForm">
        <textarea name="text"></textarea>
        <input type="hidden" name="input" value="en">
        <input type="hidden" name="target" value="ja">
      </form>
      <div id="result"></div>
      <button id="pronounceBtn" style="display: none;"></button>
    `;

    global.fetch = jest.fn();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    consoleErrorSpy.mockRestore();
  });

  test('should translate and update UI on success', async () => {
    const { translateAndRender } = await import('../public/translate.js');
    
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ translation: 'テスト', romanization: 'tesuto' })
    });

    const form = document.getElementById('translateForm');
    document.querySelector('textarea[name="text"]').value = 'test';

    await translateAndRender(form);

    expect(fetch).toHaveBeenCalledWith('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'test', input: 'en', target: 'ja' })
    });

    const result = document.getElementById('result');
    expect(result.textContent).toBe('テスト');
    expect(result.dataset.targetLang).toBe('ja');
    expect(document.getElementById('pronounceBtn').style.display).toBe('inline-block');
  });

  test('should show error on server failure', async () => {
    const { translateAndRender } = await import('../public/translate.js');
    
    fetch.mockResolvedValueOnce({
      ok: false,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ error: 'Translation service failed.' })
    });

    const form = document.getElementById('translateForm');
    document.querySelector('textarea[name="text"]').value = 'test';

    await translateAndRender(form);

    expect(document.getElementById('result').textContent).toContain('Translation service failed');
  });

  test('should show error on network failure', async () => {
    const { translateAndRender } = await import('../public/translate.js');
    
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const form = document.getElementById('translateForm');
    document.querySelector('textarea[name="text"]').value = 'test';

    await translateAndRender(form);

    expect(document.getElementById('result').textContent).toBe('Error: Failed to connect');
  });
});