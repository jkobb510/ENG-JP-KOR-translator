import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../src/App.jsx';

describe('[Unit] App', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('renders the input textarea', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  test('translates and renders the result', async () => {
    jest.useFakeTimers();
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        detected: 'en',
        ja: { text: 'こんにちは', furigana: null, romanization: 'konnichiwa' },
        ko: { text: '안녕하세요', romanization: 'annyeonghaseyo' }
      })
    });

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter text'), { target: { value: 'hello' } });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    jest.useRealTimers();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/translate',
        expect.objectContaining({ method: 'POST' })
      );
    });

    expect(await screen.findByText('こんにちは')).toBeInTheDocument();
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
  });

  test('shows an error message on network failure', async () => {
    jest.useFakeTimers();
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter text'), { target: { value: 'hello' } });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    jest.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to connect')).toBeInTheDocument();
    });
  });
});
