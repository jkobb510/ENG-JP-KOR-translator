import { useState } from 'react';

export default function useRecordingModal({ recorderRef, setRecordingState, releaseStream, onDelete }) {
  const [modalOpen, setModalOpen] = useState(false);

  function handlePause() {
    recorderRef.current.pause();
    setRecordingState('paused');
    setModalOpen(true);
  }

  function handleFinish() {
    setModalOpen(false);
    recorderRef.current.stop();
  }

  function handleContinue() {
    setModalOpen(false);
    recorderRef.current.resume();
    setRecordingState('recording');
  }

  function handleDelete() {
    setModalOpen(false);
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder?.state !== 'inactive') recorder?.stop();
    releaseStream(recorder?.stream);
    setRecordingState('idle');
    onDelete();
  }

  return { modalOpen, handlePause, handleFinish, handleContinue, handleDelete };
}