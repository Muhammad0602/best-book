import React from 'react';
import PropTypes from 'prop-types';
import { BiTrash, BiX } from 'react-icons/bi';
import { splitWords } from '../lib/geometry';
import { HIGHLIGHT_COLORS } from './Toolbar';
import { FIRST_TRANSLATION } from '../lib/sources';

const textOf = (ayah, kind) => (kind === 'ar' ? ayah?.text : ayah?.translation);

// The translation a mark was made on, or null for marks on the Arabic.
const translationOf = ({ type, data }) => {
  if (type === 'highlight') return data.text === 'en' ? data.edition : null;
  return data.anchor?.text === 'en' ? data.edition || FIRST_TRANSLATION : null;
};

export const describe = (annotation, ayah, edition) => {
  const madeOn = translationOf(annotation);
  if (madeOn && edition && madeOn !== edition) {
    return annotation.type === 'highlight'
      ? 'Highlight on another translation'
      : 'Drawing on another translation';
  }
  if (annotation.type === 'highlight') {
    const { text, start, end } = annotation.data;
    return splitWords(textOf(ayah, text)).slice(start, end + 1).join(' ');
  }
  const { anchor } = annotation.data;
  const word = splitWords(textOf(ayah, anchor.text))[anchor.word];
  return word ? `Drawing near “${word}”` : 'Drawing';
};

const annotationShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  ayah: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
});

// Shown after tapping highlighted words: one row per highlight under the
// finger, so overlapping highlights can be removed one at a time.
export function HighlightSheet({
  highlights, ayah, onRemove, onColor, onClose,
}) {
  return (
    <div className="sheet" role="dialog" aria-label="Highlight options">
      <div className="sheet-head">
        <h3>{highlights.length > 1 ? 'Highlights here' : 'Highlight'}</h3>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          <BiX aria-hidden="true" />
        </button>
      </div>
      {highlights.map((highlight) => (
        <div className="sheet-item" key={highlight.id}>
          <p
            className={`sheet-text hl hl-${highlight.data.color}`}
            dir={highlight.data.text === 'ar' ? 'rtl' : 'ltr'}
          >
            {describe(highlight, ayah)}
          </p>
          <div className="sheet-actions">
            {HIGHLIGHT_COLORS.map((name) => (
              <button
                key={name}
                type="button"
                className={`swatch hl-${name}${highlight.data.color === name ? ' on' : ''}`}
                aria-label={`Change to ${name}`}
                onClick={() => onColor(highlight, name)}
              />
            ))}
            <span className="spacer" />
            <button type="button" className="tool danger wide" onClick={() => onRemove(highlight)}>
              <BiTrash aria-hidden="true" />
              <span>Remove highlight</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

HighlightSheet.propTypes = {
  highlights: PropTypes.arrayOf(annotationShape).isRequired,
  ayah: PropTypes.shape({}),
  onRemove: PropTypes.func.isRequired,
  onColor: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

HighlightSheet.defaultProps = { ayah: null };

// Every mark in the current surah, with "go to" and "delete".
export function MarksSheet({
  annotations, ayahs, edition, onGo, onRemove, onClose,
}) {
  return (
    <div className="sheet sheet-tall" role="dialog" aria-label="Marks in this surah">
      <div className="sheet-head">
        <h3>Marks in this surah</h3>
        <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          <BiX aria-hidden="true" />
        </button>
      </div>
      {annotations.length === 0 && (
        <p className="sheet-empty">
          Nothing marked here yet. Choose Highlight or Draw below to start.
        </p>
      )}
      {annotations.map((annotation) => (
        <div className="sheet-item sheet-row" key={annotation.id}>
          <button type="button" className="sheet-go" onClick={() => onGo(annotation)}>
            <span className="sheet-ayah">{`Ayah ${annotation.ayah}`}</span>
            <span
              className={`sheet-text${annotation.type === 'highlight' ? ` hl hl-${annotation.data.color}` : ''}`}
              dir="auto"
            >
              {describe(annotation, ayahs[annotation.ayah - 1], edition)}
            </span>
          </button>
          <button
            type="button"
            className="icon-button danger"
            aria-label={`Delete this ${annotation.type}`}
            onClick={() => onRemove(annotation)}
          >
            <BiTrash aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

MarksSheet.propTypes = {
  annotations: PropTypes.arrayOf(annotationShape).isRequired,
  ayahs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  edition: PropTypes.string.isRequired,
  onGo: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
