import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../src/App.jsx';
import { createJsonResponse, getTranslateCalls, mockTranslateResponse } from '../test-utils.js';

const TRANSLATE_DEBOUNCE_MS = 1000;

async function typeAndWaitForDebounce(value) {
  fireEvent.change(screen.getByPlaceholderText('Enter text'), { target: { value } });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(TRANSLATE_DEBOUNCE_MS);
  });
}

describe('[Unit] App', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('renders the input textarea', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  test('does not call the API before the debounce delay elapses', async () => {
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter text'), { target: { value: 'hello' } });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(TRANSLATE_DEBOUNCE_MS - 1);
    });

    expect(getTranslateCalls()).toHaveLength(0);
  });

  test('translates and renders the result', async () => {
    mockTranslateResponse(() =>
      createJsonResponse({
        detected: 'en',
        ja: { text: 'こんにちは', furigana: null, romanization: 'konnichiwa' },
        ko: { text: '안녕하세요', romanization: 'annyeonghaseyo' }
      })
    );

    render(<App />);
    await typeAndWaitForDebounce('hello');

    const translateCalls = getTranslateCalls();
    expect(translateCalls).toHaveLength(1);
    const [, options] = translateCalls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ text: 'hello' });

    expect(await screen.findByText('こんにちは')).toBeInTheDocument();
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
  });

  test('shows the server error message on an HTTP error response', async () => {
    mockTranslateResponse(() =>
      createJsonResponse({ error: 'Translation failed' }, { ok: false, status: 500 })
    );

    render(<App />);
    await typeAndWaitForDebounce('hello');

    expect(await screen.findByText('Error: Translation failed')).toBeInTheDocument();
    expect(screen.queryByText('こんにちは')).not.toBeInTheDocument();
  });

  test('shows an error message on network failure', async () => {
    mockTranslateResponse(() => {
      throw new Error('Network error');
    });

    render(<App />);
    await typeAndWaitForDebounce('hello');

    expect(await screen.findByText('Error: Failed to connect')).toBeInTheDocument();
  });
});
