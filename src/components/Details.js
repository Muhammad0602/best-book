import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { BiArrowBack } from 'react-icons/bi';

function Details() {
  const navigate = useNavigate();
  const { number } = useParams();
  const id = parseInt(number, 10);
  const { chapters } = useSelector((store) => store.chapters);
  const surah = chapters[id - 1];
  return (
    <div className="details">
      <button onClick={() => navigate('/')} type="button">
        <BiArrowBack aria-hidden="true" />
        <span className="visually-hidden">Go back to the home page</span>
      </button>
      <h2>
        {surah.name}
        {' '}
        <span>
          (
          {surah.englishNameTranslation}
          )
        </span>
      </h2>
      <article className="ayahs">
        {surah.ayahs.map((ayah) => (
          <p className="ayah" key={ayah.number}>{ayah.text}</p>
        ))}
      </article>
    </div>
  );
}

export default Details;
