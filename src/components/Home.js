import React, { useLayoutEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { CgSearch } from 'react-icons/cg';
import {
  BiBookmark, BiChevronRight, BiNote, BiSearch, BiX,
} from 'react-icons/bi';
import { setSearch } from '../redux/chapters/chaptersSlice';
import { isValidAyah, reference } from '../lib/quran';

// Where the list was scrolled to, so coming back from a surah returns there.
let savedScroll = 0;
const SAVED_SHOWN = 4;

function Home() {
  const { chapters, search } = useSelector((store) => store.chapters);
  const items = useSelector((store) => store.annotations.items);
  const lastRead = useSelector((store) => store.settings.lastRead);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showAllSaved, setShowAllSaved] = useState(false);

  useLayoutEffect(() => {
    window.scrollTo(0, savedScroll);
    return () => { savedScroll = window.scrollY; };
  }, []);

  // How many marks the reader has in each surah, and the saved ayahs.
  const { marks, saved } = useMemo(() => {
    const counts = {};
    const list = [];
    Object.values(items).forEach((annotation) => {
      counts[annotation.surah] = (counts[annotation.surah] || 0) + 1;
      if (annotation.type === 'bookmark' || annotation.type === 'note') list.push(annotation);
    });
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { marks: counts, saved: list };
  }, [items]);

  const lastSurah = lastRead ? chapters[lastRead.surah - 1] : null;

  const term = search.trim().toLowerCase();
  const visible = chapters.filter((surah) => !term
    || surah.englishName.toLowerCase().includes(term)
    || surah.englishNameTranslation.toLowerCase().includes(term)
    || surah.name.includes(term)
    || surah.number === parseInt(term, 10));
  const typed = term.match(/^(\d{1,3})\s*[:.\s]\s*(\d{1,3})$/);
  const jump = typed && isValidAyah(Number(typed[1]), Number(typed[2]))
    ? { surah: Number(typed[1]), ayah: Number(typed[2]) }
    : null;

  // Leaving the list through a search: start the next visit with a clean list.
  const leaveSearch = () => {
    if (!term) return;
    dispatch(setSearch(''));
    savedScroll = 0;
  };

  const searchQuran = () => {
    const q = search.trim();
    leaveSearch();
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const savedShown = showAllSaved ? saved : saved.slice(0, SAVED_SHOWN);

  return (
    <>
      <div className="hero">
        <h1>The Noble Quran</h1>
        <p>114 surahs · read, listen, highlight and take notes</p>
        <form
          className="search-container"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (jump) {
              leaveSearch();
              navigate(`/Details/${jump.surah}?ayah=${jump.ayah}`);
            } else if (visible.length === 1) {
              leaveSearch();
              navigate(`/Details/${visible[0].number}`);
            } else if (term) {
              searchQuran();
            }
          }}
        >
          <CgSearch aria-hidden="true" className="search-icon" />
          <input
            className="search-input"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Surah name, number or 2:255"
            aria-label="Search a surah"
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear the search"
              onClick={() => dispatch(setSearch(''))}
            >
              <BiX aria-hidden="true" />
            </button>
          )}
        </form>
        <Link to="/search" className="hero-link">Go to a page, juz or ayah · search the Quran</Link>
      </div>
      <div className="home-body">
        {term && (
          <div className="quick-links">
            {jump && (
              <Link
                to={`/Details/${jump.surah}?ayah=${jump.ayah}`}
                className="quick-link"
                onClick={leaveSearch}
              >
                <BiChevronRight aria-hidden="true" />
                <span>{`Go to ${reference(jump.surah, jump.ayah)}`}</span>
              </Link>
            )}
            {term.length >= 2 && !jump && (
              <button type="button" className="quick-link" onClick={searchQuran}>
                <BiSearch aria-hidden="true" />
                <span>{`Search the whole Quran for “${search.trim()}”`}</span>
              </button>
            )}
          </div>
        )}
        {!term && lastSurah && (
          <Link
            to={`/Details/${lastSurah.number}${lastRead.ayah > 1 ? `?ayah=${lastRead.ayah}` : ''}`}
            className="continue-card"
          >
            <BiBookmark aria-hidden="true" />
            <div>
              <strong>Continue reading</strong>
              <span>{`${lastSurah.englishName}, ayah ${lastRead.ayah}`}</span>
            </div>
          </Link>
        )}
        {!term && saved.length > 0 && (
          <section className="saved-section" aria-label="Bookmarks and notes">
            <h2>Bookmarks and notes</h2>
            <div className="saved-list">
              {savedShown.map((mark) => (
                <Link
                  key={mark.id}
                  to={`/Details/${mark.surah}?ayah=${mark.ayah}`}
                  className="saved-card"
                >
                  {mark.type === 'note'
                    ? <BiNote aria-hidden="true" />
                    : <BiBookmark aria-hidden="true" />}
                  <div>
                    <strong>{reference(mark.surah, mark.ayah)}</strong>
                    {mark.type === 'note' && <span>{mark.data.text}</span>}
                  </div>
                </Link>
              ))}
            </div>
            {saved.length > SAVED_SHOWN && (
              <button
                type="button"
                className="link-button"
                onClick={() => setShowAllSaved(!showAllSaved)}
              >
                {showAllSaved ? 'Show fewer' : `Show all ${saved.length}`}
              </button>
            )}
          </section>
        )}
        <div className="list-surahs">
          {visible.map((surah) => (
            <Link
              to={`/Details/${surah.number}`}
              key={surah.number}
              className="surah-container"
              onClick={leaveSearch}
            >
              <span className="surah-number">{surah.number}</span>
              <div className="surah-info">
                <strong>{surah.englishName}</strong>
                <span>{`${surah.englishNameTranslation} · ${surah.numberOfAyahs} ayahs`}</span>
                {marks[surah.number] > 0 && (
                  <span className="surah-marks">
                    {`${marks[surah.number]} ${marks[surah.number] === 1 ? 'mark' : 'marks'}`}
                  </span>
                )}
              </div>
              <span className="surah-arabic" lang="ar" dir="rtl">{surah.name}</span>
            </Link>
          ))}
        </div>
        {visible.length === 0 && !jump && (
          <p className="empty-note">{`No surah is called “${search.trim()}”.`}</p>
        )}
      </div>
    </>
  );
}

export default Home;
