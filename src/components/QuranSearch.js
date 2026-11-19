import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CgSearch } from 'react-icons/cg';
import { BiChevronRight, BiX } from 'react-icons/bi';
import {
  JUZ_COUNT, PAGE_COUNT, SURAHS, isValidAyah, juzStart, loadAllArabic, normalizeArabic,
  pageStart, reference,
} from '../lib/quran';
import { TRANSLATIONS, loadWholeTranslation } from '../lib/sources';

const PAGE_SIZE = 40;
const ARABIC = /[؀-ۿ]/;
const COUNTS = SURAHS.map((surah) => surah.numberOfAyahs);

// The text with every match of the search marked.
const marked = (text, query) => {
  const lower = text.toLowerCase();
  const parts = [];
  let at = 0;
  let index = lower.indexOf(query, at);
  while (index !== -1 && query) {
    if (index > at) parts.push(text.slice(at, index));
    parts.push(<mark key={index}>{text.slice(index, index + query.length)}</mark>);
    at = index + query.length;
    index = lower.indexOf(query, at);
  }
  parts.push(text.slice(at));
  return parts;
};

function GoTo() {
  const navigate = useNavigate();
  const [surah, setSurah] = useState('1');
  const [ayah, setAyah] = useState('');
  const [page, setPage] = useState('');
  const [juz, setJuz] = useState('1');
  const [error, setError] = useState('');

  const open = (target) => {
    if (!target) return;
    setError('');
    navigate(`/Details/${target[0]}?ayah=${target[1]}`);
  };

  const goAyah = (event) => {
    event.preventDefault();
    const s = Number(surah);
    const a = ayah ? Number(ayah) : 1;
    if (!isValidAyah(s, a)) {
      setError(`${SURAHS[s - 1].englishName} has ${SURAHS[s - 1].numberOfAyahs} ayahs.`);
      return;
    }
    open([s, a]);
  };

  const goPage = (event) => {
    event.preventDefault();
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1 || p > PAGE_COUNT) {
      setError(`Choose a page from 1 to ${PAGE_COUNT}.`);
      return;
    }
    open(pageStart(p));
  };

  return (
    <section className="goto-card" aria-label="Go to">
      <h2>Go to</h2>
      <form className="goto-row" onSubmit={goAyah}>
        <label htmlFor="goto-surah">
          <span>Surah</span>
          <select id="goto-surah" value={surah} onChange={(e) => setSurah(e.target.value)}>
            {SURAHS.map((item) => (
              <option key={item.number} value={item.number}>
                {`${item.number}. ${item.englishName}`}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="goto-ayah" className="goto-small">
          <span className="visually-hidden">Ayah</span>
          <input
            id="goto-ayah"
            type="number"
            inputMode="numeric"
            min="1"
            max={SURAHS[Number(surah) - 1].numberOfAyahs}
            placeholder="Ayah"
            value={ayah}
            onChange={(e) => setAyah(e.target.value)}
          />
        </label>
        <button type="submit" className="plain-button">Go</button>
      </form>
      <form className="goto-row" onSubmit={goPage}>
        <label htmlFor="goto-page">
          <span>Page</span>
          <input
            id="goto-page"
            type="number"
            inputMode="numeric"
            min="1"
            max={PAGE_COUNT}
            placeholder={`1–${PAGE_COUNT}`}
            value={page}
            onChange={(e) => setPage(e.target.value)}
          />
        </label>
        <button type="submit" className="plain-button">Go</button>
      </form>
      <form
        className="goto-row"
        onSubmit={(event) => { event.preventDefault(); open(juzStart(Number(juz))); }}
      >
        <label htmlFor="goto-juz">
          <span>Juz</span>
          <select id="goto-juz" value={juz} onChange={(e) => setJuz(e.target.value)}>
            {Array.from({ length: JUZ_COUNT }, (_, index) => index + 1).map((number) => {
              const [s, a] = juzStart(number);
              return (
                <option key={number} value={number}>
                  {`Juz ${number} · ${SURAHS[s - 1].englishName} ${s}:${a}`}
                </option>
              );
            })}
          </select>
        </label>
        <button type="submit" className="plain-button">Go</button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

function QuranSearch() {
  const [params, setParams] = useSearchParams();
  const edition = useSelector((store) => store.settings.translation);
  const [text, setText] = useState(params.get('q') || '');
  const [state, setState] = useState({ status: 'idle', results: [], total: 0 });
  const [shown, setShown] = useState(PAGE_SIZE);
  const query = (params.get('q') || '').trim();
  const arabic = ARABIC.test(query);
  const editionName = (TRANSLATIONS.find((item) => item.id === edition) || TRANSLATIONS[0]).name;

  // The address follows the search box, so "back" returns to the same results.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = text.trim();
      if (next !== query) setParams(next ? { q: next } : {}, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [text, query, setParams]);

  const surahMatches = useMemo(() => {
    const term = query.toLowerCase();
    if (!term) return [];
    return SURAHS.filter((surah) => surah.englishName.toLowerCase().includes(term)
      || surah.englishNameTranslation.toLowerCase().includes(term)
      || normalizeArabic(surah.name).includes(normalizeArabic(query))).slice(0, 6);
  }, [query]);

  const typed = query.match(/^(\d{1,3})\s*[:.\s]\s*(\d{1,3})$/);
  const jump = typed && isValidAyah(Number(typed[1]), Number(typed[2]))
    ? [Number(typed[1]), Number(typed[2])]
    : null;

  useEffect(() => {
    setShown(PAGE_SIZE);
    if (query.length < (arabic ? 2 : 3) || jump) {
      setState({ status: 'idle', results: [], total: 0 });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', results: [], total: 0 });
    const find = arabic
      ? loadAllArabic().then((all) => {
        const needle = normalizeArabic(query);
        const results = [];
        all.forEach((surah, s) => surah.plain.forEach((line, a) => {
          if (line.includes(needle)) {
            results.push({ surah: s + 1, ayah: a + 1, arabic: surah.ayahs[a] });
          }
        }));
        return results;
      })
      : loadWholeTranslation(edition, COUNTS).then((all) => {
        const needle = query.toLowerCase();
        const results = [];
        all.forEach((surah, s) => surah.forEach((line, a) => {
          if (line.toLowerCase().includes(needle)) {
            results.push({ surah: s + 1, ayah: a + 1, english: line });
          }
        }));
        return results;
      });
    find
      .then((results) => {
        if (!cancelled) setState({ status: 'ready', results, total: results.length });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', results: [], total: 0 });
      });
    return () => { cancelled = true; };
    // `jump` is derived from `query`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, arabic, edition]);

  const needle = query.toLowerCase();

  return (
    <div className="search-page">
      <form
        className="search-container page-search"
        role="search"
        onSubmit={(e) => e.preventDefault()}
      >
        <CgSearch aria-hidden="true" className="search-icon" />
        <input
          className="search-input"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Search in Arabic or English, or 2:255"
          aria-label="Search the Quran"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text && (
          <button
            type="button"
            className="search-clear"
            aria-label="Clear the search"
            onClick={() => setText('')}
          >
            <BiX aria-hidden="true" />
          </button>
        )}
      </form>

      {!query && <GoTo />}

      {jump && (
        <Link to={`/Details/${jump[0]}?ayah=${jump[1]}`} className="quick-link">
          <BiChevronRight aria-hidden="true" />
          <span>{`Go to ${reference(jump[0], jump[1])}`}</span>
        </Link>
      )}

      {surahMatches.length > 0 && (
        <div className="surah-chips">
          {surahMatches.map((surah) => (
            <Link key={surah.number} to={`/Details/${surah.number}`} className="chip">
              {`${surah.number}. ${surah.englishName}`}
            </Link>
          ))}
        </div>
      )}

      {query && !jump && query.length < (arabic ? 2 : 3) && (
        <p className="empty-note">Type a little more to search the text.</p>
      )}
      {state.status === 'loading' && (
        <div className="loading"><div className="spinner small" /></div>
      )}
      {state.status === 'error' && (
        <p className="empty-note">
          {arabic
            ? 'The search could not be completed.'
            : 'The translation could not be downloaded for searching. Check your connection.'}
        </p>
      )}
      {state.status === 'ready' && (
        <p className="result-count">
          {state.total === 0
            ? `No ayah contains “${query}”.`
            : `${state.total} ${state.total === 1 ? 'ayah' : 'ayahs'}${arabic ? '' : ` in ${editionName}`}`}
        </p>
      )}
      <ol className="results">
        {state.results.slice(0, shown).map((result) => (
          <li key={`${result.surah}:${result.ayah}`}>
            <Link to={`/Details/${result.surah}?ayah=${result.ayah}`} className="result">
              <span className="result-ref">{reference(result.surah, result.ayah)}</span>
              {result.arabic && (
                <span className="result-arabic" lang="ar" dir="rtl">{result.arabic}</span>
              )}
              {result.english && (
                <span className="result-english">{marked(result.english, needle)}</span>
              )}
            </Link>
          </li>
        ))}
      </ol>
      {state.total > shown && (
        <button
          type="button"
          className="plain-button secondary more-button"
          onClick={() => setShown(shown + PAGE_SIZE)}
        >
          {`Show more (${state.total - shown} left)`}
        </button>
      )}
    </div>
  );
}

export default QuranSearch;
