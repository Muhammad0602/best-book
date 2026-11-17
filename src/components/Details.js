import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import {
  getChapters, getSurah, TRANSLATION_EDITION, ARABIC_EDITION,
} from '../redux/chapters/chaptersSlice';
import { changeApplied, historyCleared, migrated } from '../redux/annotations/annotationsSlice';
import { isLegacy, migrate } from '../lib/legacy';
import fatiha from '../data/quran/1.json';
import { newId } from '../lib/geometry';
import { readPref, writePref } from '../lib/prefs';
import Ayah from './Ayah';
import DrawingLayer from './DrawingLayer';
import Toolbar, { HIGHLIGHT_COLORS, PEN_COLORS, PEN_WIDTHS } from './Toolbar';
import { HighlightSheet, MarksSheet } from './Sheets';

const NONE = [];
const [BISMILLAH] = fatiha;
const SCALES = [0.85, 1, 1.15, 1.3, 1.5];
const DEFAULT_SCALE = 1;
const BAR_HEIGHT = 76; // the top bar, plus a little air
const TRANSLATION_KEY = 'bestbook.showTranslation';

// The translation is hidden until the reader switches it on; the choice is
// remembered on this device.
const readShowTranslation = () => {
  try {
    return window.localStorage.getItem(TRANSLATION_KEY) === '1';
  } catch (error) {
    return false;
  }
};

// The word under a screen position, if any.
const wordAt = (x, y) => {
  const element = document.elementFromPoint(x, y);
  const word = element && element.closest ? element.closest('.w') : null;
  const block = word ? word.closest('[data-ayah]') : null;
  if (!block) return null;
  return {
    ayah: Number(block.dataset.ayah),
    text: word.dataset.t,
    word: Number(word.dataset.w),
  };
};

