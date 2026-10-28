import { useEffect, useRef, useState } from 'react';
import useRecordingModal from './useRecordingModal.js';

export default function useAudioRecording(row, onUpdateRow) {
  const [state, setState] = useState(row.audio ? 'saved' : 'idle');
  const recorderRef = useRef(null);
  const audioRef = useRef(null);
  const rowRef = useRef(row);
  rowRef.current = row;
  const {
    modalOpen,
    handlePause,
    handleFinish,
    handleContinue,
    handleDelete
  } = useRecordingModal({
    recorderRef,
    setRecordingState: setState,
    releaseStream,
    onDelete: () => {
      if (row.audio) removeAudioFromRow();
    }
  });

  function disposeAudio() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    URL.revokeObjectURL(audioRef.current.src);
    audioRef.current = null;
  }

  function releaseStream(stream) { stream?.getTracks().forEach(track => track.stop()); }

  function removeAudioFromRow() {
    const { audio, ...rowWithoutAudio } = row;
    onUpdateRow(rowWithoutAudio);
  }

  useEffect(() => {
    return () => {
      disposeAudio();
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder?.state !== 'inactive') recorder?.stop?.();
      releaseStream(recorder?.stream);
    };
  }, []);

  useEffect(() => { 
    disposeAudio(); 
    setState(row.audio ? 'saved' : 'idle'); 
  }, [row.audio]);

  async function saveRecording(recorder, chunks) {
    releaseStream(recorder.stream);
    if (recorderRef.current !== recorder) return;

    try {
      const audio = new Blob(chunks, { type: recorder.mimeType });
      await onUpdateRow({ ...rowRef.current, audio });
    } catch (error) {
      if (recorderRef.current !== recorder) return;
      recorderRef.current = null;
      setState('idle');
      console.error('Failed to save recording:', error);
      return;
    }

    if (recorderRef.current !== recorder) return;
    recorderRef.current = null;
    setState('saved');
  }

  function startMediaRecorder(stream, request) {
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    request.recorder = recorder;
    recorderRef.current = recorder;
    recorder.ondataavailable = event => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => saveRecording(recorder, chunks);
    recorder.start();
    setState('recording');
  }

  function handleRecordingStartError(error, request, stream) {
    if (recorderRef.current !== request && recorderRef.current !== request.recorder) return;

    recorderRef.current = null;
    releaseStream(stream);
    console.error('Recording failed:', error);
    setState('idle');
  }

  async function startRecording() {
    if (recorderRef.current) return;

    const request = {};
    let stream;
    recorderRef.current = request;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (recorderRef.current !== request) {
        releaseStream(stream);
        return;
      }

      startMediaRecorder(stream, request);
    } catch (error) {
      handleRecordingStartError(error, request, stream);
    }
  }

  function playRecording() {
    if (!row.audio) return;

    if (!audioRef.current) {
      const audio = new Audio(URL.createObjectURL(row.audio));
      audio.onended = () => { if (audioRef.current === audio) setState('saved'); };
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    audio.play().then(() => {
      if (audioRef.current === audio) setState('playing');
    }).catch(() => {
      if (audioRef.current === audio) setState('saved');
    });
  }

  function pausePlayback() { 
    audioRef.current?.pause(); 
    setState('saved'); 
  }

  function handleClick() {
    switch (state) {
      case 'idle':
        void startRecording();
        break;
      case 'recording':
        handlePause();
        break;
      case 'saved':
        playRecording();
        break;
      case 'playing':
        pausePlayback();
        break;
      default:
        break;
    }
  }

  function handleDeleteSaved() {
    disposeAudio();
    setState('idle');
    removeAudioFromRow();
  }

  return {
    state,
    modalOpen,
    handleClick,
    handleFinish,
    handleContinue,
    handleDelete,
    handleDeleteSaved
  };
}