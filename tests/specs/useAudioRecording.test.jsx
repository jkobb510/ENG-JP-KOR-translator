import { act, renderHook, waitFor } from '@testing-library/react';
import useAudioRecording from '../../src/hooks/useAudioRecording.js';
import { TestMediaRecorder } from '../TestMediaRecorder.js';
import { mockMediaDevices } from '../test-utils.js';

describe('useAudioRecording', () => {
  const originalMediaDevices = navigator.mediaDevices;
  const originalMediaRecorder = global.MediaRecorder;
  const originalAudio = global.Audio;
  const originalAlert = global.alert;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices });
    global.MediaRecorder = originalMediaRecorder;
    global.Audio = originalAudio;
    global.alert = originalAlert;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('prevents overlapping requests and saves against the latest row', async () => {
    let resolveStream;
    const stream = { getTracks: () => [{ stop: jest.fn() }] };
    const getUserMedia = jest.fn(() => new Promise(resolve => { resolveStream = resolve; }));
    mockMediaDevices({ getUserMedia });
    global.MediaRecorder = TestMediaRecorder;
    const onUpdateRow = jest.fn().mockResolvedValue(undefined);
    const initialRow = { id: 1, word: 'before' };
    const { result, rerender } = renderHook(({ row }) => useAudioRecording(row, onUpdateRow), {
      initialProps: { row: initialRow }
    });

    act(() => {
      result.current.handleClick();
      result.current.handleClick();
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveStream(stream);
      await Promise.resolve();
    });
    rerender({ row: { ...initialRow, word: 'after' } });

    act(() => {
      result.current.handleClick();
      result.current.handleFinish();
    });

    expect(onUpdateRow).toHaveBeenCalledWith(expect.objectContaining({ id: 1, word: 'after', audio: expect.any(Blob) }));
    await waitFor(() => expect(result.current.state).toBe('saved'));
  });

  it('stops a stream that resolves after unmount', async () => {
    let resolveStream;
    const stop = jest.fn();
    const stream = { getTracks: () => [{ stop }] };
    mockMediaDevices({ getUserMedia: () => new Promise(resolve => { resolveStream = resolve; }) });
    global.MediaRecorder = TestMediaRecorder;
    const { result, unmount } = renderHook(() => useAudioRecording({ id: 1 }, jest.fn()));

    act(() => result.current.handleClick());
    unmount();
    await act(async () => {
      resolveStream(stream);
      await Promise.resolve();
    });

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('returns to idle when microphone access fails', async () => {
    mockMediaDevices({ getUserMedia: jest.fn().mockRejectedValue(new Error('permission denied')) });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.alert = jest.fn();
    const { result } = renderHook(() => useAudioRecording({ id: 1 }, jest.fn()));

    act(() => result.current.handleClick());

    await waitFor(() => expect(result.current.state).toBe('idle'));
    expect(consoleError).toHaveBeenCalledWith('Recording failed:', expect.any(Error));
    expect(global.alert).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('releases the stream and returns to idle when recorder startup fails', async () => {
    const stop = jest.fn();
    const stream = { getTracks: () => [{ stop }] };
    mockMediaDevices({ getUserMedia: jest.fn().mockResolvedValue(stream) });
    global.MediaRecorder = class extends TestMediaRecorder {
      start() {
        throw new Error('recorder failed to start');
      }
    };
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAudioRecording({ id: 1 }, jest.fn()));

    await act(async () => {
      result.current.handleClick();
      await Promise.resolve();
    });

    expect(stop).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('idle');
    expect(consoleError).toHaveBeenCalledWith('Recording failed:', expect.any(Error));
    consoleError.mockRestore();
  });

  it('disposes cached playback when the row audio changes', () => {
    const pause = jest.fn();
    const play = jest.fn(() => new Promise(() => {}));
    const audio = { pause, play, src: 'blob:old-audio' };
    const revokeObjectURL = jest.fn();
    global.Audio = jest.fn(() => audio);
    URL.createObjectURL = jest.fn(() => 'blob:old-audio');
    URL.revokeObjectURL = revokeObjectURL;
    const oldAudio = new Blob(['old']);
    const { result, rerender } = renderHook(({ row }) => useAudioRecording(row, jest.fn()), {
      initialProps: { row: { id: 1, audio: oldAudio } }
    });

    act(() => result.current.handleClick());
    rerender({ row: { id: 1, audio: new Blob(['new']) } });

    expect(pause).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:old-audio');
    expect(result.current.state).toBe('saved');
  });
});