function Details() {
  const dispatch = useDispatch();
  const { number } = useParams();
  const [params] = useSearchParams();
  const resumeAyah = Number(params.get('ayah')) || 0;
  const id = parseInt(number, 10);
  const {
    chapters, surahs, surahLoading, surahError,
  } = useSelector((store) => store.chapters);
  const items = useSelector((store) => store.annotations.items);
  const surah = surahs[id];
  const info = chapters[id - 1] || surah;

  const articleRef = useRef(null);
  const dragRef = useRef(null);
  const [mode, setMode] = useState('read');
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [tool, setTool] = useState('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1]);
  const [selectedId, setSelectedId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [sheet, setSheet] = useState(null); // { ayah, text, word } | 'list'
  const [showTranslation, setShowTranslation] = useState(readShowTranslation);
  const [scaleIndex, setScaleIndex] = useState(() => {
    const saved = readPref('textScale', DEFAULT_SCALE);
    return SCALES.includes(saved) ? SCALES.indexOf(saved) : DEFAULT_SCALE;
  });
  const loaded = Boolean(surah);

  const changeScale = (step) => {
    const next = Math.min(SCALES.length - 1, Math.max(0, scaleIndex + step));
    setScaleIndex(next);
    writePref('textScale', SCALES[next]);
  };

  // "Continue reading": open at the ayah where the reader stopped.
  useEffect(() => {
    if (!loaded || resumeAyah < 2) return undefined;
    let cancelled = false;
    const go = () => {
      const element = cancelled ? null : document.getElementById(`ayah-${resumeAyah}`);
      if (!element) return;
      window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - BAR_HEIGHT);
    };
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fonts.then(() => setTimeout(go, 50));
    return () => { cancelled = true; };
  }, [loaded, resumeAyah, id]);

  // Remember the place: the first ayah that is visible below the top bar.
  useEffect(() => {
    if (!loaded) return undefined;
    let timer = null;
    const save = () => {
      timer = null;
      const blocks = articleRef.current ? articleRef.current.querySelectorAll('[data-ayah]') : [];
      let ayah = 1;
      for (let i = 0; i < blocks.length; i += 1) {
        if (blocks[i].getBoundingClientRect().bottom > BAR_HEIGHT) {
          ayah = Number(blocks[i].dataset.ayah);
          break;
        }
      }
      writePref('lastRead', { surah: id, ayah });
    };
    const onScroll = () => { if (!timer) timer = setTimeout(save, 400); };
    const last = readPref('lastRead', null);
    if (!last || last.surah !== id) writePref('lastRead', { surah: id, ayah: 1 });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [loaded, id]);

  const toggleTranslation = () => {
    const next = !showTranslation;
    setShowTranslation(next);
    if (next && surah && !surah.translationLoaded) dispatch(getSurah(id));
    try {
      window.localStorage.setItem(TRANSLATION_KEY, next ? '1' : '0');
    } catch (error) {
      // The choice still applies until the app is closed.
    }
  };

  useEffect(() => {
    dispatch(getChapters());
    dispatch(getSurah(id));
    dispatch(historyCleared());
    window.scrollTo(0, 0);
  }, [dispatch, id]);

  // This surah's marks, oldest first.
  const annotations = useMemo(
    () => Object.values(items)
      .filter((annotation) => annotation.surah === id)
      .sort((a, b) => a.ayah - b.ayah || a.createdAt.localeCompare(b.createdAt)),
    [items, id],
  );
  const drawings = useMemo(
    () => annotations.filter((annotation) => annotation.type === 'drawing'),
    [annotations],
  );

  // Marks made on the earlier edition of the Arabic text are moved onto the
  // same words of the current one.
  useEffect(() => {
    const legacy = annotations.filter(isLegacy);
    if (legacy.length === 0) return undefined;
    let cancelled = false;
    import('../data/legacy-uthmani.json').then((module) => {
      if (!cancelled) dispatch(migrated(legacy.map((item) => migrate(item, module.default))));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [annotations, dispatch]);
  const highlightsByAyah = useMemo(() => {
    const map = {};
    annotations.forEach((annotation) => {
      if (annotation.type !== 'highlight') return;
      if (!map[annotation.ayah]) map[annotation.ayah] = [];
      map[annotation.ayah].push(annotation);
    });
    return map;
  }, [annotations]);

  const covering = useCallback((spot) => (highlightsByAyah[spot.ayah] || NONE).filter(
    ({ data }) => data.text === spot.text && data.start <= spot.word && data.end >= spot.word,
  ), [highlightsByAyah]);

  const sheetHighlights = sheet && sheet !== 'list' ? covering(sheet) : NONE;
  const selected = drawings.find((drawing) => drawing.id === selectedId) || null;

  useEffect(() => {
    if (sheet && sheet !== 'list' && sheetHighlights.length === 0) setSheet(null);
  }, [sheet, sheetHighlights.length]);

  const changeMode = (next) => {
    setMode(next);
    setSelectedId(null);
    setSheet(null);
    setDrag(null);
    dragRef.current = null;
  };

  const remove = (annotation) => dispatch(changeApplied({ removed: [annotation] }));

  const recolor = (highlight, color) => {
    if (highlight.data.color === color) return;
    dispatch(changeApplied({
      removed: [highlight],
      added: [{
        ...highlight,
        data: { ...highlight.data, color },
        updatedAt: new Date().toISOString(),
      }],
    }));
  };

  const addHighlight = ({
    ayah, text, from, to,
  }) => {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const same = (highlightsByAyah[ayah] || NONE).find(
      ({ data }) => data.text === text && data.start === start && data.end === end,
    );
    if (same) {
      recolor(same, highlightColor);
      return;
    }
    const now = new Date().toISOString();
    dispatch(changeApplied({
      added: [{
        id: newId(),
        surah: id,
        ayah,
        type: 'highlight',
        data: {
          text,
          edition: text === 'ar' ? ARABIC_EDITION : TRANSLATION_EDITION,
          start,
          end,
          color: highlightColor,
        },
        createdAt: now,
        updatedAt: now,
      }],
    }));
  };

  // Highlight mode: tap a word, or drag from the first word to the last.
  const onPointerDown = (event) => {
    if (mode !== 'highlight' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const spot = wordAt(event.clientX, event.clientY);
    if (!spot) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (error) {
      // Not essential: the drag still works while the pointer stays on the text.
    }
    dragRef.current = {
      ...spot, from: spot.word, to: spot.word, moved: false, pointerId: event.pointerId,
    };
    setDrag({ ...dragRef.current, color: highlightColor });
  };

  const onPointerMove = (event) => {
    const { current } = dragRef;
    if (!current || current.pointerId !== event.pointerId) return;
    const spot = wordAt(event.clientX, event.clientY);
    if (!spot || spot.ayah !== current.ayah || spot.text !== current.text) return;
    if (spot.word === current.to) return;
    current.to = spot.word;
    current.moved = true;
    setDrag({ ...current, color: highlightColor });
  };

  const onPointerUp = (event) => {
    const { current } = dragRef;
    if (!current || current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    if (!current.moved && covering(current).length > 0) {
      setSheet({ ayah: current.ayah, text: current.text, word: current.word });
    } else {
      addHighlight(current);
    }
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setDrag(null);
  };

  // Read mode: tapping highlighted words opens the "remove" sheet.
  const onClick = (event) => {
    if (mode !== 'read') return;
    const word = event.target.closest ? event.target.closest('.w.hl') : null;
    const block = word ? word.closest('[data-ayah]') : null;
    const selection = window.getSelection ? window.getSelection() : null;
    if (!block || (selection && !selection.isCollapsed)) return;
    setSheet({
      ayah: Number(block.dataset.ayah),
      text: word.dataset.t,
      word: Number(word.dataset.w),
    });
  };

  const goTo = (annotation) => {
    setSheet(null);
    const element = document.getElementById(`ayah-${annotation.ayah}`);
    if (!element) return;
    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element.classList.add('flash');
    setTimeout(() => element.classList.remove('flash'), 1600);
  };

  return (
    <div className="details">
      {info && (
        <div className="surah-head">
          <h2 className="surah-title" lang="ar" dir="rtl">{info.name}</h2>
          <p className="surah-sub">
            {`${info.number}. ${info.englishName} · ${info.englishNameTranslation}`}
          </p>
          <p className="surah-meta">{`${info.numberOfAyahs} ayahs · ${info.revelationType}`}</p>
          {surah && (
            <div className="text-size" role="group" aria-label="Text size">
              <button
                type="button"
                aria-label="Smaller text"
                disabled={scaleIndex === 0}
                onClick={() => changeScale(-1)}
              >
                A−
              </button>
              <button
                type="button"
                className="bigger"
                aria-label="Larger text"
                disabled={scaleIndex === SCALES.length - 1}
                onClick={() => changeScale(1)}
              >
                A+
              </button>
            </div>
          )}
        </div>
      )}

      {!surah && surahLoading && (
        <div className="loading"><div className="spinner" /></div>
      )}
      {!surah && !surahLoading && surahError && (
        <div className="error-container">
          <h2>This surah could not be loaded.</h2>
          <p>{surahError}</p>
          <button type="button" className="plain-button" onClick={() => dispatch(getSurah(id))}>
            Try again
          </button>
        </div>
      )}

      {surah && (
        // The handlers below only pick up taps on words; every action is
        // also reachable through the buttons of the "Marks" list.
        // eslint-disable-next-line max-len
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
        <article
          ref={articleRef}
          className={`ayahs mode-${mode}${showTranslation ? '' : ' flow'}`}
          style={{ '--scale': SCALES[scaleIndex] }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onClick}
        >
          {id !== 1 && id !== 9 && (
            <p className="bismillah" dir="rtl" lang="ar">{BISMILLAH}</p>
          )}
          {showTranslation && !surah.translationLoaded && (
            <p className="reader-note" dir="ltr">
              The translation could not be loaded. Check your connection and
              tap Translation again.
            </p>
          )}
          {surah.ayahs.map((ayah) => (
            <Ayah
              key={ayah.numberInSurah}
              ayah={ayah}
              highlights={highlightsByAyah[ayah.numberInSurah] || NONE}
              drag={drag && drag.ayah === ayah.numberInSurah ? drag : null}
              showTranslation={showTranslation}
            />
          ))}
          <DrawingLayer
            articleRef={articleRef}
            surah={id}
            drawings={drawings}
            active={mode === 'draw'}
            tool={tool}
            color={penColor}
            width={penWidth}
            selectedId={selectedId}
            onSelect={setSelectedId}
            layoutKey={`${showTranslation ? 'blocks' : 'flow'}-${scaleIndex}`}
          />
        </article>
      )}

      {surah && (
        <nav className="surah-nav" aria-label="Previous and next surah">
          {id > 1 ? (
            <Link to={`/Details/${id - 1}`} className="nav-link">
              <BiChevronLeft aria-hidden="true" />
              <span>{chapters[id - 2].englishName}</span>
            </Link>
          ) : <span />}
          {id < chapters.length ? (
            <Link to={`/Details/${id + 1}`} className="nav-link">
              <span>{chapters[id].englishName}</span>
              <BiChevronRight aria-hidden="true" />
            </Link>
          ) : <span />}
        </nav>
      )}

      {surah && sheet === 'list' && (
        <MarksSheet
          annotations={annotations}
          ayahs={surah.ayahs}
          onGo={goTo}
          onRemove={remove}
          onClose={() => setSheet(null)}
        />
      )}
      {surah && sheet && sheet !== 'list' && sheetHighlights.length > 0 && (
        <HighlightSheet
          highlights={sheetHighlights}
          ayah={surah.ayahs[sheet.ayah - 1]}
          onRemove={remove}
          onColor={recolor}
          onClose={() => setSheet(null)}
        />
      )}

      {surah && (
        <Toolbar
          mode={mode}
          onMode={changeMode}
          highlightColor={highlightColor}
          onHighlightColor={setHighlightColor}
          tool={tool}
          onTool={(next) => { setTool(next); setSelectedId(null); }}
          penColor={penColor}
          onPenColor={setPenColor}
          penWidth={penWidth}
          onPenWidth={setPenWidth}
          canDelete={Boolean(selected)}
          onDelete={() => { if (selected) remove(selected); setSelectedId(null); }}
          count={annotations.length}
          onOpenList={() => setSheet(sheet === 'list' ? null : 'list')}
          showTranslation={showTranslation}
          onToggleTranslation={toggleTranslation}
        />
      )}
    </div>
  );
}

export default Details;
