import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight, BiPlay } from 'react-icons/bi';
import {
  getSurah, getTranslation, translationKey, ARABIC_EDITION,
} from '../redux/chapters/chaptersSlice';
import { changeApplied, historyCleared, migrated } from '../redux/annotations/annotationsSlice';
import { SCALES, setSetting } from '../redux/settings/settingsSlice';
import { isLegacy, migrate } from '../lib/legacy';
import { FIRST_TRANSLATION, TRANSLATIONS, translationOf } from '../lib/sources';
import GroupedOptions, { translationLabel } from './GroupedOptions';
import { arabicNumber, juzOf, reference } from '../lib/quran';
import fatiha from '../data/quran/1.json';
import pageMap from '../data/pages.json';
import { newId } from '../lib/geometry';
import { readPref, writePref } from '../lib/prefs';
import Ayah from './Ayah';
import DrawingLayer from './DrawingLayer';
import Toolbar, { HIGHLIGHT_COLORS, PEN_COLORS, PEN_WIDTHS } from './Toolbar';
import { HighlightSheet, MarksSheet } from './Sheets';
import TafsirPanel from './TafsirPanel';
import AyahMenu from './AyahMenu';
import AudioBar from './AudioBar';

const NONE = [];
const [BISMILLAH] = fatiha;
const BAR_HEIGHT = 76; // the top bar, plus a little air
const SWIPE_DISTANCE = 70;

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

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let done = false;
    try {
      done = document.execCommand('copy');
    } catch (failure) {
      done = false;
    }
    document.body.removeChild(area);
    return done;
  }
};

const isVisible = (element) => {
  const rect = element.getBoundingClientRect();
  return rect.top >= BAR_HEIGHT && rect.bottom <= window.innerHeight - 140;
};

