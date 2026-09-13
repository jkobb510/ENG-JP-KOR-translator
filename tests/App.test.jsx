import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../src/App.jsx';

describe('[Unit] App', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('shows Japanese as the default target language', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Japanese' })).toBeInTheDocument();
  });

  test('swaps input and target languages', () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText('Swap languages'));
    expect(screen.getAllByRole('button', { name: 'English' })[0]).toBeInTheDocument();
  });

  test('translates and renders the result', async () => {
    jest.useFakeTimers();
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ translation: 'こんにちは', romanization: 'konnichiwa' })
    });

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter text'), { target: { value: 'hello' } });
    jest.advanceTimersByTime(1000);
    jest.useRealTimers();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/translate',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  test('shows an error message on network failure', async () => {
    jest.useFakeTimers();
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Enter text'), { target: { value: 'hello' } });
    jest.advanceTimersByTime(1000);
    jest.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to connect')).toBeInTheDocument();
    });
  });
});
