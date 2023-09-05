import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getChapters } from '../redux/chapters/chaptersSlice';

function Home() {
  const {
    chapters, search, isLoading, error,
  } = useSelector((store) => store.chapters);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getChapters());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Oopps somethings went wrong.PLease try again!</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="list-surahs">
      {chapters.length > 1
        ? chapters.filter((sura) => (search
          ? sura.englishName.toLowerCase().includes(search) || sura.name.includes(search)
           || parseInt(sura.number, 10) === parseInt(search, 10) : sura))
          .map((surah) => (
            <Link
              to={`/Details/${surah.number}`}
              key={surah.number}
              className="surah-container"
            >
              <h2>{surah.name}</h2>
              <p>{surah.englishName}</p>
              <h4 className="surah-number">{surah.number}</h4>
            </Link>
          ))
        : (
          <Link
            to={`/Details/${chapters.number}`}
            key={chapters.number}
            className="surah-container"
          >
            <h2>{chapters.name}</h2>
            <p>{chapters.englishName}</p>
            <h4 className="surah-number">{chapters.number}</h4>
          </Link>
        )}
    </div>
  );
}

export default Home;