function Details() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { number } = useParams();
  const [params, setParams] = useSearchParams();
  const id = parseInt(number, 10);
  const resumeAyah = Number(params.get('ayah')) || 0;
  const pageParam = params.get('p');
  const {
    chapters, surahs, translations, surahLoading, surahError,
  } = useSelector((store) => store.chapters);
  const items = useSelector((store) => store.annotations.items);
  const settings = useSelector((store) => store.settings);
  const {
    scale, showTranslation, translation: edition, pageTurn, reciter,
  } = settings;
  const surah = surahs[id];
  const info = chapters[id - 1];

  const articleRef = useRef(null);
  const dragRef = useRef(null);
  const swipeRef = useRef(null);
  const toastTimer = useRef(null);
  const [mode, setMode] = useState('read');
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [tool, setTool] = useState('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(PEN_WIDTHS[1]);
  const [selectedId, setSelectedId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [sheet, setSheet] = useState(null); // { ayah, text, word } | 'list'
  const [menuAyah, setMenuAyah] = useState(null);
  const [tafsirAyah, setTafsirAyah] = useState(null);
  const [turn, setTurn] = useState('');
  const [audio, setAudio] = useState(null); // { ayah, playing }
  const [toast, setToast] = useState('');
  const [barHidden, setBarHidden] = useState(false);
  const loaded = Boolean(surah);
  const translation = translations[translationKey(edition, id)];
  const scaleIndex = Math.max(0, SCALES.indexOf(scale));
  const mushaf = pageTurn !== 'book';

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
  const pageOf = useCallback((ayah) => Math.max(
    0,
    pages.findIndex((page) => ayah >= page.first && ayah <= page.last),
  ), [pages]);

  // The page shown comes from the address ("?p=3"), so going back to this
  // surah from another screen returns to the same page.
  let pageIndex = 0;
  if (pageParam === 'last') pageIndex = pages.length - 1;
  else if (pageParam) pageIndex = Number(pageParam) - 1;
  else if (resumeAyah > 1) pageIndex = pageOf(resumeAyah);
  pageIndex = Math.min(Math.max(0, pageIndex || 0), Math.max(0, pages.length - 1));
  const current = pages[pageIndex];

  const ayahs = useMemo(() => {
    if (!surah) return NONE;
    const texts = translation ? translation.texts : NONE;
    return surah.ayahs.map((ayah, index) => ({ ...ayah, translation: texts[index] || '' }));
  }, [surah, translation]);
  const pageAyahs = useMemo(
    () => (current ? ayahs.slice(current.first - 1, current.last) : NONE),
    [ayahs, current],
  );

  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    dispatch(getSurah(id));
    dispatch(historyCleared());
    setTafsirAyah(null);
    setMenuAyah(null);
    setSheet(null);
    setAudio(null);
    setTurn('');
    window.scrollTo(0, 0);
  }, [dispatch, id]);

  useEffect(() => {
    if (showTranslation && loaded) dispatch(getTranslation({ edition, surah: id }));
  }, [showTranslation, loaded, edition, id, dispatch]);

  // Opening at an ayah ("Continue reading", a bookmark, a search result):
  // bring it into view and make it glow for a moment.
  useEffect(() => {
    if (!loaded || resumeAyah < 1) return undefined;
    let cancelled = false;
    const go = () => {
      const element = cancelled ? null : document.getElementById(`ayah-${resumeAyah}`);
      if (!element) return;
      if (resumeAyah > 1) {
        window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - BAR_HEIGHT - 40);
      }
      element.classList.add('flash');
      setTimeout(() => element.classList.remove('flash'), 1800);
    };
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fonts.then(() => setTimeout(go, 80));
    return () => { cancelled = true; };
  }, [loaded, resumeAyah, id]);

  // Remember the place: the first ayah that is visible below the top bar.
  // The bottom toolbar steps aside while reading downwards.
  useEffect(() => {
    if (!loaded) return undefined;
    let timer = null;
    let lastY = window.scrollY;
    const save = () => {
      timer = null;
      const blocks = articleRef.current ? articleRef.current.querySelectorAll('[data-ayah]') : [];
      for (let i = 0; i < blocks.length; i += 1) {
        if (blocks[i].getBoundingClientRect().bottom > BAR_HEIGHT) {
          dispatch(setSetting('lastRead', { surah: id, ayah: Number(blocks[i].dataset.ayah) }));
          return;
        }
      }
    };
    const onScroll = () => {
      if (!timer) timer = setTimeout(save, 600);
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 10) return;
      setBarHidden(y > lastY && y > 160);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [loaded, id, dispatch]);

  useEffect(() => {
    if (!loaded) return;
    const last = settings.lastRead;
    if (!last || last.surah !== id) dispatch(setSetting('lastRead', { surah: id, ayah: 1 }));
    // Only when a surah is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, id]);

  // The first long surah: show once how pages are turned.
  useEffect(() => {
    if (!loaded || pages.length < 2 || readPref('pageHintSeen', false)) return;
    writePref('pageHintSeen', true);
    showToast(mushaf
      ? 'Swipe right for the next page, or use the buttons under the page.'
      : 'Swipe left for the next page, or use the buttons under the page.');
  }, [loaded, pages.length, mushaf, showToast]);

  const toggleTranslation = () => dispatch(setSetting('showTranslation', !showTranslation));

  const chooseEdition = (event) => {
    dispatch(setSetting('translation', event.target.value));
    setSheet(null);
    setSelectedId(null);
  };

  const changeScale = (step) => {
    const next = Math.min(SCALES.length - 1, Math.max(0, scaleIndex + step));
    dispatch(setSetting('scale', SCALES[next]));
  };

  // Put the top of the page just under the top bar.
  const scrollToPageTop = () => setTimeout(() => {
    const article = articleRef.current;
    if (!article) return;
    const top = article.getBoundingClientRect().top + window.scrollY - BAR_HEIGHT;
    window.scrollTo(0, Math.max(0, top));
  }, 0);

  // Show page `index` of this surah. The new page slides in from the side the
  // reader turns from: from the left in a mushaf, from the right in a book.
  const showPage = useCallback((index, step, keepScroll) => {
    setTurn((step > 0) === mushaf ? 'from-left' : 'from-right');
    setParams({ p: String(index + 1) }, { replace: true });
    setSelectedId(null);
    setSheet(null);
    setBarHidden(false);
    dispatch(setSetting('lastRead', { surah: id, ayah: pages[index].first }));
    if (!keepScroll) scrollToPageTop();
  }, [mushaf, setParams, id, pages, dispatch]);

  const hasNext = pageIndex < pages.length - 1 || id < chapters.length;
  const hasPrevious = pageIndex > 0 || id > 1;

  // Turn the page; past the ends of the surah, go to the surah after or before.
  const turnPage = useCallback((step) => {
    const next = pageIndex + step;
    if (next < 0) {
      if (id > 1) navigate(`/Details/${id - 1}?p=last`);
      return;
    }
    if (next >= pages.length) {
      if (id < chapters.length) navigate(`/Details/${id + 1}`);
      return;
    }
    showPage(next, step);
  }, [pageIndex, pages.length, id, chapters.length, navigate, showPage]);

  const overlayOpen = Boolean(tafsirAyah || menuAyah);

  // Arrow keys turn the page in the chosen direction.
  useEffect(() => {
    if (!loaded || overlayOpen) return undefined;
    const onKey = (event) => {
      const tag = event.target && event.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft') turnPage(mushaf ? 1 : -1);
      if (event.key === 'ArrowRight') turnPage(mushaf ? -1 : 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loaded, overlayOpen, turnPage, mushaf]);

  // Read mode: a sideways swipe turns the page.
  const onTouchStart = (event) => {
    swipeRef.current = null;
    if (mode !== 'read' || event.touches.length !== 1) return;
    if (event.target.closest && event.target.closest('.sheet, .toolbar, .panel-backdrop, .tafsir-backdrop, select')) return;
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
    const rightward = dx > 0;
    turnPage(rightward === mushaf ? 1 : -1);
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
    if (type === 'drawing') return data.anchor?.text !== 'en' || (data.edition || FIRST_TRANSLATION) === edition;
    return true;
  }), [annotations, edition]);
  const drawings = useMemo(
    () => visibleMarks.filter((annotation) => annotation.type === 'drawing'),
    [visibleMarks],
  );
  // Bookmarks and notes, by ayah.
  const saved = useMemo(() => {
    const map = {};
    annotations.forEach((annotation) => {
      if (annotation.type !== 'bookmark' && annotation.type !== 'note') return;
      map[annotation.ayah] = { ...map[annotation.ayah], [annotation.type]: annotation };
    });
    return map;
  }, [annotations]);
  const savedKey = Object.keys(saved).map((ayah) => `${ayah}${saved[ayah].bookmark ? 'b' : ''}${saved[ayah].note ? 'n' : ''}`).join(',');

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
    setBarHidden(false);
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

  const addMark = (ayah, type, data) => {
    const now = new Date().toISOString();
    dispatch(changeApplied({
      added: [{
        id: newId(), surah: id, ayah, type, data, createdAt: now, updatedAt: now,
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
    addMark(ayah, 'highlight', {
      text,
      edition: text === 'ar' ? ARABIC_EDITION : edition,
      start,
      end,
      color: highlightColor,
    });
  };

  const toggleBookmark = (ayah) => {
    const existing = saved[ayah] && saved[ayah].bookmark;
    if (existing) {
      remove(existing);
      showToast('Bookmark removed');
    } else {
      addMark(ayah, 'bookmark', {});
      showToast('Bookmarked · it is listed on the home page');
    }
  };

  const saveNote = (ayah, text) => {
    const existing = saved[ayah] && saved[ayah].note;
    if (!text) {
      if (existing) {
        remove(existing);
        showToast('Note deleted');
      }
      return;
    }
    if (existing) {
      if (existing.data.text === text) return;
      dispatch(changeApplied({
        removed: [existing],
        added: [{ ...existing, data: { text }, updatedAt: new Date().toISOString() }],
      }));
    } else {
      addMark(ayah, 'note', { text });
    }
    showToast('Note saved');
  };

  const shareText = (ayah) => {
    const item = ayahs[ayah - 1];
    const lines = [item.text];
    if (showTranslation && item.translation) lines.push(item.translation);
    lines.push(`— ${reference(id, ayah)}`);
    return lines.join('\n\n');
  };

  const copyAyah = async (ayah) => {
    const done = await copyText(shareText(ayah));
    showToast(done ? 'Copied' : 'Could not copy on this device');
  };

  const shareAyah = async (ayah) => {
    const text = shareText(ayah);
    if (navigator.share) {
      try {
        await navigator.share({ title: reference(id, ayah), text });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }
    const done = await copyText(text);
    showToast(done ? 'Copied · paste it where you want to share it' : 'Could not share on this device');
  };

  // ---------- recitation ----------

  const playFrom = (ayah) => {
    setMenuAyah(null);
    setAudio({ ayah, playing: true });
    const index = pageOf(ayah);
    if (index !== pageIndex) showPage(index, index > pageIndex ? 1 : -1, true);
  };

  const stepAudio = (step) => {
    if (!audio) return;
    const next = Math.min(total, Math.max(1, audio.ayah + step));
    playFrom(next);
  };

  const onAudioEnded = () => {
    if (!audio) return;
    if (audio.ayah >= total) {
      setAudio({ ayah: audio.ayah, playing: false });
      return;
    }
    playFrom(audio.ayah + 1);
  };

  // Keep the ayah being recited in view.
  const playingAyah = audio ? audio.ayah : 0;
  useEffect(() => {
    if (!playingAyah) return undefined;
    const timer = setTimeout(() => {
      const element = document.getElementById(`ayah-${playingAyah}`);
      if (element && !isVisible(element)) element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
    return () => clearTimeout(timer);
  }, [playingAyah, pageIndex]);

  // ---------- highlighting ----------

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

  // Read mode: tapping an ayah number opens its menu, tapping highlighted
  // words opens the "remove" sheet.
  const activate = (target) => {
    if (mode !== 'read' || !target.closest) return false;
    const block = target.closest('[data-ayah]');
    if (!block) return false;
    if (target.closest('[data-menu]')) {
      setSheet(null);
      setMenuAyah(Number(block.dataset.ayah));
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
    if (index !== pageIndex) showPage(index, index > pageIndex ? 1 : -1, true);
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

  const nextButton = (
    <button
      key="next"
      type="button"
      className="nav-link"
      disabled={!hasNext}
      onClick={() => turnPage(1)}
    >
      {mushaf && <BiChevronLeft aria-hidden="true" />}
      <span>{nextLabel}</span>
      {!mushaf && <BiChevronRight aria-hidden="true" />}
    </button>
  );
  const previousButton = (
    <button
      key="previous"
      type="button"
      className="nav-link"
      disabled={!hasPrevious}
      onClick={() => turnPage(-1)}
    >
      {!mushaf && <BiChevronLeft aria-hidden="true" />}
      <span>{previousLabel}</span>
      {mushaf && <BiChevronRight aria-hidden="true" />}
    </button>
  );

  const menuItem = menuAyah ? ayahs[menuAyah - 1] : null;
  const toolbarHidden = barHidden && mode === 'read' && !audio && !sheet;

  return (
    <div className="details" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {info && (
        <div className="surah-head">
          <h2 className="surah-title" lang="ar" dir="rtl">{info.name}</h2>
          <p className="surah-sub">
            {`${info.number}. ${info.englishName} · ${info.englishNameTranslation}`}
          </p>
          <p className="surah-meta">{`${info.numberOfAyahs} ayahs · ${info.revelationType}`}</p>
          {surah && current && (
            <div className="head-actions">
              <button
                type="button"
                className="pill-button"
                onClick={() => playFrom(audio ? audio.ayah : current.first)}
              >
                <BiPlay aria-hidden="true" />
                <span>Listen</span>
              </button>
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
              <GroupedOptions items={TRANSLATIONS} label={translationLabel} />
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
          className={`ayahs mode-${mode}${showTranslation ? '' : ' flow'}${turn ? ` turn-${turn}` : ''}`}
          style={{ '--scale': scale }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onClick}
          onKeyDown={onKeyDown}
        >
          <div className="page-head" dir="ltr">
            <span>{`Juz ${juzOf(id, current.first)}`}</span>
            <span lang="ar" dir="rtl">{info ? info.name : ''}</span>
          </div>
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
              translationLang={translationOf(edition).lang}
              playing={playingAyah === ayah.numberInSurah}
              bookmarked={Boolean(saved[ayah.numberInSurah] && saved[ayah.numberInSurah].bookmark)}
              noted={Boolean(saved[ayah.numberInSurah] && saved[ayah.numberInSurah].note)}
            />
          ))}
          <p className="page-number">{arabicNumber(current.page)}</p>
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
            layoutKey={`${showTranslation ? `blocks-${translation ? translation.status : ''}` : 'flow'}-${scale}-${savedKey}`}
          />
        </article>
      )}

      {surah && current && (
        <nav className="pager" aria-label="Pages">
          {mushaf ? nextButton : previousButton}
          <p className="pager-info">
            {pages.length > 1 && <strong>{`Page ${pageIndex + 1} of ${pages.length}`}</strong>}
            <span>{`Mushaf page ${current.page}`}</span>
          </p>
          {mushaf ? previousButton : nextButton}
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

      {menuItem && (
        <AyahMenu
          key={menuAyah}
          title={reference(id, menuAyah)}
          text={menuItem.text}
          translation={showTranslation ? menuItem.translation : ''}
          bookmarked={Boolean(saved[menuAyah] && saved[menuAyah].bookmark)}
          note={saved[menuAyah] && saved[menuAyah].note ? saved[menuAyah].note.data.text : ''}
          onPlay={() => playFrom(menuAyah)}
          onTafsir={() => { setTafsirAyah(menuAyah); setMenuAyah(null); }}
          onBookmark={() => toggleBookmark(menuAyah)}
          onSaveNote={(text) => saveNote(menuAyah, text)}
          onCopy={() => copyAyah(menuAyah)}
          onShare={() => shareAyah(menuAyah)}
          onClose={() => setMenuAyah(null)}
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

      {toast && <div className="toast" role="status">{toast}</div>}

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
          hidden={toolbarHidden}
          player={audio && info ? (
            <AudioBar
              surah={id}
              surahName={info.englishName}
              ayah={audio.ayah}
              total={total}
              playing={audio.playing}
              reciter={reciter}
              onToggle={(playing) => setAudio({ ...audio, playing })}
              onStep={stepAudio}
              onEnded={onAudioEnded}
              onStop={() => setAudio(null)}
            />
          ) : null}
        />
      )}
    </div>
  );
}

export default Details;
