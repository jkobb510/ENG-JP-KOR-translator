import micIcon from '../assets/mic.png';
import micListeningIcon from '../assets/mic-listening.png';
import playIcon from '../assets/play.png';
import pauseIcon from '../assets/pause.png';
import deleteRecordingIcon from '../assets/deleteRecording.png';
import useAudioRecording from '../hooks/useAudioRecording.js';

export default function RecordButton({ row, onUpdateRow }) {
  const { state, modalOpen, handleClick, handleFinish, handleContinue, handleDelete, handleDeleteSaved } = useAudioRecording(row, onUpdateRow);
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
