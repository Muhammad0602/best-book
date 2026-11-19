import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { BiNote } from 'react-icons/bi';
import { BsBookmarkFill } from 'react-icons/bs';
import { splitWords } from '../lib/geometry';
import { arabicNumber } from '../lib/quran';

// For every word: the highlights that cover it (oldest first).
const coverage = (count, highlights, text) => {
  const covers = new Array(count).fill(null);
  highlights.forEach((highlight) => {
    if (highlight.data.text !== text) return;
    const end = Math.min(highlight.data.end, count - 1);
    for (let i = Math.max(0, highlight.data.start); i <= end; i += 1) {
      covers[i] = covers[i] ? [...covers[i], highlight] : [highlight];
    }
  });
  return covers;
};

const topOf = (cover) => (cover ? cover[cover.length - 1] : null);

function Words({
  words, text, covers, drag,
}) {
  const live = drag && drag.text === text
    ? { from: Math.min(drag.from, drag.to), to: Math.max(drag.from, drag.to) }
    : null;
  const classFor = (index) => {
    if (live && index >= live.from && index <= live.to) return ` hl hl-${drag.color} hl-live`;
    const top = topOf(covers[index]);
    return top ? ` hl hl-${top.data.color}` : '';
  };
  // The gap between two words is coloured when both belong to the same mark.
  const gapClass = (index) => {
    if (live && index >= live.from && index < live.to) return ` hl hl-${drag.color} hl-live`;
    const top = topOf(covers[index]);
    const next = topOf(covers[index + 1]);
    return top && next && top.id === next.id ? ` hl hl-${top.data.color}` : '';
  };

  return words.map((word, index) => {
    const gap = index < words.length - 1 ? gapClass(index) : '';
    return (
      // Words never change order, so the index is a stable key here.
      // eslint-disable-next-line react/no-array-index-key
      <React.Fragment key={index}>
        <span className={`w${classFor(index)}`} data-t={text} data-w={index}>{word}</span>
        {gap ? <span className={`sp${gap}`}> </span> : index < words.length - 1 && ' '}
      </React.Fragment>
    );
  });
}

function Ayah({
  ayah, highlights, drag, showTranslation, playing, bookmarked, noted,
}) {
  const arabic = useMemo(() => splitWords(ayah.text), [ayah.text]);
  const english = useMemo(() => splitWords(ayah.translation), [ayah.translation]);
  const arabicCovers = useMemo(
    () => coverage(arabic.length, highlights, 'ar'),
    [arabic.length, highlights],
  );
  const englishCovers = useMemo(
    () => coverage(english.length, highlights, 'en'),
    [english.length, highlights],
  );

  return (
    <div
      className={`ayah-block${playing ? ' playing' : ''}`}
      data-ayah={ayah.numberInSurah}
      id={`ayah-${ayah.numberInSurah}`}
    >
      <p className="ayah arabic-ayah" dir="rtl" lang="ar">
        <Words words={arabic} text="ar" covers={arabicCovers} drag={drag} />
        {/* A non-breaking space: the ayah sign never starts a line on its own. */}
        {'\u00A0'}
        {/* The font draws the number in Arabic digits as the end-of-ayah sign. */}
        <span
          className="ayah-ending"
          role="button"
          tabIndex={0}
          data-menu
          aria-label={`Ayah ${ayah.numberInSurah}: play, tafsir, bookmark, note, copy`}
        >
          {arabicNumber(ayah.numberInSurah)}
        </span>
        {(bookmarked || noted) && (
          <span className="ayah-flags" data-menu aria-hidden="true">
            {bookmarked && <BsBookmarkFill />}
            {noted && <BiNote />}
          </span>
        )}
        {' '}
      </p>
      {showTranslation && english.length > 0 && (
        <p className="ayah english-ayah" dir="ltr" lang="en">
          <Words words={english} text="en" covers={englishCovers} drag={drag} />
        </p>
      )}
    </div>
  );
}

Ayah.propTypes = {
  ayah: PropTypes.shape({
    numberInSurah: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
    translation: PropTypes.string,
  }).isRequired,
  highlights: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  showTranslation: PropTypes.bool,
  playing: PropTypes.bool,
  bookmarked: PropTypes.bool,
  noted: PropTypes.bool,
  drag: PropTypes.shape({
    text: PropTypes.string,
    from: PropTypes.number,
    to: PropTypes.number,
    color: PropTypes.string,
  }),
};

Ayah.defaultProps = {
  drag: null, showTranslation: false, playing: false, bookmarked: false, noted: false,
};

export default React.memo(Ayah);
