import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getChapters } from '../redux/chapters/chaptersSlice';

function Home() {
  const { chapters } = useSelector((store) => store.chapters);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getChapters());
  }, [dispatch]);

  return (
    <div className="list-surahs">
      <h1>This is the home page</h1>
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
