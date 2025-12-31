import { jest, describe, test, expect, beforeEach } from '@jest/globals';

describe('Translation API', () => {
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