import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BiCheck, BiDownload, BiPause, BiPlay, BiSkipNext, BiSkipPrevious, BiX,
} from 'react-icons/bi';
import { reciterOf } from '../redux/settings/settingsSlice';
import {
  audioUrl, cacheAvailable, isAudioDownloaded, playableUrl, prefetchAudio, useDownloads,
} from '../lib/offline';
import { audioJobKey, cancelDownload, downloadAudio } from '../lib/downloads';

export { audioUrl };

// How many ayahs are loaded ahead of the one playing.
const AHEAD = 3;
const RETRIES = 4;

// Recitation, one ayah after another. The reader component decides which ayah
// plays; this bar plays it and reports when it has ended. A reciter with only
// whole-surah recordings plays the surah as one file. Downloaded surahs play
// from the device; otherwise the next ayahs are loaded ahead, and a dropped
// connection is retried, so a weak signal does not stop the recitation.
function AudioBar({
  surah, surahName, ayah, total, playing, reciter, onToggle, onStep, onEnded, onStop,
}) {
  const audioRef = useRef(null);
  const srcRef = useRef('');
  const retriesRef = useRef(0);
  const resumeRef = useRef(0);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const { name: reciterName, surahAudio } = reciterOf(reciter);
  const whole = Boolean(surahAudio);
  const title = whole ? `${surahName} · Whole surah` : `${surahName} · Ayah ${ayah}`;
  const { record, jobs } = useDownloads();
  const downloaded = isAudioDownloaded(record, reciter, surah);
  const job = jobs[audioJobKey(reciter, surah)];
  const callbacks = useRef({});
  callbacks.current = {
    onToggle, onStep, onEnded, onStop,
  };

  // One audio element for the whole session with the reader.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    const retry = () => {
      if (!srcRef.current || retriesRef.current >= RETRIES) return false;
      retriesRef.current += 1;
      resumeRef.current = audio.currentTime || resumeRef.current;
      setTimeout(() => {
        audio.src = srcRef.current;
        if (playingRef.current) audio.play().catch(() => {});
      }, 1500 * retriesRef.current);
      return true;
    };
    audio.addEventListener('ended', () => callbacks.current.onEnded());
    audio.addEventListener('waiting', () => setWaiting(true));
    audio.addEventListener('playing', () => {
      setWaiting(false);
      setFailed(false);
      retriesRef.current = 0;
    });
    // After a retry, carry on from where the sound stopped.
    audio.addEventListener('loadedmetadata', () => {
      if (resumeRef.current > 0) {
        audio.currentTime = resumeRef.current;
        resumeRef.current = 0;
      }
    });
    audio.addEventListener('error', () => {
      if (retry()) return;
      setWaiting(false);
      setFailed(true);
    });
    // Back online: try again straight away.
    const onOnline = () => {
      retriesRef.current = 0;
      if (audio.error) retry();
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      audio.pause();
      if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  useEffect(() => {
    let current = true;
    const url = audioUrl(reciter, surah, ayah);
    setFailed(false);
    retriesRef.current = 0;
    resumeRef.current = 0;
    playableUrl(url).then((src) => {
      const audio = audioRef.current;
      if (!current || !audio) {
        if (src.startsWith('blob:')) URL.revokeObjectURL(src);
        return;
      }
      if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src);
      // A retry goes back to the network address.
      srcRef.current = url;
      audio.src = src;
      if (playingRef.current) audio.play().catch(() => {});
    });
    if (!whole) {
      for (let next = ayah + 1; next <= Math.min(total, ayah + AHEAD); next += 1) {
        prefetchAudio(audioUrl(reciter, surah, next));
      }
    }
    return () => { current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah, ayah, reciter, total]);

  useEffect(() => {
    const audio = audioRef.current;
    if (playing) {
      if (audio.src) audio.play().catch(() => {});
    } else audio.pause();
  }, [playing]);

  // Lock screen and headphone controls.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaSession || typeof MediaMetadata === 'undefined') {
      return undefined;
    }
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title,
      artist: reciterName,
      album: 'Quran Karim',
    });
    session.setActionHandler('play', () => callbacks.current.onToggle(true));
    session.setActionHandler('pause', () => callbacks.current.onToggle(false));
    session.setActionHandler('nexttrack', whole ? null : () => callbacks.current.onStep(1));
    session.setActionHandler('previoustrack', whole ? null : () => callbacks.current.onStep(-1));
    return () => {
      ['play', 'pause', 'nexttrack', 'previoustrack'].forEach((action) => {
        try {
          session.setActionHandler(action, null);
        } catch (error) {
          // Not supported by this browser.
        }
      });
    };
  }, [title, reciterName, whole]);

  let status = reciterName;
  if (failed) status = 'Could not play. Check your connection.';
  else if (waiting && playing) status = 'Loading…';
  if (job && !job.error) status = `Downloading this surah… ${Math.floor((job.done / job.total) * 100)}%`;
  else if (job && job.error) status = job.error;

  let download = null;
  if (cacheAvailable) {
    if (downloaded) {
      download = (
        <span className="tool audio-saved" title="This surah is downloaded" aria-label="This surah is downloaded">
          <BiCheck aria-hidden="true" />
        </span>
      );
    } else if (job && !job.error) {
      download = (
        <button
          type="button"
          className="tool"
          aria-label="Stop downloading"
          onClick={() => cancelDownload(audioJobKey(reciter, surah))}
        >
          <span className="audio-percent">{`${Math.floor((job.done / job.total) * 100)}%`}</span>
        </button>
      );
    } else {
      download = (
        <button
          type="button"
          className="tool"
          aria-label="Download this surah for offline listening"
          onClick={() => downloadAudio(reciter, surah)}
        >
          <BiDownload aria-hidden="true" />
        </button>
      );
    }
  }

  return (
    <div className="audio-bar" role="region" aria-label="Recitation">
      <div className="audio-info">
        <strong>{title}</strong>
        <span className={failed || (job && job.error) ? 'audio-error' : ''}>{status}</span>
      </div>
      {download}
      <button type="button" className="tool" aria-label="Previous ayah" disabled={whole || ayah <= 1} onClick={() => onStep(-1)}>
        <BiSkipPrevious aria-hidden="true" />
      </button>
      <button
        type="button"
        className="tool play-button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={() => onToggle(!playing)}
      >
        {playing ? <BiPause aria-hidden="true" /> : <BiPlay aria-hidden="true" />}
      </button>
      <button type="button" className="tool" aria-label="Next ayah" disabled={whole || ayah >= total} onClick={() => onStep(1)}>
        <BiSkipNext aria-hidden="true" />
      </button>
      <button type="button" className="tool" aria-label="Stop the recitation" onClick={onStop}>
        <BiX aria-hidden="true" />
      </button>
    </div>
  );
}

AudioBar.propTypes = {
  surah: PropTypes.number.isRequired,
  surahName: PropTypes.string.isRequired,
  ayah: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  playing: PropTypes.bool.isRequired,
  reciter: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  onStep: PropTypes.func.isRequired,
  onEnded: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
};

export default AudioBar;
