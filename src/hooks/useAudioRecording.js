import { useEffect, useRef, useState } from 'react';

export default function useAudioRecording(row, onUpdateRow) {
  const [state, setState] = useState(row.audio ? 'saved' : 'idle');
  const [modalOpen, setModalOpen] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const discardRef = useRef(false);
  const audioRef = useRef(null);

  function disposeAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    URL.revokeObjectURL(audio.src);
    audioRef.current = null;
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }

  useEffect(() => () => {
    disposeAudio();
    discardRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    releaseStream();
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      discardRef.current = false;
      recorder.ondataavailable = event => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        releaseStream();
        if (discardRef.current) return;

        const audio = new Blob(chunksRef.current, { type: recorder.mimeType });
        onUpdateRow({ ...row, audio });
      };
      recorder.start();
      recorderRef.current = recorder;
      setState('recording');
    } catch (error) {
      console.error('Microphone access failed:', error);
      alert('Could not access the microphone.');
    }
  }

  function playRecording() {
    if (!row.audio) return;

    if (!audioRef.current) {
      const audio = new Audio(URL.createObjectURL(row.audio));
      audio.onended = () => setState('saved');
      audioRef.current = audio;
    }
    audioRef.current.play();
    setState('playing');
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
        recorderRef.current.pause();
        setState('paused');
        setModalOpen(true);
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

  function handleFinish() {
    setModalOpen(false);
    recorderRef.current.stop();
    setState('saved');
  }

  function handleContinue() {
    setModalOpen(false);
    recorderRef.current.resume();
    setState('recording');
  }

  function handleDelete() {
    setModalOpen(false);
    discardRef.current = true;
    recorderRef.current?.stop();
    chunksRef.current = [];
    setState('idle');

    if (row.audio) {
      const { audio, ...rowWithoutAudio } = row;
      onUpdateRow(rowWithoutAudio);
    }
  }

  function handleDeleteSaved() {
    disposeAudio();
    setState('idle');
    const { audio, ...rowWithoutAudio } = row;
    onUpdateRow(rowWithoutAudio);
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