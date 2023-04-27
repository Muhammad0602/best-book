import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { clearSlice, getChapters } from '../redux/chapters/chaptersSlice';

function Home() {
  const { chapters, isLoading, error } = useSelector((store) => store.chapters);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getChapters());
    dispatch(clearSlice());
  }, [dispatch]);

  if (isLoading) {
    return (
      <h1 className="loading">Loading...</h1>
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
      {chapters.map((surah) => (
        <Link
          to={`/Details/${surah.number}`}
          key={surah.number}
          className="surah-container"
        >
          <h2>{surah.name}</h2>
          <p>{surah.englishName}</p>
          <h4 className="surah-number">{surah.number}</h4>
        </Link>
      ))}

    </div>
  );
}

export default Home;
