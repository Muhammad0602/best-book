import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';
import { getEnglish } from '../redux/english/englishSlice';
import { setSearch } from '../redux/chapters/chaptersSlice';

const HIGHLIGHTS_STORAGE_KEY = 'best-book-highlights';

const readHighlights = () => {
  try {
    return JSON.parse(window.localStorage.getItem(HIGHLIGHTS_STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const mergeRanges = (ranges) => ranges
  .sort((a, b) => a.start - b.start)
  .reduce((merged, range) => {
    const previous = merged[merged.length - 1];
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
    return merged;
  }, []);

const highlightedText = (text, ranges) => {
  if (!ranges?.length) return text;
  const pieces = [];
  let cursor = 0;
  ranges.forEach(({ start, end }) => {
    if (start > cursor) pieces.push(text.slice(cursor, start));
    pieces.push(<mark key={`${start}-${end}`}>{text.slice(start, end)}</mark>);
    cursor = end;
  });
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return pieces;
};

function Details() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { number } = useParams();
  const id = parseInt(number, 10);
  const { chapters, search } = useSelector((store) => store.chapters);
  const { english } = useSelector((store) => store.english);
  const surah = chapters.length > 1 ? chapters[id - 1] : chapters;
  const surahEng = english && english[id - 1];
  const [highlights, setHighlights] = useState(readHighlights);
  const [selection, setSelection] = useState(null);

  const saveHighlights = (nextHighlights) => {
    setHighlights(nextHighlights);
    window.localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(nextHighlights));
  };

  const captureSelection = () => {
    const browserSelection = window.getSelection();
    if (!browserSelection || browserSelection.isCollapsed || !browserSelection.rangeCount) return;

    const range = browserSelection.getRangeAt(0);
    const getHighlightElement = (node) => (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)
      ?.closest('[data-highlight-id]');
    const startElement = getHighlightElement(range.startContainer);
    const endElement = getHighlightElement(range.endContainer);
    if (!startElement || startElement !== endElement) return;

    const text = startElement.textContent;
    const beforeStart = range.cloneRange();
    beforeStart.selectNodeContents(startElement);
    beforeStart.setEnd(range.startContainer, range.startOffset);
    const start = beforeStart.toString().length;
    const end = start + range.toString().length;
    if (start !== end && end <= text.length) {
      setSelection({ id: startElement.dataset.highlightId, start, end });
    }
  };

  const addHighlight = () => {
    if (!selection) return;
    const current = highlights[selection.id] || [];
    saveHighlights({
      ...highlights,
      [selection.id]: mergeRanges([...current, { start: selection.start, end: selection.end }]),
    });
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  const removeHighlights = (highlightIds) => {
    const nextHighlights = { ...highlights };
    highlightIds.forEach((highlightId) => delete nextHighlights[highlightId]);
    saveHighlights(nextHighlights);
    setSelection(null);
  };

  useEffect(() => {
    dispatch(setSearch(''));
  }, [dispatch, search]);

  useEffect(() => {
    dispatch(getEnglish());
  }, [dispatch]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="details">
      <button onClick={() => navigate('/')} type="button">
        <BiArrowBack aria-hidden="true" />
        <span className="visually-hidden">Go back to the home page</span>
      </button>
      <h2>
        {surah.name}
        {' '}
        <span>
          (
          {surah.englishNameTranslation}
          )
        </span>
      </h2>
      {selection && (
        <button className="highlight-selection" type="button" onClick={addHighlight}>
          Highlight selected text
        </button>
      )}
      <article className="ayahs">
        {surah.ayahs?.map((ayah, index) => (
          <div key={ayah.number}>
            <p className="ayah">
              <span
                data-highlight-id={`${id}-${ayah.numberInSurah}-arabic`}
                onMouseUp={captureSelection}
                onKeyUp={captureSelection}
              >
                {highlightedText(ayah.text, highlights[`${id}-${ayah.numberInSurah}-arabic`])}
              </span>
              {' '}
              <span className="ayah-ending">{ayah.numberInSurah}</span>
            </p>
            <p className="ayah english-ayah">
              <span
                data-highlight-id={`${id}-${ayah.numberInSurah}-english`}
                onMouseUp={captureSelection}
                onKeyUp={captureSelection}
              >
                {highlightedText(
                  surahEng?.ayahs[index]?.text || '',
                  highlights[`${id}-${ayah.numberInSurah}-english`],
                )}
              </span>
            </p>
            {(highlights[`${id}-${ayah.numberInSurah}-arabic`]
              || highlights[`${id}-${ayah.numberInSurah}-english`]) && (
              <button
                className="remove-highlight"
                type="button"
                onClick={() => {
                  removeHighlights([
                    `${id}-${ayah.numberInSurah}-arabic`,
                    `${id}-${ayah.numberInSurah}-english`,
                  ]);
                }}
              >
                Remove highlights
              </button>
            )}
          </div>

        ))}
      </article>
    </div>
  );
}

export default Details;
