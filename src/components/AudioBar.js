import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  BiPause, BiPlay, BiSkipNext, BiSkipPrevious, BiX,
} from 'react-icons/bi';
import { reciterOf } from '../redux/settings/settingsSlice';
import { globalAyah } from '../lib/quran';

const AUDIO = 'https://cdn.islamic.network/quran/audio/128';

export const audioUrl = (reciter, surah, ayah) => {
  const { surahAudio } = reciterOf(reciter);
  if (surahAudio) return `${surahAudio}${String(surah).padStart(3, '0')}.mp3`;
  return `${AUDIO}/${reciter}/${globalAyah(surah, ayah)}.mp3`;
};

// Recitation, one ayah after another. The reader component decides which ayah
// plays; this bar plays it and reports when it has ended. A reciter with only
// whole-surah recordings plays the surah as one file.
function AudioBar({
  surah, surahName, ayah, total, playing, reciter, onToggle, onStep, onEnded, onStop,
}) {
  const audioRef = useRef(null);
  const nextRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const { name: reciterName, surahAudio } = reciterOf(reciter);
  const whole = Boolean(surahAudio);
  const title = whole ? `${surahName} · Whole surah` : `${surahName} · Ayah ${ayah}`;
  const callbacks = useRef({});
  callbacks.current = {
    onToggle, onStep, onEnded, onStop,
  };

  // One audio element for the whole session with the reader.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    audio.addEventListener('ended', () => callbacks.current.onEnded());
    audio.addEventListener('waiting', () => setWaiting(true));
    audio.addEventListener('playing', () => { setWaiting(false); setFailed(false); });
    audio.addEventListener('error', () => { setWaiting(false); setFailed(true); });
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const src = audioUrl(reciter, surah, ayah);
    if (audio.src === src) return; // the same whole-surah file
    audio.src = src;
    setFailed(false);
    if (playing) audio.play().catch(() => {});
    // Load the next ayah in the background, so there is no gap.
    if (!whole && ayah < total) {
      const next = new Audio();
      next.preload = 'auto';
      next.src = audioUrl(reciter, surah, ayah + 1);
      nextRef.current = next;
    }
    // `playing` is handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah, ayah, reciter, total]);

  useEffect(() => {
    const audio = audioRef.current;
    if (playing) audio.play().catch(() => {});
    else audio.pause();
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

  return (
    <div className="audio-bar" role="region" aria-label="Recitation">
      <div className="audio-info">
        <strong>{title}</strong>
        <span className={failed ? 'audio-error' : ''}>{status}</span>
      </div>
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
