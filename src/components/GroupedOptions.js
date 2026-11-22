import React from 'react';
import PropTypes from 'prop-types';
import { LANGUAGES } from '../lib/sources';

// The options of a <select>, grouped by language.
function GroupedOptions({ items, label }) {
  return LANGUAGES.map((language) => {
    const group = items.filter((item) => item.lang === language.id);
    if (group.length === 0) return null;
    return (
      <optgroup key={language.id} label={language.label}>
        {group.map((item) => (
          <option key={item.id} value={item.id}>{label(item)}</option>
        ))}
      </optgroup>
    );
  });
}

GroupedOptions.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    lang: PropTypes.string.isRequired,
  })).isRequired,
  label: PropTypes.func.isRequired,
};

export const translationLabel = (item) => `${item.name} · ${item.author}`;
export const tafsirLabel = (item) => `${item.name} · ${item.english}`;

export default GroupedOptions;
