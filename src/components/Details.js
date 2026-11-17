import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import {
  getSurah, getTranslation, translationKey, ARABIC_EDITION,
} from '../redux/chapters/chaptersSlice';
import { changeApplied, historyCleared, migrated } from '../redux/annotations/annotationsSlice';
import { isLegacy, migrate } from '../lib/legacy';
import { DEFAULT_TRANSLATION, FIRST_TRANSLATION, TRANSLATIONS } from '../lib/sources';
import fatiha from '../data/quran/1.json';
import pageMap from '../data/pages.json';
import { newId } from '../lib/geometry';
import { readPref, writePref } from '../lib/prefs';
import Ayah from './Ayah';
import DrawingLayer from './DrawingLayer';
import Toolbar, { HIGHLIGHT_COLORS, PEN_COLORS, PEN_WIDTHS } from './Toolbar';
import { HighlightSheet, MarksSheet } from './Sheets';
import TafsirPanel from './TafsirPanel';

const NONE = [];
const [BISMILLAH] = fatiha;
const SCALES = [0.85, 1, 1.15, 1.3, 1.5];
const DEFAULT_SCALE = 1;
const BAR_HEIGHT = 76; // the top bar, plus a little air
const SWIPE_DISTANCE = 70;
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
  const navigate = useNavigate();
  const { number } = useParams();
  const [params] = useSearchParams();
  const resumeAyah = Number(params.get('ayah')) || 0;
  const startAtEnd = params.get('page') === 'last';
  const id = parseInt(number, 10);
  const {
    chapters, surahs, translations, surahLoading, surahError,
  } = useSelector((store) => store.chapters);
  const items = useSelector((store) => store.annotations.items);
  const surah = surahs[id];
  const info = chapters[id - 1];

  const articleRef = useRef(null);
  const dragRef = useRef(null);
  const swipeRef = useRef(null);
  const [mode, setMode] = useState('read');
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [tool, setTool] = useState('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1]);
  const [selectedId, setSelectedId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [sheet, setSheet] = useState(null); // { ayah, text, word } | 'list'
  const [tafsirAyah, setTafsirAyah] = useState(null);
  const [view, setView] = useState({ index: 0, turn: '' });
  const [showTranslation, setShowTranslation] = useState(readShowTranslation);
  const [edition, setEdition] = useState(() => {
    const saved = readPref('translation', DEFAULT_TRANSLATION);
    return TRANSLATIONS.some((item) => item.id === saved) ? saved : DEFAULT_TRANSLATION;
  });
  const [scaleIndex, setScaleIndex] = useState(() => {
    const saved = readPref('textScale', DEFAULT_SCALE);
    return SCALES.includes(saved) ? SCALES.indexOf(saved) : DEFAULT_SCALE;
  });
  const loaded = Boolean(surah);
  const translation = translations[translationKey(edition, id)];

  // The pages of the Madinah mushaf that this surah covers.
  const total = surah ? surah.ayahs.length : 0;
  const pages = useMemo(() => {
    const runs = pageMap[id - 1] || NONE;
    return runs.map(([page, first], index) => ({
      page,
      first,
      last: index + 1 < runs.length ? runs[index + 1][1] - 1 : total,
    }));
  }, [id, total]);
  const pageIndex = Math.min(view.index, Math.max(0, pages.length - 1));
  const current = pages[pageIndex];
  const pageOf = useCallback((ayah) => Math.max(
    0,
    pages.findIndex((page) => ayah >= page.first && ayah <= page.last),
  ), [pages]);

  const ayahs = useMemo(() => {
    if (!surah) return NONE;
    const texts = translation ? translation.texts : NONE;
    return surah.ayahs.map((ayah, index) => ({ ...ayah, translation: texts[index] || '' }));
  }, [surah, translation]);
  const pageAyahs = useMemo(
    () => (current ? ayahs.slice(current.first - 1, current.last) : NONE),
    [ayahs, current],
  );

  useEffect(() => {
    dispatch(getSurah(id));
    dispatch(historyCleared());
    setTafsirAyah(null);
    setSheet(null);
    window.scrollTo(0, 0);
  }, [dispatch, id]);

  // Which page to open on: the first, the one with the ayah to continue
  // from, or the last when coming back from the next surah.
  useEffect(() => {
    if (!loaded) return;
    let index = 0;
    if (resumeAyah > 1) index = pageOf(resumeAyah);
    else if (startAtEnd) index = Math.max(0, pages.length - 1);
    setView({ index, turn: '' });
  }, [loaded, id, resumeAyah, startAtEnd, pageOf, pages.length]);

  useEffect(() => {
    if (showTranslation && loaded) dispatch(getTranslation({ edition, surah: id }));
  }, [showTranslation, loaded, edition, id, dispatch]);

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
    fonts.then(() => setTimeout(go, 80));
    return () => { cancelled = true; };
  }, [loaded, resumeAyah, id]);

  // Remember the place: the first ayah that is visible below the top bar.
  useEffect(() => {
    if (!loaded) return undefined;
    let timer = null;
    const save = () => {
      timer = null;
      const blocks = articleRef.current ? articleRef.current.querySelectorAll('[data-ayah]') : [];
      for (let i = 0; i < blocks.length; i += 1) {
        if (blocks[i].getBoundingClientRect().bottom > BAR_HEIGHT) {
          writePref('lastRead', { surah: id, ayah: Number(blocks[i].dataset.ayah) });
          return;
        }
      }
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
    try {
      window.localStorage.setItem(TRANSLATION_KEY, next ? '1' : '0');
    } catch (error) {
      // The choice still applies until the app is closed.
    }
  };

  const chooseEdition = (event) => {
    setEdition(event.target.value);
    writePref('translation', event.target.value);
    setSheet(null);
    setSelectedId(null);
  };

  // Put the top of the page just under the top bar.
  const scrollToPageTop = () => setTimeout(() => {
    const article = articleRef.current;
    if (!article) return;
    const top = article.getBoundingClientRect().top + window.scrollY - BAR_HEIGHT;
    window.scrollTo(0, Math.max(0, top));
  }, 0);

  const hasNext = pageIndex < pages.length - 1 || id < chapters.length;
  const hasPrevious = pageIndex > 0 || id > 1;

  // Turn the page; past the ends of the surah, go to the surah after or before.
  const turnPage = useCallback((step) => {
    const next = pageIndex + step;
    setSelectedId(null);
    setSheet(null);
    if (next < 0) {
      if (id > 1) navigate(`/Details/${id - 1}?page=last`);
      return;
    }
    if (next >= pages.length) {
      if (id < chapters.length) navigate(`/Details/${id + 1}`);
      return;
    }
    setView({ index: next, turn: step > 0 ? 'next' : 'previous' });
    writePref('lastRead', { surah: id, ayah: pages[next].first });
    scrollToPageTop();
  }, [pageIndex, pages, id, chapters.length, navigate]);

  // Left and right arrow keys turn the page, in the direction of the mushaf.
  useEffect(() => {
    if (!loaded || tafsirAyah) return undefined;
    const onKey = (event) => {
      const tag = event.target && event.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft') turnPage(1);
      if (event.key === 'ArrowRight') turnPage(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded, tafsirAyah, turnPage]);

  // Read mode: a sideways swipe turns the page (swipe right for the next one,
  // as when turning the pages of a mushaf).
  const onTouchStart = (event) => {
    swipeRef.current = null;
    if (mode !== 'read' || event.touches.length !== 1) return;
    if (event.target.closest && event.target.closest('.sheet, .toolbar, .tafsir-backdrop, select')) return;
    const touch = event.touches[0];
    swipeRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const onTouchEnd = (event) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start || event.changedTouches.length === 0) return;
    const selection = window.getSelection ? window.getSelection() : null;
    if (selection && !selection.isCollapsed) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Date.now() - start.time > 700) return;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * 2.5) return;
    turnPage(dx > 0 ? 1 : -1);
  };

  // This surah's marks, oldest first.
  const annotations = useMemo(
    () => Object.values(items)
      .filter((annotation) => annotation.surah === id)
      .sort((a, b) => a.ayah - b.ayah || a.createdAt.localeCompare(b.createdAt)),
    [items, id],
  );
  // Marks on a translation only fit the words of that translation.
  const visibleMarks = useMemo(() => annotations.filter(({ type, data }) => {
    if (type === 'highlight') return data.text !== 'en' || data.edition === edition;
    return data.anchor?.text !== 'en' || (data.edition || FIRST_TRANSLATION) === edition;
  }), [annotations, edition]);
  const drawings = useMemo(
    () => visibleMarks.filter((annotation) => annotation.type === 'drawing'),
    [visibleMarks],
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
    visibleMarks.forEach((annotation) => {
      if (annotation.type !== 'highlight') return;
      if (!map[annotation.ayah]) map[annotation.ayah] = [];
      map[annotation.ayah].push(annotation);
    });
    return map;
  }, [visibleMarks]);

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
          edition: text === 'ar' ? ARABIC_EDITION : edition,
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
    const { current: active } = dragRef;
    if (!active || active.pointerId !== event.pointerId) return;
    const spot = wordAt(event.clientX, event.clientY);
    if (!spot || spot.ayah !== active.ayah || spot.text !== active.text) return;
    if (spot.word === active.to) return;
    active.to = spot.word;
    active.moved = true;
    setDrag({ ...active, color: highlightColor });
  };

  const onPointerUp = (event) => {
    const { current: active } = dragRef;
    if (!active || active.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    if (!active.moved && covering(active).length > 0) {
      setSheet({ ayah: active.ayah, text: active.text, word: active.word });
    } else {
      addHighlight(active);
    }
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setDrag(null);
  };

  // Read mode: tapping an ayah number opens its tafsir, tapping highlighted
  // words opens the "remove" sheet.
  const activate = (target) => {
    if (mode !== 'read' || !target.closest) return false;
    const block = target.closest('[data-ayah]');
    if (!block) return false;
    if (target.closest('[data-tafsir]')) {
      setSheet(null);
      setTafsirAyah(Number(block.dataset.ayah));
      return true;
    }
    const word = target.closest('.w.hl');
    const selection = window.getSelection ? window.getSelection() : null;
    if (!word || (selection && !selection.isCollapsed)) return false;
    setSheet({
      ayah: Number(block.dataset.ayah),
      text: word.dataset.t,
      word: Number(word.dataset.w),
    });
    return true;
  };

  const onClick = (event) => { activate(event.target); };

  const onKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.tagName === 'BUTTON') return;
    if (activate(event.target)) event.preventDefault();
  };

  // Show an ayah, turning to its page first when needed.
  const goTo = (annotation) => {
    setSheet(null);
    const index = pageOf(annotation.ayah);
    if (index !== pageIndex) setView({ index, turn: index > pageIndex ? 'next' : 'previous' });
    setTimeout(() => {
      const element = document.getElementById(`ayah-${annotation.ayah}`);
      if (!element) return;
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
      element.classList.add('flash');
      setTimeout(() => element.classList.remove('flash'), 1600);
    }, 80);
  };

  let nextLabel = '';
  if (pageIndex < pages.length - 1) nextLabel = 'Next page';
  else if (id < chapters.length) nextLabel = chapters[id].englishName;
  let previousLabel = '';
  if (pageIndex > 0) previousLabel = 'Previous page';
  else if (id > 1) previousLabel = chapters[id - 2].englishName;

  return (
    <div className="details" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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

      {surah && showTranslation && (
        <div className="translation-bar">
          <label htmlFor="translation-choice">
            <span>Translation</span>
            <select id="translation-choice" value={edition} onChange={chooseEdition}>
              {TRANSLATIONS.map((item) => (
                <option key={item.id} value={item.id}>{`${item.name} · ${item.author}`}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {surah && current && (
        // The handlers below only pick up taps on words and ayah numbers;
        // marks are also reachable through the buttons of the "Marks" list.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <article
          key={`${id}:${pageIndex}`}
          ref={articleRef}
          className={`ayahs mode-${mode}${showTranslation ? '' : ' flow'}${view.turn ? ` turn-${view.turn}` : ''}`}
          style={{ '--scale': SCALES[scaleIndex] }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onClick}
          onKeyDown={onKeyDown}
        >
          {pageIndex === 0 && id !== 1 && id !== 9 && (
            <p className="bismillah" dir="rtl" lang="ar">{BISMILLAH}</p>
          )}
          {showTranslation && translation && translation.status === 'loading' && (
            <p className="reader-note" dir="ltr">Loading the translation…</p>
          )}
          {showTranslation && translation && translation.status === 'error' && (
            <p className="reader-note" dir="ltr">
              The translation could not be loaded. Check your connection.
              {' '}
              <button
                type="button"
                className="link-button"
                onClick={() => dispatch(getTranslation({ edition, surah: id }))}
              >
                Try again
              </button>
            </p>
          )}
          {pageAyahs.map((ayah) => (
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
            translationEdition={edition}
            layoutKey={`${showTranslation ? `blocks-${translation ? translation.status : ''}` : 'flow'}-${scaleIndex}`}
          />
        </article>
      )}

      {surah && current && (
        <nav className="pager" aria-label="Pages">
          <button
            type="button"
            className="nav-link"
            disabled={!hasNext}
            onClick={() => turnPage(1)}
          >
            <BiChevronLeft aria-hidden="true" />
            <span>{nextLabel}</span>
          </button>
          <p className="pager-info">
            {pages.length > 1 && <strong>{`Page ${pageIndex + 1} of ${pages.length}`}</strong>}
            <span>{`Mushaf page ${current.page}`}</span>
          </p>
          <button
            type="button"
            className="nav-link"
            disabled={!hasPrevious}
            onClick={() => turnPage(-1)}
          >
            <span>{previousLabel}</span>
            <BiChevronRight aria-hidden="true" />
          </button>
        </nav>
      )}

      {surah && sheet === 'list' && (
        <MarksSheet
          annotations={annotations}
          ayahs={ayahs}
          edition={edition}
          onGo={goTo}
          onRemove={remove}
          onClose={() => setSheet(null)}
        />
      )}
      {surah && sheet && sheet !== 'list' && sheetHighlights.length > 0 && (
        <HighlightSheet
          highlights={sheetHighlights}
          ayah={ayahs[sheet.ayah - 1]}
          onRemove={remove}
          onColor={recolor}
          onClose={() => setSheet(null)}
        />
      )}

      {surah && tafsirAyah && (
        <TafsirPanel
          surah={id}
          ayah={tafsirAyah}
          ayahText={surah.ayahs[tafsirAyah - 1].text}
          total={total}
          onAyah={setTafsirAyah}
          onClose={() => setTafsirAyah(null)}
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
