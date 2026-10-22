import { useEffect, useRef, useState } from 'react';
import micIcon from '../mic.png';
import micListeningIcon from '../mic-listening.png';
import playIcon from '../play.png';
import pauseIcon from '../pause.png';
import deleteRecordingIcon from '../deleteRecording.png';

export default function RecordButton({ row, onUpdateRow }) {
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

  useEffect(() => () => {
    disposeAudio();
    discardRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  function releaseStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      discardRef.current = false;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        releaseStream();
        if (discardRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        onUpdateRow({ ...row, audio: blob });
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
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      recorderRef.current.pause();
      setState('paused');
      setModalOpen(true);
    } else if (state === 'saved') {
      playRecording();
    } else if (state === 'playing') {
      pausePlayback();
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
      const { audio, ...rest } = row;
      onUpdateRow(rest);
    }
  }

  function handleDeleteSaved() {
    disposeAudio();
    setState('idle');
    const { audio, ...rest } = row;
    onUpdateRow(rest);
  }

  const icons = { idle: micIcon, recording: micListeningIcon, paused: micListeningIcon, saved: playIcon, playing: pauseIcon };
  const labels = { idle: 'Record', recording: 'Pause recording', paused: 'Record', saved: 'Play recording', playing: 'Pause playback' };
  const icon = icons[state];
  const label = labels[state];

  return (
    <>
      <span className="record-wrapper">
        <button type="button" className="record-btn" aria-label={label} onClick={handleClick}>
          <img src={icon} alt="" draggable={false} />
        </button>
        {(state === 'saved' || state === 'playing') && (
          <button
            type="button"
            className="record-btn"
            aria-label="Delete recording"
            onClick={handleDeleteSaved}
          >
            <img src={deleteRecordingIcon} alt="" draggable={false} />
          </button>
        )}
      </span>
      {modalOpen && (
        <div className="image-modal-overlay">
          <div className="image-modal record-modal">
            <button type="button" className="record-modal-btn" onClick={handleFinish}>Finish</button>
            <button type="button" className="record-modal-btn" onClick={handleContinue}>Continue</button>
            <button type="button" className="record-modal-btn record-modal-delete-btn" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      )}
    </>
  );
}
