import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { BiX, BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { useDispatch, useSelector } from 'react-redux';
import { DEFAULT_TAFSIR, TAFSIRS, loadTafsir } from '../lib/sources';
import { setSetting } from '../redux/settings/settingsSlice';

// The commentary of a chosen mufassir on one ayah.
function TafsirPanel({
  surah, ayah, ayahText, total, onAyah, onClose,
}) {
  const dispatch = useDispatch();
  const saved = useSelector((store) => store.settings.tafsir);
  const tafsirId = TAFSIRS.some((item) => item.id === saved) ? saved : DEFAULT_TAFSIR;
  const [state, setState] = useState({ status: 'loading', paragraphs: [] });
  const [attempt, setAttempt] = useState(0);
  const bodyRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', paragraphs: [] });
    loadTafsir(tafsirId, surah, ayah)
      .then((paragraphs) => {
        if (cancelled) return;
        setState({ status: 'ready', paragraphs });
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', paragraphs: [] });
      });
    return () => { cancelled = true; };
  }, [tafsirId, surah, ayah, attempt]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choose = (event) => {
    dispatch(setSetting('tafsir', Number(event.target.value)));
  };

  return (
    <div className="tafsir-backdrop" role="presentation" onClick={onClose}>
      {/* Clicks inside the panel must not reach the backdrop, which closes it. */}
      {/* eslint-disable-next-line max-len */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="tafsir-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Tafsir of ayah ${ayah}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="tafsir-head">
          <h3>{`Tafsir · Ayah ${ayah}`}</h3>
          <button type="button" className="icon-button" aria-label="Close tafsir" onClick={onClose}>
            <BiX aria-hidden="true" />
          </button>
        </div>
        <div className="tafsir-controls">
          <label htmlFor="tafsir-choice">
            <span className="visually-hidden">Mufassir</span>
            <select id="tafsir-choice" value={tafsirId} onChange={choose}>
              {TAFSIRS.map((item) => (
                <option key={item.id} value={item.id}>{`${item.name} · ${item.english}`}</option>
              ))}
            </select>
          </label>
          <div className="tafsir-steps">
            <button
              type="button"
              className="icon-button"
              aria-label="Next ayah"
              disabled={ayah >= total}
              onClick={() => onAyah(ayah + 1)}
            >
              <BiChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Previous ayah"
              disabled={ayah <= 1}
              onClick={() => onAyah(ayah - 1)}
            >
              <BiChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="tafsir-body" ref={bodyRef} dir="rtl" lang="ar">
          <p className="tafsir-ayah">{ayahText}</p>
          {state.status === 'loading' && (
            <div className="loading"><div className="spinner small" /></div>
          )}
          {state.status === 'error' && (
            <div className="tafsir-note" dir="ltr" lang="en">
              <p>The tafsir could not be loaded. Check your connection.</p>
              <button type="button" className="plain-button" onClick={() => setAttempt(attempt + 1)}>
                Try again
              </button>
            </div>
          )}
          {state.status === 'ready' && state.paragraphs.length === 0 && (
            <p className="tafsir-note" dir="ltr" lang="en">
              This tafsir has no separate commentary on this ayah. Try the ayah
              before it, or another mufassir.
            </p>
          )}
          {state.paragraphs.map((paragraph, index) => (
            // The paragraphs of one commentary never change order.
            // eslint-disable-next-line react/no-array-index-key
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

TafsirPanel.propTypes = {
  surah: PropTypes.number.isRequired,
  ayah: PropTypes.number.isRequired,
  ayahText: PropTypes.string.isRequired,
  total: PropTypes.number.isRequired,
  onAyah: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TafsirPanel;
