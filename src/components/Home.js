import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getChapters } from '../redux/chapters/chaptersSlice';

function Home() {
  const {
    chapters, search, isLoading, error,
  } = useSelector((store) => store.chapters);
  const items = useSelector((store) => store.annotations.items);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getChapters());
  }, [dispatch]);

  // How many marks the reader has in each surah.
  const marks = useMemo(() => {
    const counts = {};
    Object.values(items).forEach((annotation) => {
      counts[annotation.surah] = (counts[annotation.surah] || 0) + 1;
    });
    return counts;
  }, [items]);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error && chapters.length === 0) {
    return (
      <div className="error-container">
        <h2>Oops, something went wrong. Please try again!</h2>
        <p>{error}</p>
        <button type="button" className="plain-button" onClick={() => dispatch(getChapters())}>
          Try again
        </button>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const visible = chapters.filter((surah) => !term
    || surah.englishName.toLowerCase().includes(term)
    || surah.name.includes(term)
    || surah.number === parseInt(term, 10));

  return (
    <div className="list-surahs">
      {visible.map((surah) => (
        <Link
          to={`/Details/${surah.number}`}
          key={surah.number}
          className="surah-container"
        >
          <h2>{surah.name}</h2>
          <p>{surah.englishName}</p>
          <h4 className="surah-number">{surah.number}</h4>
          {marks[surah.number] > 0 && (
            <span className="surah-marks">
              {`${marks[surah.number]} ${marks[surah.number] === 1 ? 'mark' : 'marks'}`}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

export default Home;
