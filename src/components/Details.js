import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

function Details() {
  const navigate = useNavigate();
  const { number } = useParams();
  const id = parseInt(number, 10);
  const { chapters } = useSelector((store) => store.chapters);
  const surah = chapters[id - 1];
  return (
    <div>
      <button onClick={() => navigate('/')} type="button">back</button>
      <h2>Here you can read ayahs of a specific surah</h2>
      <article className="ayahs">
        {surah.ayahs.map((ayah) => (
          <p className="ayah" key={ayah.number}>{ayah.text}</p>
        ))}
      </article>
    </div>
  );
}

export default Details;
