import React, { useLayoutEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { CgSearch } from 'react-icons/cg';
import { BiBookmark } from 'react-icons/bi';
import { setSearch } from '../redux/chapters/chaptersSlice';
import { readPref } from '../lib/prefs';

// Where the list was scrolled to, so coming back from a surah returns there.
let savedScroll = 0;

function Home() {
  const { chapters, search } = useSelector((store) => store.chapters);
  const items = useSelector((store) => store.annotations.items);
  const dispatch = useDispatch();

  useLayoutEffect(() => {
    window.scrollTo(0, savedScroll);
    return () => { savedScroll = window.scrollY; };
  }, []);

  // How many marks the reader has in each surah.
  const marks = useMemo(() => {
    const counts = {};
    Object.values(items).forEach((annotation) => {
      counts[annotation.surah] = (counts[annotation.surah] || 0) + 1;
    });
    return counts;
  }, [items]);

  const lastRead = readPref('lastRead', null);
  const lastSurah = lastRead ? chapters[lastRead.surah - 1] : null;

  const term = search.trim().toLowerCase();
  const visible = chapters.filter((surah) => !term
    || surah.englishName.toLowerCase().includes(term)
    || surah.englishNameTranslation.toLowerCase().includes(term)
    || surah.name.includes(term)
    || surah.number === parseInt(term, 10));

  return (
    <>
      <div className="hero">
        <h1>The Noble Quran</h1>
        <p>114 surahs · read, highlight and take notes</p>
        <div className="search-container">
          <CgSearch aria-hidden="true" className="search-icon" />
          <input
            className="search-input"
            type="search"
            placeholder="Search by name or number"
            aria-label="Search a surah"
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
          />
        </div>
      </div>
      <div className="home-body">
        {lastSurah && !term && (
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
        <div className="list-surahs">
          {visible.map((surah) => (
            <Link
              to={`/Details/${surah.number}`}
              key={surah.number}
              className="surah-container"
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
        {visible.length === 0 && (
          <p className="empty-note">{`No surah matches “${search.trim()}”.`}</p>
        )}
      </div>
    </>
  );
}

export default Home;
