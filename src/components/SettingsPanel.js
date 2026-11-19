import React from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  RECITERS, SCALES, setSetting,
} from '../redux/settings/settingsSlice';
import { TAFSIRS, TRANSLATIONS } from '../lib/sources';
import Panel from './Panel';

const THEMES = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Night' },
];

const TURNS = [
  { id: 'mushaf', label: 'Like a mushaf', hint: 'Swipe right for the next page' },
  { id: 'book', label: 'Like a book', hint: 'Swipe left for the next page' },
];

function Choice({
  options, value, onChange, label,
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          className={value === option.id ? 'on' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

Choice.propTypes = {
  options: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
};

function SettingsPanel({ onClose }) {
  const dispatch = useDispatch();
  const settings = useSelector((store) => store.settings);
  const user = useSelector((store) => store.auth.user);
  const set = (key) => (value) => dispatch(setSetting(key, value));
  const scaleIndex = Math.max(0, SCALES.indexOf(settings.scale));
  const turn = TURNS.find((item) => item.id === settings.pageTurn) || TURNS[0];

  return (
    <Panel title="Settings" onClose={onClose} className="settings-panel">
      <div className="panel-body settings-body">
        <section>
          <h4>Appearance</h4>
          <Choice options={THEMES} value={settings.theme} onChange={set('theme')} label="Appearance" />
        </section>

        <section>
          <h4>Text size</h4>
          <div className="size-row">
            <button
              type="button"
              className="round-button"
              aria-label="Smaller text"
              disabled={scaleIndex === 0}
              onClick={() => set('scale')(SCALES[scaleIndex - 1])}
            >
              A−
            </button>
            <p className="size-preview" lang="ar" dir="rtl" style={{ '--scale': settings.scale }}>
              بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
            </p>
            <button
              type="button"
              className="round-button bigger"
              aria-label="Larger text"
              disabled={scaleIndex === SCALES.length - 1}
              onClick={() => set('scale')(SCALES[scaleIndex + 1])}
            >
              A+
            </button>
          </div>
        </section>

        <section>
          <h4>Translation</h4>
          <label className="switch-row" htmlFor="setting-show-translation">
            <span>Show the translation under each ayah</span>
            <input
              id="setting-show-translation"
              type="checkbox"
              className="switch"
              checked={settings.showTranslation}
              onChange={(event) => set('showTranslation')(event.target.checked)}
            />
          </label>
          <label className="select-row" htmlFor="setting-translation">
            <span className="visually-hidden">Translation</span>
            <select
              id="setting-translation"
              value={settings.translation}
              onChange={(event) => set('translation')(event.target.value)}
            >
              {TRANSLATIONS.map((item) => (
                <option key={item.id} value={item.id}>{`${item.name} · ${item.author}`}</option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <h4>Tafsir</h4>
          <label className="select-row" htmlFor="setting-tafsir">
            <span className="visually-hidden">Tafsir</span>
            <select
              id="setting-tafsir"
              value={settings.tafsir}
              onChange={(event) => set('tafsir')(Number(event.target.value))}
            >
              <optgroup label="Arabic">
                {TAFSIRS.filter((item) => item.lang === 'ar').map((item) => (
                  <option key={item.id} value={item.id}>{`${item.name} · ${item.english}`}</option>
                ))}
              </optgroup>
              <optgroup label="English">
                {TAFSIRS.filter((item) => item.lang === 'en').map((item) => (
                  <option key={item.id} value={item.id}>{`${item.name} · ${item.english}`}</option>
                ))}
              </optgroup>
            </select>
          </label>
        </section>

        <section>
          <h4>Reciter</h4>
          <label className="select-row" htmlFor="setting-reciter">
            <span className="visually-hidden">Reciter</span>
            <select
              id="setting-reciter"
              value={settings.reciter}
              onChange={(event) => set('reciter')(event.target.value)}
            >
              {RECITERS.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <h4>Turning pages</h4>
          <Choice options={TURNS} value={settings.pageTurn} onChange={set('pageTurn')} label="Turning pages" />
          <p className="setting-hint">{`${turn.hint}, or use the buttons under the page.`}</p>
        </section>

        <p className="setting-hint">
          {user
            ? 'Your settings are saved in your account and follow you to your other devices.'
            : 'Your settings are saved on this device. Sign in to use them on your other devices too.'}
        </p>
      </div>
    </Panel>
  );
}

SettingsPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default SettingsPanel;
