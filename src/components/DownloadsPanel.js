import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { BiCheck } from 'react-icons/bi';
import { reciterOf } from '../redux/settings/settingsSlice';
import { LANGUAGES, TAFSIRS, TRANSLATIONS } from '../lib/sources';
import { SURAHS } from '../lib/quran';
import { cacheAvailable, isAudioDownloaded, useDownloads } from '../lib/offline';
import {
  audioJobKey, cancelDownload, deleteAudio, deleteTafsir, deleteTranslation, downloadAudio,
  downloadTafsir, downloadTranslation, tafsirJobKey, translationJobKey,
} from '../lib/downloads';
import { tafsirLabel, translationLabel } from './GroupedOptions';
import Panel from './Panel';

// Rough sizes, measured from Surah al-Baqarah, so the reader knows what to expect.
const TAFSIR_SIZE = new Map([
  [14, 70], [15, 80], [90, 70], [94, 45], [91, 6], [93, 22], [16, 2],
  [9001, 2], [169, 28], [168, 20], [9002, 2], [9003, 1], [170, 12],
]);

const percent = (job) => Math.floor((job.done / Math.max(1, job.total)) * 100);

// One thing that can be downloaded: its name, and a button for what comes next.
function Row({
  label, hint, lang, done, job, onDownload, onCancel, onDelete,
}) {
  let action;
  if (job && !job.error) {
    action = (
      <button type="button" className="plain-button secondary small" onClick={onCancel}>
        {`Stop · ${percent(job)}%`}
      </button>
    );
  } else if (done) {
    action = (
      <button type="button" className="plain-button secondary small" onClick={onDelete}>
        Delete
      </button>
    );
  } else {
    action = (
      <button type="button" className="plain-button small" onClick={onDownload}>
        {job && job.error ? 'Try again' : 'Download'}
      </button>
    );
  }
  return (
    <li className="download-row">
      <div className="download-name">
        <span lang={lang}>
          {done && <BiCheck className="download-done" aria-label="Downloaded" />}
          {label}
        </span>
        {job && !job.error && (
          <span className="download-bar" aria-hidden="true">
            <span style={{ width: `${percent(job)}%` }} />
          </span>
        )}
        {job && job.error && <small className="download-error">{job.error}</small>}
        {!job && hint && <small>{hint}</small>}
      </div>
      {action}
    </li>
  );
}

Row.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  lang: PropTypes.string,
  done: PropTypes.bool.isRequired,
  job: PropTypes.shape({
    done: PropTypes.number, total: PropTypes.number, error: PropTypes.string,
  }),
  onDownload: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

Row.defaultProps = { hint: '', lang: undefined, job: null };

const byLanguage = (items) => LANGUAGES
  .map((language) => ({ language, items: items.filter((item) => item.lang === language.id) }))
  .filter((group) => group.items.length > 0);

function DownloadsPanel({ onClose }) {
  const { record, jobs } = useDownloads();
  const reciterId = useSelector((store) => store.settings.reciter);
  const reciter = reciterOf(reciterId);
  const { pathname } = useLocation();
  const match = pathname.match(/^\/details\/(\d+)/);
  const surah = match ? Number(match[1]) : null;
  const surahInfo = surah && SURAHS[surah - 1];
  const savedSurahs = Object.keys(record.audio[reciterId] || {}).length;
  const [usage, setUsage] = useState(null);

  // How much the app keeps on this device.
  useEffect(() => {
    if (!navigator.storage || !navigator.storage.estimate) return;
    navigator.storage.estimate()
      .then(({ usage: used }) => setUsage(used))
      .catch(() => {});
  }, [record]);

  if (!cacheAvailable) {
    return (
      <Panel title="Downloads" onClose={onClose} className="settings-panel">
        <div className="panel-body settings-body">
          <p className="setting-hint">This browser cannot keep downloads. Try the installed app or another browser.</p>
        </div>
      </Panel>
    );
  }

  const removeAll = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm(`Delete every downloaded surah of ${reciter.name}?`)) deleteAudio(reciterId);
  };

  return (
    <Panel title="Downloads" onClose={onClose} className="settings-panel">
      <div className="panel-body settings-body">
        <p className="setting-hint first">
          Download once, then listen and read without internet. Only what you
          choose is downloaded.
        </p>

        <section>
          <h4>{`Recitation · ${reciter.name}`}</h4>
          <ul className="download-list">
            {surahInfo && (
              <Row
                label={`This surah: ${surahInfo.englishName}`}
                done={isAudioDownloaded(record, reciterId, surah)}
                job={jobs[audioJobKey(reciterId, surah)]}
                onDownload={() => downloadAudio(reciterId, surah)}
                onCancel={() => cancelDownload(audioJobKey(reciterId, surah))}
                onDelete={() => deleteAudio(reciterId, surah)}
              />
            )}
            <Row
              label={`All 114 surahs${savedSurahs ? ` (${savedSurahs} downloaded)` : ''}`}
              hint="Very large: about 1 GB or more. Use Wi-Fi."
              done={savedSurahs === SURAHS.length}
              job={jobs[audioJobKey(reciterId)]}
              onDownload={() => downloadAudio(reciterId)}
              onCancel={() => cancelDownload(audioJobKey(reciterId))}
              onDelete={removeAll}
            />
          </ul>
          {savedSurahs > 0 && savedSurahs < SURAHS.length && (
            <button type="button" className="link-button" onClick={removeAll}>
              {`Delete the ${savedSurahs} downloaded surah${savedSurahs === 1 ? '' : 's'}`}
            </button>
          )}
          <p className="setting-hint">
            Choose another reciter in Settings to download their recitation.
            You can also download a surah with the ↓ button while it plays.
          </p>
        </section>

        <section>
          <h4>Translations</h4>
          {byLanguage(TRANSLATIONS).map(({ language, items }) => (
            <ul className="download-list" key={language.id} aria-label={language.label}>
              {items.map((item) => (
                <Row
                  key={item.id}
                  label={translationLabel(item)}
                  lang={item.lang}
                  hint="About 1–2 MB"
                  done={Boolean(record.translation[item.id])}
                  job={jobs[translationJobKey(item.id)]}
                  onDownload={() => downloadTranslation(item.id)}
                  onCancel={() => cancelDownload(translationJobKey(item.id))}
                  onDelete={() => deleteTranslation(item.id)}
                />
              ))}
            </ul>
          ))}
        </section>

        <section>
          <h4>Tafsir</h4>
          {byLanguage(TAFSIRS).map(({ language, items }) => (
            <ul className="download-list" key={language.id} aria-label={language.label}>
              {items.map((item) => (
                <Row
                  key={item.id}
                  label={tafsirLabel(item)}
                  lang={item.lang}
                  hint={`About ${TAFSIR_SIZE.get(item.id) || 10} MB`}
                  done={Boolean(record.tafsir[item.id])}
                  job={jobs[tafsirJobKey(item.id)]}
                  onDownload={() => downloadTafsir(item.id)}
                  onCancel={() => cancelDownload(tafsirJobKey(item.id))}
                  onDelete={() => deleteTafsir(item.id)}
                />
              ))}
            </ul>
          ))}
        </section>

        {usage !== null && (
          <p className="setting-hint">
            {`The app uses about ${Math.max(1, Math.round(usage / 1048576))} MB on this device.`}
          </p>
        )}
      </div>
    </Panel>
  );
}

DownloadsPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default DownloadsPanel;
